import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test"
import { Instance } from "../../../src/project/instance"
import { Session } from "../../../src/session"
import { MessageV2 } from "../../../src/session/message-v2"
import { MessageID, PartID } from "../../../src/session/schema"
import { ModelID, ProviderID } from "../../../src/provider/schema"
import { ResumePrompt, ResumeError } from "../../../src/session/auto-resume"
import { SessionPrompt } from "../../../src/session/prompt"
import { WorkspaceContext } from "../../../src/control-plane/workspace-context"
import { autoresume } from "../../../src/cli/cmd/serve"
import { tmpdir } from "../../fixture/fixture"
import { resetDatabase } from "../../fixture/db"
import { Log } from "../../../src/util/log"

Log.init({ print: false })

const model = {
  providerID: ProviderID.make("opencode"),
  modelID: ModelID.make("gpt-5-mini"),
}

function user(input: { sessionID: string; at: number }) {
  return {
    id: MessageID.ascending(),
    sessionID: input.sessionID,
    role: "user",
    time: { created: input.at },
    agent: "default",
    model,
    mode: "build",
  } as unknown as MessageV2.User
}

function assistant(input: { sessionID: string; parentID: string; at: number; abort?: boolean }) {
  return {
    id: MessageID.ascending(),
    sessionID: input.sessionID,
    role: "assistant",
    time: { created: input.at - 1, completed: input.at },
    parentID: input.parentID,
    modelID: model.modelID,
    providerID: model.providerID,
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
    ...(input.abort
      ? { error: new MessageV2.AbortedError({ message: "The operation was aborted." }).toObject() }
      : {}),
  } as unknown as MessageV2.Assistant
}

async function seed(input: { sessionID: string; at: number; kind: "tool" | "abort"; followup?: boolean }) {
  const u = user({ sessionID: input.sessionID, at: input.at - 2 })
  const a = assistant({
    sessionID: input.sessionID,
    parentID: u.id,
    at: input.at,
    abort: input.kind === "abort",
  })
  await Session.updateMessage(u)
  await Session.updateMessage(a)

  if (input.kind === "tool") {
    await Session.updatePart({
      id: PartID.ascending(),
      sessionID: input.sessionID,
      messageID: a.id,
      type: "tool",
      callID: `call-${a.id}`,
      tool: "bash",
      state: {
        status: "error",
        input: {},
        error: ResumeError,
        time: { start: input.at - 1, end: input.at },
      },
    } as MessageV2.ToolPart)
  }

  if (input.followup) {
    await Session.updateMessage(user({ sessionID: input.sessionID, at: input.at + 2 }))
  }
}

const env = {
  scan: process.env.OPENCODE_SERVE_RESUME_SCAN_LIMIT,
  max: process.env.OPENCODE_SERVE_RESUME_MAX,
}

beforeEach(async () => {
  await resetDatabase()
})

afterEach(async () => {
  if (env.scan === undefined) delete process.env.OPENCODE_SERVE_RESUME_SCAN_LIMIT
  else process.env.OPENCODE_SERVE_RESUME_SCAN_LIMIT = env.scan
  if (env.max === undefined) delete process.env.OPENCODE_SERVE_RESUME_MAX
  else process.env.OPENCODE_SERVE_RESUME_MAX = env.max
  mock.restore()
  await resetDatabase()
})

describe("serve autoresume", () => {
  test("resumes interrupted sessions outside global recency and skips superseded sessions", async () => {
    await using tmp = await tmpdir()
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const old = await Session.create({})
        const good = await Session.create({})
        const skip = await Session.create({})

        await seed({ sessionID: old.id, at: 1_000, kind: "tool" })
        await seed({ sessionID: good.id, at: 2_000, kind: "abort" })
        await seed({ sessionID: skip.id, at: 3_000, kind: "tool", followup: true })

        for (let i = 0; i < 35; i++) {
          await Session.create({})
        }

        const recent = [...Session.listGlobal({ limit: 30 })]
        expect(recent.some((item) => item.id === old.id)).toBe(false)
      },
    })

    process.env.OPENCODE_SERVE_RESUME_SCAN_LIMIT = "30"
    process.env.OPENCODE_SERVE_RESUME_MAX = "5"

    const seen: string[] = []
    spyOn(WorkspaceContext, "provide").mockImplementation(async (input: any) => input.fn())
    spyOn(Instance, "provide").mockImplementation(async (input: any) => input.fn())
    spyOn(SessionPrompt as any, "prompt").mockImplementation(async (input: any) => {
      seen.push(input.sessionID)
      expect(input.parts).toEqual([{ type: "text", text: ResumePrompt }])
      return {} as any
    })

    await autoresume()

    expect(seen.length).toBe(2)
    expect(new Set(seen).size).toBe(2)
  })

  test("honors resume max and resumes newest interrupted sessions first", async () => {
    await using tmp = await tmpdir()
    const ids = await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const list: string[] = []
        for (let i = 0; i < 4; i++) {
          const session = await Session.create({})
          list.push(session.id)
          await seed({
            sessionID: session.id,
            at: 10_000 + i * 100,
            kind: "tool",
          })
        }
        return list
      },
    })

    process.env.OPENCODE_SERVE_RESUME_SCAN_LIMIT = "30"
    process.env.OPENCODE_SERVE_RESUME_MAX = "2"

    const seen: string[] = []
    spyOn(WorkspaceContext, "provide").mockImplementation(async (input: any) => input.fn())
    spyOn(Instance, "provide").mockImplementation(async (input: any) => input.fn())
    spyOn(SessionPrompt as any, "prompt").mockImplementation(async (input: any) => {
      seen.push(input.sessionID)
      return {} as any
    })

    await autoresume()

    expect(seen.length).toBe(2)
    expect(seen[0]).toBe(ids[3])
    expect(seen[1]).toBe(ids[2])
  })
})
