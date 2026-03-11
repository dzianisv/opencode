import { Log } from "./log"

const log = Log.create({ service: "gc" })

const IDLE_MS = 5 * 60_000 // 5 minutes of inactivity
const GC_INTERVAL = 60_000 // check every minute

let timer: ReturnType<typeof setInterval> | undefined
let active = 0

export namespace GC {
  /** Mark the start of an active session (busy). */
  export function busy() {
    active++
  }

  /** Mark the end of an active session (idle). */
  export function idle() {
    active = Math.max(0, active - 1)
  }

  let last = Date.now()

  /** Reset the idle timer (called on any user activity). */
  export function touch() {
    last = Date.now()
  }

  /** Start the periodic idle GC timer. */
  export function init() {
    if (timer) return
    timer = setInterval(() => {
      if (active > 0) return
      if (Date.now() - last < IDLE_MS) return
      const before = process.memoryUsage.rss()
      Bun.gc(true)
      const after = process.memoryUsage.rss()
      const freed = before - after
      if (freed > 1024 * 1024) {
        log.info("idle gc", {
          freed: `${(freed / 1024 / 1024).toFixed(1)}MB`,
          rss: `${(after / 1024 / 1024).toFixed(0)}MB`,
        })
      }
    }, GC_INTERVAL)
    timer.unref()
  }

  /** Stop the periodic GC timer. */
  export function dispose() {
    if (!timer) return
    clearInterval(timer)
    timer = undefined
  }
}
