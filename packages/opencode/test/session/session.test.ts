import { describe, expect, test } from "bun:test"
import path from "path"
import { Session } from "../../src/session"
import { Bus } from "../../src/bus"
import { Log } from "../../src/util/log"
import { Instance } from "../../src/project/instance"
import { MessageV2 } from "../../src/session/message-v2"
import { MessageID, PartID } from "../../src/session/schema"
import { ModelID, ProviderID } from "../../src/provider/schema"

const projectRoot = path.join(__dirname, "../..")
Log.init({ print: false })

describe("session.created event", () => {
  test("should emit session.created event when session is created", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        let eventReceived = false
        let receivedInfo: Session.Info | undefined

        const unsub = Bus.subscribe(Session.Event.Created, (event) => {
          eventReceived = true
          receivedInfo = event.properties.info as Session.Info
        })

        const session = await Session.create({})

        await new Promise((resolve) => setTimeout(resolve, 100))

        unsub()

        expect(eventReceived).toBe(true)
        expect(receivedInfo).toBeDefined()
        expect(receivedInfo?.id).toBe(session.id)
        expect(receivedInfo?.projectID).toBe(session.projectID)
        expect(receivedInfo?.directory).toBe(session.directory)
        expect(receivedInfo?.title).toBe(session.title)

        await Session.remove(session.id)
      },
    })
  })

  test("session.created event should be emitted before session.updated", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const events: string[] = []

        const unsubCreated = Bus.subscribe(Session.Event.Created, () => {
          events.push("created")
        })

        const unsubUpdated = Bus.subscribe(Session.Event.Updated, () => {
          events.push("updated")
        })

        const session = await Session.create({})

        await new Promise((resolve) => setTimeout(resolve, 100))

        unsubCreated()
        unsubUpdated()

        expect(events).toContain("created")
        expect(events).toContain("updated")
        expect(events.indexOf("created")).toBeLessThan(events.indexOf("updated"))

        await Session.remove(session.id)
      },
    })
  })
})

describe("step-finish token propagation via Bus event", () => {
  test(
    "non-zero tokens propagate through PartUpdated event",
    async () => {
      await Instance.provide({
        directory: projectRoot,
        fn: async () => {
          const session = await Session.create({})

          const messageID = MessageID.ascending()
          await Session.updateMessage({
            id: messageID,
            sessionID: session.id,
            role: "user",
            time: { created: Date.now() },
            agent: "user",
            model: { providerID: "test", modelID: "test" },
            tools: {},
            mode: "",
          } as unknown as MessageV2.Info)

          let received: MessageV2.Part | undefined
          const unsub = Bus.subscribe(MessageV2.Event.PartUpdated, (event) => {
            received = event.properties.part
          })

          const tokens = {
            total: 1500,
            input: 500,
            output: 800,
            reasoning: 200,
            cache: { read: 100, write: 50 },
          }

          const partInput = {
            id: PartID.ascending(),
            messageID,
            sessionID: session.id,
            type: "step-finish" as const,
            reason: "stop",
            cost: 0.005,
            tokens,
          }

          await Session.updatePart(partInput)

          await new Promise((resolve) => setTimeout(resolve, 100))

          expect(received).toBeDefined()
          expect(received!.type).toBe("step-finish")
          const finish = received as MessageV2.StepFinishPart
          expect(finish.tokens.input).toBe(500)
          expect(finish.tokens.output).toBe(800)
          expect(finish.tokens.reasoning).toBe(200)
          expect(finish.tokens.total).toBe(1500)
          expect(finish.tokens.cache.read).toBe(100)
          expect(finish.tokens.cache.write).toBe(50)
          expect(finish.cost).toBe(0.005)
          expect(received).not.toBe(partInput)

          unsub()
          await Session.remove(session.id)
        },
      })
    },
    { timeout: 30000 },
  )
})

describe("session recover", () => {
  test("marks stale running tool parts on completed assistant messages", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const session = await Session.create({})
        const userID = MessageID.ascending()
        await Session.updateMessage({
          id: userID,
          sessionID: session.id,
          role: "user",
          time: { created: Date.now() },
          agent: "default",
          model: { providerID: ProviderID.make("test"), modelID: ModelID.make("test") },
          tools: {},
          mode: "build",
        } as MessageV2.User)

        const assistantID = MessageID.ascending()
        await Session.updateMessage({
          id: assistantID,
          sessionID: session.id,
          role: "assistant",
          parentID: userID,
          modelID: ModelID.make("test"),
          providerID: ProviderID.make("test"),
          mode: "build",
          agent: "default",
          path: { cwd: projectRoot, root: projectRoot },
          cost: 0,
          tokens: {
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          time: { created: Date.now(), completed: Date.now() },
        } as MessageV2.Assistant)

        const start = Date.now() - 10_000
        const partID = PartID.ascending()
        await Session.updatePart({
          id: partID,
          messageID: assistantID,
          sessionID: session.id,
          type: "tool",
          tool: "bash",
          callID: "call-stale",
          state: {
            status: "running",
            input: { cmd: "sleep 999" },
            time: { start },
          },
        } satisfies MessageV2.ToolPart)

        await Session.recover()

        const msg = await Session.messages({ sessionID: session.id })
        const assistant = msg.find((item) => item.info.id === assistantID)
        expect(assistant).toBeDefined()
        const part = assistant?.parts.find((item) => item.type === "tool" && item.id === partID)
        expect(part?.type).toBe("tool")
        if (!part || part.type !== "tool") return
        expect(part.state.status).toBe("error")
        if (part.state.status !== "error") return
        expect(part.state.error).toBe("Tool execution was interrupted by server restart")
        expect(part.state.time.start).toBe(start)
        expect(part.state.time.end).toBeGreaterThanOrEqual(start)

        await Session.remove(session.id)
      },
    })
  })
})
