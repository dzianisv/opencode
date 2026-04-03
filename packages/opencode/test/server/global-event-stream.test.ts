import { describe, expect, test } from "bun:test"
import { Server } from "../../src/server/server"
import { GlobalBus } from "../../src/bus/global"
import { Log } from "../../src/util/log"

Log.init({ print: false })

function payloads(input: string) {
  return input
    .split("\n\n")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .flatMap((chunk) => {
      const line = chunk
        .split("\n")
        .find((item) => item.startsWith("data:"))
      if (!line) return []
      const text = line.slice(5).trim()
      if (!text) return []
      return [JSON.parse(text) as { payload?: { type?: string }; directory?: string }]
    })
}

describe("global event stream", () => {
  test("emits connected + bus events with streaming headers", async () => {
    const app = Server.Default()
    const res = await app.request("/global/event")
    expect(res.status).toBe(200)
    const cache = res.headers.get("cache-control")
    expect(cache).toContain("no-cache")
    expect(cache).toContain("no-transform")
    expect(res.headers.get("x-accel-buffering")).toBe("no")
    expect(res.headers.get("x-content-type-options")).toBe("nosniff")
    expect(res.headers.get("content-type")).toContain("text/event-stream")

    const reader = res.body?.getReader()
    expect(reader).toBeTruthy()

    const race = async (run: Promise<unknown>, label: string) => {
      await Promise.race([
        run,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`timed out waiting for ${label}`)), 1000),
        ),
      ])
    }
    const dec = new TextDecoder()
    let text = ""
    const read = async (
      match: (events: ReturnType<typeof payloads>) => boolean,
    ) => {
      if (!reader) return
      while (true) {
        const next = await reader.read()
        if (next.done) return
        text += dec.decode(next.value, { stream: true })
        if (match(payloads(text))) return
      }
    }

    let connected = false
    let ready = false
    try {
      await race(
        read((events) => {
          connected = events.some((event) => event.payload?.type === "server.connected")
          return connected
        }),
        "server.connected",
      )

      GlobalBus.emit("event", {
        directory: "global",
        payload: {
          type: "session.idle",
          properties: {
            sessionID: "ses_test",
          },
        },
      })

      await race(
        read((events) => {
          const custom = events.find((event) => event.payload?.type === "session.idle")
          if (!custom) return false
          expect(custom.directory).toBe("global")
          ready = true
          return true
        }),
        "session.idle",
      )

      expect(connected).toBeTrue()
      expect(ready).toBeTrue()
    } finally {
      await reader?.cancel()
    }
  })
})
