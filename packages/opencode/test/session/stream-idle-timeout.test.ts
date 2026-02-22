import { describe, test, expect } from "bun:test"
import { StreamIdleTimeoutError } from "../../src/session/message-v2"

// We can't import withIdleTimeout directly since it's not exported,
// so we test the error handling integration

describe("StreamIdleTimeoutError", () => {
  test("has correct name and message", () => {
    const error = new StreamIdleTimeoutError(60000)
    expect(error.name).toBe("StreamIdleTimeoutError")
    expect(error.message).toBe("Stream idle timeout: no data received for 60000ms")
    expect(error.timeoutMs).toBe(60000)
  })

  test("is instanceof Error", () => {
    const error = new StreamIdleTimeoutError(60000)
    expect(error instanceof Error).toBe(true)
    expect(error instanceof StreamIdleTimeoutError).toBe(true)
  })
})
