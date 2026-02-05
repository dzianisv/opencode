import { describe, test, expect } from "bun:test"
import { StreamIdleTimeoutError, MessageV2 } from "../../src/session/message-v2"
import { SessionRetry } from "../../src/session/retry"

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

describe("StreamIdleTimeoutError retry behavior", () => {
  test("converts to retryable APIError", () => {
    const error = new StreamIdleTimeoutError(60000)
    const result = MessageV2.fromError(error, { providerID: "test" })

    expect(MessageV2.APIError.isInstance(result)).toBe(true)
    const apiError = result as MessageV2.APIError
    expect(apiError.data.isRetryable).toBe(true)
    expect(apiError.data.message).toBe("Stream idle timeout: no data received for 60000ms")
    expect(apiError.data.metadata?.timeoutMs).toBe("60000")
  })

  test("is detected as retryable by SessionRetry.retryable", () => {
    const error = new StreamIdleTimeoutError(60000)
    const apiError = MessageV2.fromError(error, { providerID: "test" })

    const retryMessage = SessionRetry.retryable(apiError)
    expect(retryMessage).toBeDefined()
    expect(retryMessage).toContain("Stream idle timeout")
  })
})
