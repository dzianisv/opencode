import { describe, expect, test } from "bun:test"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Instance } from "../../src/project/instance"
import { ResumeError } from "../../src/session/auto-resume"
import { MessageV2 } from "../../src/session/message-v2"
import { MessageID, PartID, SessionID } from "../../src/session/schema"
import { Session } from "../../src/session"
import { Log } from "../../src/util/log"
import { tmpdir } from "../fixture/fixture"

Log.init({ print: false })

const user = (input: { id: string; sessionID: string; at: number }) =>
  ({
    id: MessageID.make(input.id),
    sessionID: SessionID.make(input.sessionID),
    role: "user",
    time: { created: input.at },
    agent: "default",
    model: { providerID: ProviderID.make("opencode"), modelID: ModelID.make("gpt-5-mini") },
    mode: "build",
  }) as unknown as MessageV2.User

const assistant = (input: { id: string; sessionID: string; parentID: string; at: number }) =>
  ({
    id: MessageID.make(input.id),
    sessionID: SessionID.make(input.sessionID),
    role: "assistant",
    time: { created: input.at - 1, completed: input.at },
    parentID: MessageID.make(input.parentID),
    modelID: ModelID.make("gpt-5-mini"),
    providerID: ProviderID.make("opencode"),
    mode: "build",
    agent: "default",
    path: { cwd: "/tmp", root: "/tmp" },
    cost: 0,
    tokens: {
      input: 0,
      output: 0,
      reasoning: 0,
      cache: { read: 0, write: 0 },
    },
  }) as unknown as MessageV2.Assistant

describe("session.listResumable", () => {
  test("returns interrupted sessions even when recency scan would skip them", async () => {
    await using tmp = await tmpdir()
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const hit = await Session.create({})
        const at = Date.now()
        const u = user({ id: MessageID.ascending(), sessionID: hit.id, at: at - 10 })
        const a = assistant({
          id: MessageID.ascending(),
          sessionID: hit.id,
          parentID: u.id,
          at,
        })
        await Session.updateMessage(u)
        await Session.updateMessage(a)
        await Session.updatePart({
          id: PartID.ascending(),
          sessionID: hit.id,
          messageID: a.id,
          type: "tool",
          callID: `call-${a.id}`,
          tool: "bash",
          state: {
            status: "error",
            input: {},
            error: ResumeError,
            time: { start: at - 5, end: at - 1 },
          },
        } as MessageV2.ToolPart)

        for (let i = 0; i < 35; i++) {
          await Session.create({})
          await new Promise((done) => setTimeout(done, 2))
        }

        const recent = [...Session.listGlobal({ limit: 30 })]
        expect(recent.some((item) => item.id === hit.id)).toBe(false)

        const list = [...Session.listResumable({ limit: 30 })]
        expect(list.some((item) => item.id === hit.id)).toBe(true)
      },
    })
  })
})
