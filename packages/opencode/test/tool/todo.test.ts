import { describe, expect, test } from "bun:test"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { MessageID, SessionID } from "../../src/session/schema"
import { Todo } from "../../src/session/todo"
import { TodoWriteTool } from "../../src/tool/todo"
import { tmpdir } from "../fixture/fixture"

const ctx = {
  sessionID: SessionID.make("ses_test"),
  messageID: MessageID.make("message"),
  callID: "",
  agent: "build",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => {},
  ask: async () => {},
}

describe("tool.todo", () => {
  test("returns a summary instead of echoing the full todo list", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const session = await Session.create({})
        const tool = await TodoWriteTool.init()
        const todos = [
          { content: "a", status: "completed", priority: "high" },
          { content: "b", status: "in_progress", priority: "medium" },
          { content: "c", status: "pending", priority: "low" },
        ]
        const input = { ...ctx, sessionID: session.id }

        const result = await tool.execute({ todos }, input)

        expect(result.title).toBe("2 todos")
        expect(result.output).toBe("Updated: 1 completed, 1 in progress, 1 pending")
        expect(result.metadata.todos).toEqual(todos)
        expect(Todo.get(session.id)).toEqual(todos)
        await Session.remove(session.id)
      },
    })
  })
})
