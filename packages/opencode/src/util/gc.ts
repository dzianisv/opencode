import { Log } from "./log"

const log = Log.create({ service: "gc" })

const IDLE_MS = 5 * 60_000
const INTERVAL_MS = 60_000

const live = new Set<string>()
let last = Date.now()
let timer: ReturnType<typeof setInterval> | undefined

export namespace GC {
  export function set(session: string, busy: boolean) {
    if (busy) {
      live.add(session)
      touch()
      return
    }
    live.delete(session)
  }

  export function clear(ids: Iterable<string>) {
    for (const id of ids) live.delete(id)
    touch()
  }

  export function touch() {
    last = Date.now()
  }

  export function init() {
    if (timer) return
    timer = setInterval(() => {
      if (live.size > 0) return
      if (Date.now() - last < IDLE_MS) return
      const before = process.memoryUsage().rss
      Bun.gc(true)
      const after = process.memoryUsage().rss
      last = Date.now()
      const freed = before - after
      if (freed <= 1024 * 1024) return
      log.info("idle gc", {
        freed: `${(freed / 1024 / 1024).toFixed(1)}MB`,
        rss: `${(after / 1024 / 1024).toFixed(0)}MB`,
      })
    }, INTERVAL_MS)
    timer.unref?.()
  }

  export function dispose() {
    if (!timer) return
    clearInterval(timer)
    timer = undefined
    live.clear()
    last = Date.now()
  }
}
