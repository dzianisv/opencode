import { GlobalBus } from "@/bus/global"
import { disposeInstance } from "@/effect/instance-registry"
import { Filesystem } from "@/util/filesystem"
import { iife } from "@/util/iife"
import { Log } from "@/util/log"
import { Context } from "../util/context"
import { Project } from "./project"
import { State } from "./state"

export interface Shape {
  directory: string
  worktree: string
  project: Project.Info
}
const context = Context.create<Shape>("instance")
const cache = new Map<string, Promise<Shape>>()
const refs = new Map<string, number>()
const seen = new Map<string, number>()

const disposal = {
  all: undefined as Promise<void> | undefined,
}

const sweep_state = {
  run: undefined as Promise<void> | undefined,
}

const poll = {
  timer: undefined as NodeJS.Timeout | undefined,
}

function max() {
  const value = Number(process.env.OPENCODE_INSTANCE_MAX)
  if (Number.isFinite(value)) return value
  return 4
}

function idle() {
  const value = Number(process.env.OPENCODE_INSTANCE_IDLE_MS)
  if (Number.isFinite(value)) return value
  return 10 * 60 * 1000
}

function pulse() {
  if (poll.timer) return
  const ttl = idle()
  const ms = Math.max(1_000, Math.min(60_000, ttl > 0 ? Math.floor(ttl / 2) : 60_000))
  poll.timer = setInterval(() => {
    if (cache.size === 0) {
      if (poll.timer) clearInterval(poll.timer)
      poll.timer = undefined
      return
    }
    void sweep()
  }, ms)
  poll.timer.unref?.()
}

function pause() {
  if (!poll.timer) return
  clearInterval(poll.timer)
  poll.timer = undefined
}

function emit(directory: string) {
  GlobalBus.emit("event", {
    directory,
    payload: {
      type: "server.instance.disposed",
      properties: {
        directory,
      },
    },
  })
}

function boot(input: { directory: string; init?: () => Promise<any>; project?: Project.Info; worktree?: string }) {
  return iife(async () => {
    const ctx =
      input.project && input.worktree
        ? {
            directory: input.directory,
            worktree: input.worktree,
            project: input.project,
          }
        : await Project.fromDirectory(input.directory).then(({ project, sandbox }) => ({
            directory: input.directory,
            worktree: sandbox,
            project,
          }))
    await context.provide(ctx, async () => {
      await input.init?.()
    })
    return ctx
  })
}

function stamp(directory: string) {
  seen.set(directory, Date.now())
}

function track(directory: string, next: Promise<Shape>) {
  const task = next.catch((error) => {
    if (cache.get(directory) === task) {
      cache.delete(directory)
      refs.delete(directory)
      seen.delete(directory)
    }
    throw error
  })
  cache.set(directory, task)
  refs.set(directory, 0)
  stamp(directory)
  pulse()
  return task
}

function sorted() {
  return [...cache.keys()].sort((a, b) => (seen.get(a) ?? 0) - (seen.get(b) ?? 0))
}

async function drop(directory: string, force = false, task?: Promise<Shape>) {
  const current = cache.get(directory)
  if (!current) return false
  if (task && current !== task) return false
  if (!force && (refs.get(directory) ?? 0) > 0) return false

  cache.delete(directory)
  refs.delete(directory)
  seen.delete(directory)
  if (cache.size === 0) pause()

  const ctx = await current.catch((error) => {
    Log.Default.warn("instance dispose failed", { directory, error })
    return undefined
  })
  if (!ctx) return true

  await Promise.all([State.dispose(directory), disposeInstance(directory)])
  emit(directory)
  return true
}

function sweep() {
  if (sweep_state.run) return sweep_state.run

  sweep_state.run = iife(async () => {
    if (cache.size === 0) return
    const now = Date.now()
    const ttl = idle()
    const limit = max()

    if (ttl > 0) {
      for (const key of sorted()) {
        if ((refs.get(key) ?? 0) > 0) continue
        const age = now - (seen.get(key) ?? now)
        if (age < ttl) continue
        Log.Default.info("disposing idle instance", { key, idle_ms: age })
        await drop(key)
      }
    }

    if (limit <= 0) return

    while (cache.size > limit) {
      const victim = sorted().find((key) => (refs.get(key) ?? 0) === 0)
      if (!victim) return
      Log.Default.warn("disposing instance due to limit", {
        key: victim,
        limit,
        size: cache.size,
      })
      await drop(victim)
    }
  }).finally(() => {
    sweep_state.run = undefined
  })

  return sweep_state.run
}

export const Instance = {
  async provide<R>(input: { directory: string; init?: () => Promise<any>; fn: () => R }): Promise<R> {
    const directory = Filesystem.resolve(input.directory)
    let existing = cache.get(directory)
    if (!existing) {
      await sweep()
      Log.Default.info("creating instance", { directory })
      existing = track(
        directory,
        boot({
          directory,
          init: input.init,
        }),
      )
    }
    refs.set(directory, (refs.get(directory) ?? 0) + 1)
    stamp(directory)

    try {
      const ctx = await existing
      return await context.provide(ctx, async () => {
        return input.fn()
      })
    } finally {
      if (!cache.has(directory)) {
        refs.delete(directory)
        seen.delete(directory)
      } else {
        refs.set(directory, Math.max(0, (refs.get(directory) ?? 1) - 1))
        stamp(directory)
        void sweep()
      }
    }
  },
  get current() {
    return context.use()
  },
  get directory() {
    return context.use().directory
  },
  get worktree() {
    return context.use().worktree
  },
  get project() {
    return context.use().project
  },
  /**
   * Check if a path is within the project boundary.
   * Returns true if path is inside Instance.directory OR Instance.worktree.
   * Paths within the worktree but outside the working directory should not trigger external_directory permission.
   */
  containsPath(filepath: string) {
    if (Filesystem.contains(Instance.directory, filepath)) return true
    // Non-git projects set worktree to "/" which would match ANY absolute path.
    // Skip worktree check in this case to preserve external_directory permissions.
    if (Instance.worktree === "/") return false
    return Filesystem.contains(Instance.worktree, filepath)
  },
  /**
   * Captures the current instance ALS context and returns a wrapper that
   * restores it when called. Use this for callbacks that fire outside the
   * instance async context (native addons, event emitters, timers, etc.).
   */
  bind<F extends (...args: any[]) => any>(fn: F): F {
    const ctx = context.use()
    return ((...args: any[]) => context.provide(ctx, () => fn(...args))) as F
  },
  state<S>(init: () => S, dispose?: (state: Awaited<S>) => Promise<void>): () => S {
    return State.create(() => Instance.directory, init, dispose)
  },
  async reload(input: { directory: string; init?: () => Promise<any>; project?: Project.Info; worktree?: string }) {
    const directory = Filesystem.resolve(input.directory)
    Log.Default.info("reloading instance", { directory })
    const done = await drop(directory, true)
    if (!done) emit(directory)
    const next = track(directory, boot({ ...input, directory }))
    return await next
  },
  async dispose() {
    const directory = Instance.directory
    Log.Default.info("disposing instance", { directory })
    const done = await drop(directory, true)
    if (!done) emit(directory)
  },
  async disposeAll() {
    if (disposal.all) return disposal.all

    disposal.all = iife(async () => {
      Log.Default.info("disposing all instances")
      const entries = [...cache.entries()]
      for (const [key, value] of entries) await drop(key, true, value)
    }).finally(() => {
      disposal.all = undefined
    })

    return disposal.all
  },
  stats() {
    const now = Date.now()
    return {
      size: cache.size,
      max: max(),
      idle_ms: idle(),
      entries: sorted().map((directory) => ({
        directory,
        refs: refs.get(directory) ?? 0,
        idle_ms: now - (seen.get(directory) ?? now),
      })),
    }
  },
}
