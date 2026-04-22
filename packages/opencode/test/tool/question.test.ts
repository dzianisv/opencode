import { describe, expect, test } from "bun:test"
import { QuestionTool } from "../../src/tool/question"
import { Question } from "../../src/question"
import { SessionID, MessageID } from "../../src/session/schema"
import { Instance } from "../../src/project/instance"
import { tmpdir } from "../fixture/fixture"

const ctx = {
  sessionID: SessionID.make("ses_test-session"),
  messageID: MessageID.make("test-message"),
  callID: "test-call",
  agent: "test-agent",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => {},
  ask: async () => {},
}

async function poll() {
  for (;;) {
    const items = await Question.list()
    if (items[0]) return items[0]
    await new Promise((r) => setTimeout(r, 10))
  }
}

describe("tool.question", () => {
  test("should successfully execute with valid question parameters", async () => {
    await using dir = await tmpdir()
    await Instance.provide({
      directory: dir.path,
      fn: async () => {
        const tool = await QuestionTool.init()
        const questions = [
          {
            question: "What is your favorite color?",
            header: "Color",
            options: [
              { label: "Red", description: "The color of passion" },
              { label: "Blue", description: "The color of sky" },
            ],
            multiple: false,
          },
        ]

        const promise = tool.execute({ questions }, ctx)
        const item = await poll()
        await Question.reply({ requestID: item.id, answers: [["Red"]] })

        const result = await promise
        expect(result.title).toBe("Asked 1 question")
      },
    })
  })

  test("should now pass with a header longer than 12 but less than 30 chars", async () => {
    await using dir = await tmpdir()
    await Instance.provide({
      directory: dir.path,
      fn: async () => {
        const tool = await QuestionTool.init()
        const questions = [
          {
            question: "What is your favorite animal?",
            header: "This Header is Over 12",
            options: [{ label: "Dog", description: "Man's best friend" }],
          },
        ]

        const promise = tool.execute({ questions }, ctx)
        const item = await poll()
        await Question.reply({ requestID: item.id, answers: [["Dog"]] })

        const result = await promise
        expect(result.output).toContain(`"What is your favorite animal?"="Dog"`)
      },
    })
  })

  // intentionally removed the zod validation due to tool call errors, hoping prompting is gonna be good enough
  //   test("should throw an Error for header exceeding 30 characters", async () => {
  //     const tool = await QuestionTool.init()
  //     const questions = [
  //       {
  //         question: "What is your favorite animal?",
  //         header: "This Header is Definitely More Than Thirty Characters Long",
  //         options: [{ label: "Dog", description: "Man's best friend" }],
  //       },
  //     ]
  //     try {
  //       await tool.execute({ questions }, ctx)
  //       // If it reaches here, the test should fail
  //       expect(true).toBe(false)
  //     } catch (e: any) {
  //       expect(e).toBeInstanceOf(Error)
  //       expect(e.cause).toBeInstanceOf(z.ZodError)
  //     }
  //   })

  //   test("should throw an Error for label exceeding 30 characters", async () => {
  //     const tool = await QuestionTool.init()
  //     const questions = [
  //       {
  //         question: "A question with a very long label",
  //         header: "Long Label",
  //         options: [
  //           { label: "This is a very, very, very long label that will exceed the limit", description: "A description" },
  //         ],
  //       },
  //     ]
  //     try {
  //       await tool.execute({ questions }, ctx)
  //       // If it reaches here, the test should fail
  //       expect(true).toBe(false)
  //     } catch (e: any) {
  //       expect(e).toBeInstanceOf(Error)
  //       expect(e.cause).toBeInstanceOf(z.ZodError)
  //     }
  //   })
})
