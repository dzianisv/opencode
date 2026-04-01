import semver from "semver"
import { Log } from "../util/log"
import { Process } from "../util/process"

export namespace PackageRegistry {
  const log = Log.create({ service: "bun" })
  const cache = new Map<string, { value: string | null; time: number }>()
  const inflight = new Map<string, Promise<string | null>>()

  function which() {
    return process.execPath
  }

  function ms(name: string, fallback: number, min: number) {
    const raw = Number(process.env[name])
    if (!Number.isFinite(raw)) return fallback
    return Math.max(min, Math.floor(raw))
  }

  function key(pkg: string, field: string, cwd?: string) {
    return [cwd ?? "", pkg, field].join("\u0000")
  }

  export async function info(pkg: string, field: string, cwd?: string): Promise<string | null> {
    const id = key(pkg, field, cwd)
    const now = Date.now()
    const ttl = ms("OPENCODE_BUN_INFO_CACHE_MS", 60_000, 0)
    const hit = cache.get(id)
    if (hit && now - hit.time <= ttl) return hit.value

    const run = inflight.get(id)
    if (run) return run

    const task = Promise.resolve()
      .then(async () => {
        const abort = new AbortController()
        const timeout = ms("OPENCODE_BUN_INFO_TIMEOUT_MS", 15_000, 100)
        const timer = setTimeout(() => {
          abort.abort()
        }, timeout)
        let timed = false
        abort.signal.addEventListener(
          "abort",
          () => {
            timed = true
          },
          { once: true },
        )

        const { code, stdout, stderr } = await Process.run([which(), "info", pkg, field], {
          cwd,
          env: {
            ...process.env,
            BUN_BE_BUN: "1",
          },
          abort: abort.signal,
          timeout: 500,
          nothrow: true,
        }).finally(() => {
          clearTimeout(timer)
        })

        if (code !== 0) {
          log.warn("bun info failed", {
            pkg,
            field,
            code,
            timeout_ms: timed ? timeout : undefined,
            stderr: stderr.toString(),
          })
          cache.set(id, { value: null, time: Date.now() })
          return null
        }

        const value = stdout.toString().trim() || null
        cache.set(id, { value, time: Date.now() })
        return value
      })
      .finally(() => {
        inflight.delete(id)
      })

    inflight.set(id, task)
    return task
  }

  export async function isOutdated(pkg: string, cachedVersion: string, cwd?: string): Promise<boolean> {
    const latestVersion = await info(pkg, "version", cwd)
    if (!latestVersion) {
      log.warn("Failed to resolve latest version, using cached", { pkg, cachedVersion })
      return false
    }

    const isRange = /[\s^~*xX<>|=]/.test(cachedVersion)
    if (isRange) return !semver.satisfies(latestVersion, cachedVersion)

    return semver.lt(cachedVersion, latestVersion)
  }
}
