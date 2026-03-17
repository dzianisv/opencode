import { describe, expect, test } from "bun:test"
import { Server } from "../../src/server/server"
import { Log } from "../../src/util/log"

Log.init({ print: false })

describe("server.listen", () => {
  test("reports hostname and attempted ports when bind fails", () => {
    let err: unknown
    try {
      Server.listen({
        hostname: "203.0.113.77",
        port: 0,
      })
    } catch (input) {
      err = input
    }

    expect(err).toBeInstanceOf(Error)
    if (!(err instanceof Error)) return
    expect(err.message).toContain("Failed to start server on 203.0.113.77 (requested port 0).")
    expect(err.message).toContain("203.0.113.77:4096")
    expect(err.message).toContain("203.0.113.77:0")
  })
})
