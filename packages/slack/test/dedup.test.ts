import { describe, test, expect } from "bun:test"
import { createDedup } from "../src/dedup"

describe("dedup", () => {
  test("first call returns false (not duplicate)", () => {
    const dedup = createDedup()
    expect(dedup.check("1234567890.000001")).toBe(false)
  })

  test("second call with same ts returns true (duplicate)", () => {
    const dedup = createDedup()
    dedup.check("1234567890.000001")
    expect(dedup.check("1234567890.000001")).toBe(true)
  })

  test("different timestamps are not duplicates", () => {
    const dedup = createDedup()
    expect(dedup.check("1234567890.000001")).toBe(false)
    expect(dedup.check("1234567890.000002")).toBe(false)
  })

  test("tracks size correctly", () => {
    const dedup = createDedup()
    expect(dedup.size).toBe(0)
    dedup.check("1234567890.000001")
    expect(dedup.size).toBe(1)
    dedup.check("1234567890.000002")
    expect(dedup.size).toBe(2)
    // duplicate doesn't increase size
    dedup.check("1234567890.000001")
    expect(dedup.size).toBe(2)
  })

  test("entry expires after ttl", async () => {
    const dedup = createDedup(50) // 50ms TTL
    dedup.check("1234567890.000001")
    expect(dedup.check("1234567890.000001")).toBe(true)
    await new Promise((r) => setTimeout(r, 100))
    // after TTL, should no longer be a duplicate
    expect(dedup.check("1234567890.000001")).toBe(false)
  })

  test("simulates Slack message + app_mention deduplication", () => {
    const dedup = createDedup()
    const ts = "1515449522.000016"
    // message event arrives first
    const first = dedup.check(ts)
    expect(first).toBe(false) // should process
    // app_mention event arrives for the same message
    const second = dedup.check(ts)
    expect(second).toBe(true) // should skip (duplicate)
  })
})
