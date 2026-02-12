// Track recently processed message timestamps to deduplicate between
// app.message() and app.event('app_mention') which both fire for @mentions
export function createDedup(ttl = 60_000) {
  const processed = new Set<string>()

  return {
    check(ts: string): boolean {
      if (processed.has(ts)) return true
      processed.add(ts)
      setTimeout(() => processed.delete(ts), ttl)
      return false
    },
    get size() {
      return processed.size
    },
  }
}
