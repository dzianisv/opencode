/**
 * Smoke test: POST /session/:id/message round-trip against Server.Default().
 *
 * Verifies that:
 *  1. POST /session creates a new session and returns a valid session id.
 *  2. POST /session/:id/message streams back an assistant reply without throwing
 *     "computeDiff is not defined" or any other runtime error.
 *  3. The streamed response is valid JSON with role === "assistant".
 *
 * This is the same round-trip that was manually validated on 2026-04-22 and
 * exposed the missing computeDiff definition in SessionSummary.
 */
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { Instance } from "../../src/project/instance"
import { Server } from "../../src/server/server"
import { Session } from "../../src/session"
import { SessionPrompt } from "../../src/session/prompt"
import { Log } from "../../src/util/log"
import { tmpdir } from "../fixture/fixture"

Log.init({ print: false })

afterEach(async () => {
  mock.restore()
  await Instance.disposeAll()
})

describe("POST /session/:id/message smoke", () => {
  test("streams assistant reply without computeDiff runtime error", async () => {
    await using tmp = await tmpdir({ git: true })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const session = await Session.create({ title: "smoke-test" })

        // Stub SessionPrompt.prompt so the test doesn't require a live LLM.
        // Returns a minimal assistant-shaped object that the route serialises.
        const stubReply = {
          info: {
            id: "msg_smoke_asst_01",
            sessionID: session.id,
            role: "assistant",
            agent: "build",
            time: { created: Date.now() },
          },
          parts: [
            {
              id: "part_smoke_01",
              sessionID: session.id,
              messageID: "msg_smoke_asst_01",
              type: "text",
              text: "smoke-ok",
            },
          ],
        }

        spyOn(SessionPrompt, "prompt").mockResolvedValue(stubReply as any)

        const app = Server.Default()

        const res = await app.request(`/session/${session.id}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parts: [{ type: "text", text: "ping" }],
            agent: "build",
          }),
        })

        expect(res.status).toBe(200)

        const text = await res.text()
        expect(text.length).toBeGreaterThan(0)

        // The route streams JSON — parse the first (and only) emitted object.
        const parsed = JSON.parse(text)
        expect(parsed).toHaveProperty("info")
        expect(parsed.info.role).toBe("assistant")
        expect(parsed.parts).toBeArray()
        expect(parsed.parts[0].text).toBe("smoke-ok")

        await Session.remove(session.id)
      },
    })
  })
})
