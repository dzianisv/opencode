import { Cron } from "croner"
import { Log } from "../util/log"
import { SchedulerStore } from "./store"
import { Session } from "../session"
import { SessionPrompt } from "../session/prompt"
import { Provider } from "../provider/provider"
import { Config } from "../config/config"
import type { SessionID } from "../session/schema"

export namespace SchedulerRunner {
  const log = Log.create({ service: "scheduler.runner" })

  const state: {
    timer?: ReturnType<typeof setTimeout>
    active: number
    running: boolean
    dirty: boolean
    waking: boolean
    queue: SchedulerStore.Job[]
    next: Map<string, number>
    sessions: Map<string, SessionID>
    jobs: Map<string, SchedulerStore.Job>
    inflight: Set<Promise<void>>
  } = {
    active: 0,
    running: false,
    dirty: false,
    waking: false,
    queue: [],
    next: new Map(),
    sessions: new Map(),
    jobs: new Map(),
    inflight: new Set(),
  }

  function nextRun(job: SchedulerStore.Job, from = Date.now()) {
    try {
      const cron = new Cron(job.schedule, { paused: true })
      const date = cron.nextRun(new Date(from))
      return date ? date.getTime() : undefined
    } catch {
      return undefined
    }
  }

  async function limit() {
    const cfg = await Config.get()
    const max = cfg.scheduler?.maxConcurrent ?? 1
    if (!Number.isFinite(max) || max < 1) return 1
    return Math.floor(max)
  }

  async function run(job: SchedulerStore.Job) {
    const model = job.model ?? (await Provider.defaultModel())
    let sessionID = state.sessions.get(job.id)
    if (!sessionID) {
      const session = await Session.create({
        title: `Scheduler ${job.id}`,
      })
      sessionID = session.id
      state.sessions.set(job.id, sessionID)
    }

    const msg = await SessionPrompt.prompt({
      sessionID,
      agent: job.agent,
      model,
      variant: job.variant,
      parts: [{ type: "text", text: job.prompt }],
    })

    const text = msg.parts.findLast((x) => x.type === "text")?.text?.trim()
    if (text !== "HEARTBEAT_OK") {
      log.info("job completed", { id: job.id, sessionID })
    }
    await SchedulerStore.touch(job.id, Date.now())
  }

  async function drain() {
    if (!state.running) return
    const max = await limit()
    while (state.active < max && state.queue.length > 0) {
      const item = state.queue.shift()
      if (!item) return
      const job = await SchedulerStore.get(item.id)
      if (!job?.enabled) continue
      state.active += 1
      const task = run(job)
        .catch((error) => {
          log.error("job run failed", { id: job.id, error })
        })
        .finally(() => {
          state.active -= 1
          state.inflight.delete(task)
          void drain()
        })
      state.inflight.add(task)
    }
  }

  async function refresh() {
    const now = Date.now()
    const list = await SchedulerStore.list()
    state.jobs = new Map(list.map((x) => [x.id, x]))
    state.queue = state.queue.flatMap((item) => {
      const job = state.jobs.get(item.id)
      if (!job?.enabled) return []
      return [job]
    })

    for (const [id] of state.next) {
      if (!state.jobs.has(id)) state.next.delete(id)
    }

    for (const job of list) {
      if (!job.enabled) {
        state.next.delete(job.id)
        continue
      }

      const at = state.next.get(job.id)
      if (at === undefined) {
        const next = nextRun(job, now)
        if (next !== undefined) state.next.set(job.id, next)
        continue
      }

      if (at > now) continue
      state.queue.push(job)
      const next = nextRun(job, now + 1)
      if (next === undefined) state.next.delete(job.id)
      else state.next.set(job.id, next)
    }
  }

  function arm(ms?: number) {
    if (!state.running) return
    if (state.timer) {
      clearTimeout(state.timer)
      state.timer = undefined
    }
    let delay = ms
    if (delay === undefined) {
      const times = [...state.next.values()].sort((a, b) => a - b)
      if (times.length === 0) return
      delay = Math.min(2_147_483_647, Math.max(0, times[0] - Date.now()))
    }
    state.timer = setTimeout(() => {
      state.timer = undefined
      void wake()
    }, delay)
    state.timer.unref?.()
  }

  async function wake() {
    if (!state.running) return
    if (state.waking) return
    state.waking = true
    try {
      while (state.running) {
        const dirty = state.dirty
        state.dirty = false
        await refresh()
        await drain()
        if (!dirty && !state.dirty) break
      }
    } finally {
      state.waking = false
    }
    arm()
  }

  export async function start() {
    if (state.running) return
    state.running = true
    state.dirty = true
    log.info("scheduler runner started")
    await wake()
  }

  export async function stop() {
    if (!state.running) return
    state.running = false
    if (state.timer) {
      clearTimeout(state.timer)
      state.timer = undefined
    }
    await Promise.allSettled([...state.inflight])
    state.inflight.clear()
    state.queue.length = 0
    state.next.clear()
    state.jobs.clear()
    state.sessions.clear()
    state.dirty = false
    state.waking = false
    log.info("scheduler runner stopped")
  }

  export async function runNow(id: string) {
    const job = await SchedulerStore.get(id)
    if (!job) return false
    await run(job)
    return true
  }

  export function notify() {
    if (!state.running) return
    if (state.dirty) return
    state.dirty = true
    if (state.waking) return
    arm(0)
  }
}
