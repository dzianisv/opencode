import { describe, expect, test } from "bun:test"

/**
 * The `safe()` guard in SessionReview prevents:
 *   TypeError: e.diffs.map is not a function
 * when props.diffs is not an array (e.g. from reconcile edge cases or unexpected API data).
 *
 * Guard: `Array.isArray(props.diffs) ? props.diffs : []`
 */
describe("session-review diffs guard", () => {
  const guard = (v: unknown) => (Array.isArray(v) ? v : [])

  test("returns [] for non-array inputs", () => {
    expect(guard(undefined)).toEqual([])
    expect(guard(null)).toEqual([])
    expect(guard({})).toEqual([])
    expect(guard("string")).toEqual([])
    expect(guard(42)).toEqual([])
  })

  test("passes through valid arrays", () => {
    const diffs = [{ file: "a.ts", before: "", after: "x", additions: 1, deletions: 0, status: "added" }]
    expect(guard(diffs)).toBe(diffs)
    expect(guard([])).toEqual([])
  })

  test(".map() works on guarded value", () => {
    expect(() => guard(undefined).map((d: any) => d.file)).not.toThrow()
    expect(() => guard({}).map((d: any) => d.file)).not.toThrow()
    expect(guard(undefined).map((d: any) => d.file)).toEqual([])
  })
})
