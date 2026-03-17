import { Instance } from "../project/instance"
import { Log } from "../util/log"
import { Flag } from "../flag/flag"
import { Filesystem } from "../util/filesystem"

export namespace FileTime {
  const log = Log.create({ service: "file.time" })

  function size(key: string, fallback: number) {
    const value = Number(process.env[key])
    if (Number.isFinite(value) && value > 0) return Math.floor(value)
    return fallback
  }

  function sessionMax() {
    return size("OPENCODE_FILETIME_SESSION_MAX", 256)
  }

  function fileMax() {
    return size("OPENCODE_FILETIME_FILE_MAX", 1024)
  }

  // Per-session read times plus per-file write locks.
  // All tools that overwrite existing files should run their
  // assert/read/write/update sequence inside withLock(filepath, ...)
  // so concurrent writes to the same file are serialized.
  export const state = Instance.state(() => {
    const read = new Map<string, Map<string, number>>()
    const locks = new Map<string, Promise<void>>()
    return {
      read,
      locks,
    }
  })

  export function read(sessionID: string, file: string) {
    log.info("read", { sessionID, file })
    const { read } = state()
    const files = read.get(sessionID) ?? new Map<string, number>()
    files.delete(file)
    files.set(file, Date.now())
    const max = fileMax()
    while (files.size > max) {
      const stale = files.keys().next().value as string | undefined
      if (!stale) break
      files.delete(stale)
    }
    read.delete(sessionID)
    read.set(sessionID, files)
    const sessions = sessionMax()
    while (read.size > sessions) {
      const stale = read.keys().next().value as string | undefined
      if (!stale) break
      read.delete(stale)
    }
  }

  export function get(sessionID: string, file: string) {
    const value = state().read.get(sessionID)?.get(file)
    if (value === undefined) return undefined
    return new Date(value)
  }

  export function clear(sessionID: string) {
    state().read.delete(sessionID)
  }

  export async function withLock<T>(filepath: string, fn: () => Promise<T>): Promise<T> {
    const current = state()
    const currentLock = current.locks.get(filepath) ?? Promise.resolve()
    let release: () => void = () => {}
    const nextLock = new Promise<void>((resolve) => {
      release = resolve
    })
    const chained = currentLock.then(() => nextLock)
    current.locks.set(filepath, chained)
    await currentLock
    try {
      return await fn()
    } finally {
      release()
      if (current.locks.get(filepath) === chained) {
        current.locks.delete(filepath)
      }
    }
  }

  export async function assert(sessionID: string, filepath: string) {
    if (Flag.OPENCODE_DISABLE_FILETIME_CHECK === true) {
      return
    }

    const time = get(sessionID, filepath)
    if (!time) throw new Error(`You must read file ${filepath} before overwriting it. Use the Read tool first`)
    const mtime = Filesystem.stat(filepath)?.mtime
    // Allow a 50ms tolerance for Windows NTFS timestamp fuzziness / async flushing
    if (mtime && mtime.getTime() > time.getTime() + 50) {
      throw new Error(
        `File ${filepath} has been modified since it was last read.\nLast modification: ${mtime.toISOString()}\nLast read: ${time.toISOString()}\n\nPlease read the file again before modifying it.`,
      )
    }
  }
}
