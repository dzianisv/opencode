import { Effect } from "effect"
import { Log } from "@/util/log"
import { Context } from "../util/context"
import { Project } from "./project"
import { State } from "./state"
import { iife } from "@/util/iife"
import { GlobalBus } from "@/bus/global"
import { Filesystem } from "@/util/filesystem"
import { InstanceState } from "@/util/instance-state"

interface Context {
  directory: string
  worktree: string
  project: Project.Info
}
const context = Context.create<Context>("instance")
const cache = new Map<string, Promise<Context>>()
const refs = new Map<string, number>()
const seen = new Map<string, number>()

const max = (() => {
  const val = Number(process.env.OPENCODE_INSTANCE_MAX)
  if (Number.isFinite(val)) return val
  return 2
})()

const idle = (() => {
  const val = Number(process.env.OPENCODE_INSTANCE_IDLE_MS)
  if (Number.isFinite(val)) return val
  return 10 * 60 * 1000
})()

const disposal = {
  all: undefined as Promise<void> | undefined,
}

const sweep_state = {
  run: undefined as Promise<void> | undefined,
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

function track(directory: string, next: Promise<Context>) {
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
  return task
}

async function drop(directory: string, force = false, task?: Promise<Context>) {
  const current = cache.get(directory)
  if (!current) return false
  if (task && current !== task) return false
  if (!force && (refs.get(directory) ?? 0) > 0) return false

  cache.delete(directory)
  refs.delete(directory)
  seen.delete(directory)

  const ctx = await current.catch((error) => {
    Log.Default.warn("instance dispose failed", { directory, error })
    return undefined
  })
  if (!ctx) return true

  await context.provide(ctx, async () => {
    await Promise.all([State.dispose(directory), Effect.runPromise(InstanceState.dispose(directory))])
  })
  emit(directory)
  return true
}

function sorted() {
  return [...cache.keys()].sort((a, b) => (seen.get(a) ?? 0) - (seen.get(b) ?? 0))
}

function sweep() {
  if (sweep_state.run) return sweep_state.run

  sweep_state.run = iife(async () => {
    const now = Date.now()

    if (idle > 0) {
      for (const key of sorted()) {
        if ((refs.get(key) ?? 0) > 0) continue
        const age = now - (seen.get(key) ?? now)
        if (age < idle) continue
        Log.Default.info("disposing idle instance", { key, idle_ms: age })
        await drop(key)
      }
    }

    if (max <= 0) return

    while (cache.size > max) {
      const victim = sorted().find((key) => (refs.get(key) ?? 0) === 0)
      if (!victim) return
      Log.Default.warn("disposing instance due to limit", { key: victim, limit: max, size: cache.size })
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
      return context.provide(ctx, async () => {
        return input.fn()
      })
    } finally {
      if (!cache.has(directory)) {
        refs.delete(directory)
        seen.delete(directory)
      }
      if (cache.has(directory)) {
        refs.set(directory, Math.max(0, (refs.get(directory) ?? 1) - 1))
        stamp(directory)
        void sweep()
      }
    }
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
    Log.Default.info("disposing instance", { directory: Instance.directory })
    const done = await drop(Instance.directory, true)
    if (!done) emit(Instance.directory)
  },
  async disposeAll() {
    if (disposal.all) return disposal.all

    disposal.all = iife(async () => {
      Log.Default.info("disposing all instances")
      const entries = [...cache.entries()]
      for (const [key, task] of entries) {
        await drop(key, true, task)
      }
    }).finally(() => {
      disposal.all = undefined
    })

    return disposal.all
  },
}
