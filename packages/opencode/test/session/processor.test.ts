import { describe, expect, test, spyOn } from "bun:test"
import type { Agent } from "../../src/agent/agent"
import { Agent as AgentApi } from "../../src/agent/agent"
import { Instance } from "../../src/project/instance"
import type { Provider } from "../../src/provider/provider"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Session } from "../../src/session"
import { MessageV2 } from "../../src/session/message-v2"
import * as LLMModule from "../../src/session/llm"
import { SessionProcessor } from "../../src/session/processor"
import * as RetryModule from "../../src/session/retry"
import { MessageID } from "../../src/session/schema"
import { Log } from "../../src/util/log"
import { tmpdir } from "../fixture/fixture"

Log.init({ print: false })

type Stream = Awaited<ReturnType<typeof LLMModule.LLM.stream>>

function model() {
  return {
    id: ModelID.make("test-model"),
    providerID: ProviderID.make("test"),
  } as unknown as Provider.Model
}

function user(sessionID: Session.Info["id"]) {
  return {
    id: MessageID.ascending(),
    sessionID,
    role: "user" as const,
    time: { created: Date.now() },
    agent: "build",
    model: {
      providerID: ProviderID.make("test"),
      modelID: ModelID.make("test-model"),
    },
    tools: {},
  } as MessageV2.User
}

function assistant(sessionID: Session.Info["id"], parentID: MessageV2.User["id"], dir: string) {
  return {
    id: MessageID.ascending(),
    sessionID,
    parentID,
    role: "assistant" as const,
    mode: "build",
    agent: "build",
    path: {
      cwd: dir,
      root: dir,
    },
    cost: 0,
    tokens: {
      input: 0,
      output: 0,
      reasoning: 0,
      cache: { read: 0, write: 0 },
    },
    modelID: ModelID.make("test-model"),
    providerID: ProviderID.make("test"),
    time: {
      created: Date.now(),
    },
  } as MessageV2.Assistant
}

function output(values: unknown[]) {
  return {
    fullStream: (async function* () {
      for (const value of values) yield value
    })(),
  } as unknown as Stream
}

async function run(
  fn: (input: {
    agent: Agent.Info
    msg: MessageV2.Assistant
    session: Session.Info
    usr: MessageV2.User
  }) => Promise<void>,
) {
  await using tmp = await tmpdir({ git: true })
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const session = await Session.create({})
      const agent = await AgentApi.get("build")
      const usr = (await Session.updateMessage(user(session.id))) as MessageV2.User
      const msg = (await Session.updateMessage(assistant(session.id, usr.id, tmp.path))) as MessageV2.Assistant
      await fn({ agent, msg, session, usr })
      await Session.remove(session.id)
    },
  })
}

describe("session.processor", () => {
  test("retries unexpected aborts when the session is still active", async () => {
    await run(async ({ agent, msg, session, usr }) => {
      const ctl = new AbortController()
      const stream = spyOn(LLMModule.LLM, "stream")
      const sleep = spyOn(RetryModule.SessionRetry, "sleep").mockResolvedValue()
      let calls = 0

      try {
        stream.mockImplementation(async (): Promise<Stream> => {
          calls++
          if (calls === 1) throw new DOMException("The operation was aborted.", "AbortError")
          return output([{ type: "start" }])
        })

        const result = await SessionProcessor.create({
          assistantMessage: msg,
          sessionID: session.id,
          model: model(),
          abort: ctl.signal,
        }).process({
          user: usr,
          agent,
          abort: ctl.signal,
          sessionID: session.id,
          system: [],
          messages: [],
          tools: {},
          model: model(),
        })

        const stored = await MessageV2.get({ sessionID: session.id, messageID: msg.id })
        if (stored.info.role !== "assistant") throw new Error("expected assistant")
        expect(result).toBe("continue")
        expect(stream).toHaveBeenCalledTimes(2)
        expect(sleep).toHaveBeenCalledTimes(1)
        expect(stored.info.error).toBeUndefined()
        expect(stored.info.time.completed).toBeDefined()
      } finally {
        stream.mockRestore()
        sleep.mockRestore()
      }
    })
  })

  test("stops on aborts after session cancellation", async () => {
    await run(async ({ agent, msg, session, usr }) => {
      const ctl = new AbortController()
      ctl.abort()
      const stream = spyOn(LLMModule.LLM, "stream")
      const sleep = spyOn(RetryModule.SessionRetry, "sleep").mockResolvedValue()

      try {
        stream.mockImplementation(async (): Promise<Stream> => {
          throw new DOMException("The operation was aborted.", "AbortError")
        })

        const result = await SessionProcessor.create({
          assistantMessage: msg,
          sessionID: session.id,
          model: model(),
          abort: ctl.signal,
        }).process({
          user: usr,
          agent,
          abort: ctl.signal,
          sessionID: session.id,
          system: [],
          messages: [],
          tools: {},
          model: model(),
        })

        const stored = await MessageV2.get({ sessionID: session.id, messageID: msg.id })
        if (stored.info.role !== "assistant") throw new Error("expected assistant")
        expect(result).toBe("stop")
        expect(stream).toHaveBeenCalledTimes(1)
        expect(sleep).not.toHaveBeenCalled()
        expect(stored.info.error?.name).toBe("MessageAbortedError")
      } finally {
        stream.mockRestore()
        sleep.mockRestore()
      }
    })
  })
})
