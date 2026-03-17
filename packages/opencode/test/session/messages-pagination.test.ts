import { describe, expect, test } from "bun:test"
import path from "path"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { MessageV2 } from "../../src/session/message-v2"
import { MessageID, PartID, type SessionID } from "../../src/session/schema"
import { Log } from "../../src/util/log"

const root = path.join(__dirname, "../..")
Log.init({ print: false })

async function fill(sessionID: SessionID, count: number, time = (i: number) => Date.now() + i) {
  const ids = [] as MessageID[]
  for (let i = 0; i < count; i++) {
    const id = MessageID.ascending()
    ids.push(id)
    await Session.updateMessage({
      id,
      sessionID,
      role: "user",
      time: { created: time(i) },
      agent: "test",
      model: { providerID: "test", modelID: "test" },
      tools: {},
      mode: "",
    } as unknown as MessageV2.Info)
    await Session.updatePart({
      id: PartID.ascending(),
      sessionID,
      messageID: id,
      type: "text",
      text: `m${i}`,
    })
  }
  return ids
}

describe("session message pagination", () => {
  test("pages backward with opaque cursors", async () => {
    await Instance.provide({
      directory: root,
      fn: async () => {
        const session = await Session.create({})
        const ids = await fill(session.id, 6)

        const a = await MessageV2.page({ sessionID: session.id, limit: 2 })
        expect(a.items.map((item) => item.info.id)).toEqual(ids.slice(-2))
        expect(a.items.every((item) => item.parts.length === 1)).toBe(true)
        expect(a.more).toBe(true)
        expect(a.cursor).toBeTruthy()

        const b = await MessageV2.page({ sessionID: session.id, limit: 2, before: a.cursor! })
        expect(b.items.map((item) => item.info.id)).toEqual(ids.slice(-4, -2))
        expect(b.more).toBe(true)
        expect(b.cursor).toBeTruthy()

        const c = await MessageV2.page({ sessionID: session.id, limit: 2, before: b.cursor! })
        expect(c.items.map((item) => item.info.id)).toEqual(ids.slice(0, 2))
        expect(c.more).toBe(false)
        expect(c.cursor).toBeUndefined()

        await Session.remove(session.id)
      },
    })
  })

  test("keeps stream order newest first", async () => {
    await Instance.provide({
      directory: root,
      fn: async () => {
        const session = await Session.create({})
        const ids = await fill(session.id, 5)

        const items = await Array.fromAsync(MessageV2.stream(session.id))
        expect(items.map((item) => item.info.id)).toEqual(ids.slice().reverse())

        await Session.remove(session.id)
      },
    })
  })

  test("accepts cursors generated from fractional timestamps", async () => {
    await Instance.provide({
      directory: root,
      fn: async () => {
        const session = await Session.create({})
        const ids = await fill(session.id, 4, (i) => 1000.5 + i)

        const a = await MessageV2.page({ sessionID: session.id, limit: 2 })
        const b = await MessageV2.page({ sessionID: session.id, limit: 2, before: a.cursor! })

        expect(a.items.map((item) => item.info.id)).toEqual(ids.slice(-2))
        expect(b.items.map((item) => item.info.id)).toEqual(ids.slice(0, 2))

        await Session.remove(session.id)
      },
    })
  })

  test("scopes get by session id", async () => {
    await Instance.provide({
      directory: root,
      fn: async () => {
        const a = await Session.create({})
        const b = await Session.create({})
        const [id] = await fill(a.id, 1)

        await expect(MessageV2.get({ sessionID: b.id, messageID: id })).rejects.toMatchObject({ name: "NotFoundError" })

        await Session.remove(a.id)
        await Session.remove(b.id)
      },
    })
  })

  test("builds lightweight preview payloads for prefetch", async () => {
    await Instance.provide({
      directory: root,
      fn: async () => {
        const session = await Session.create({})

        const userID = MessageID.ascending()
        await Session.updateMessage({
          id: userID,
          sessionID: session.id,
          role: "user",
          time: { created: Date.now() },
          agent: "test",
          model: { providerID: "test", modelID: "test" },
          tools: {},
          mode: "",
        } as unknown as MessageV2.Info)
        await Session.updatePart({
          id: PartID.ascending(),
          sessionID: session.id,
          messageID: userID,
          type: "text",
          text: "hello",
        })

        const assistantID = MessageID.ascending()
        await Session.updateMessage({
          id: assistantID,
          sessionID: session.id,
          role: "assistant",
          parentID: userID,
          mode: "build",
          agent: "build",
          cost: 0,
          path: { cwd: root, root },
          time: { created: Date.now(), completed: Date.now() },
          modelID: "test",
          providerID: "test",
          tokens: {
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
        } as unknown as MessageV2.Info)
        await Session.updatePart({
          id: PartID.ascending(),
          sessionID: session.id,
          messageID: assistantID,
          type: "tool",
          tool: "bash",
          callID: "call_preview",
          state: {
            status: "completed",
            time: {
              start: Date.now(),
              end: Date.now(),
            },
            input: {
              command: "printf x",
            },
            title: "bash",
            metadata: {
              output: "x".repeat(1024),
              description: "bash",
            },
            output: "x".repeat(1024),
          },
        })

        const items = await Session.messages({ sessionID: session.id })
        const preview = MessageV2.preview(items)

        expect(preview.map((item) => item.info.id)).toEqual([userID, assistantID])
        expect(preview[0].parts).toEqual([
          expect.objectContaining({
            type: "text",
            text: "hello",
          }),
        ])
        expect(preview[1].parts).toEqual([])

        await Session.remove(session.id)
      },
    })
  })
})
