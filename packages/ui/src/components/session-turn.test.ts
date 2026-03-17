import { describe, expect, test } from "bun:test"
import type { AssistantMessage, Part } from "@opencode-ai/sdk/v2/client"
import { abortCard } from "./session-turn-state"

function assistant(id: string, error?: AssistantMessage["error"], completed = 1): AssistantMessage {
  return {
    id,
    sessionID: "ses_1",
    role: "assistant",
    time: {
      created: 0,
      ...(completed ? { completed } : {}),
    },
    error,
    parentID: "msg_user",
    modelID: "test",
    providerID: "test",
    mode: "build",
    agent: "build",
    path: { cwd: "/", root: "/" },
    cost: 0,
    tokens: {
      input: 0,
      output: 0,
      reasoning: 0,
      cache: { read: 0, write: 0 },
    },
  } as AssistantMessage
}

function text(messageID: string, value: string): Part {
  return {
    id: `part_${messageID}_text`,
    sessionID: "ses_1",
    messageID,
    type: "text",
    text: value,
  } as Part
}

function reasoning(messageID: string, value: string): Part {
  return {
    id: `part_${messageID}_reasoning`,
    sessionID: "ses_1",
    messageID,
    type: "reasoning",
    text: value,
    time: { start: 0 },
  } as Part
}

function aborted(source: "server_restart" | "user_cancel" | "client_disconnect" | "timeout" | "unknown") {
  return {
    name: "MessageAbortedError" as const,
    data: {
      message: "The operation was aborted.",
      source,
    },
  }
}

describe("abortCard", () => {
  test("returns the abort error when a completed turn has no visible assistant content", () => {
    expect(abortCard([assistant("msg_assistant", aborted("server_restart"))], { msg_assistant: [] }, true)).toEqual(
      aborted("server_restart"),
    )
  })

  test("does not return the abort error when the turn already has visible text", () => {
    expect(
      abortCard(
        [assistant("msg_assistant", aborted("user_cancel"))],
        {
          msg_assistant: [text("msg_assistant", "partial answer")],
        },
        true,
      ),
    ).toBeUndefined()
  })

  test("treats reasoning summaries as visible content when enabled", () => {
    expect(
      abortCard(
        [assistant("msg_assistant", aborted("timeout"))],
        {
          msg_assistant: [reasoning("msg_assistant", "thinking")],
        },
        true,
      ),
    ).toBeUndefined()

    expect(
      abortCard(
        [assistant("msg_assistant", aborted("timeout"))],
        {
          msg_assistant: [reasoning("msg_assistant", "thinking")],
        },
        false,
      ),
    ).toEqual(aborted("timeout"))
  })
})
