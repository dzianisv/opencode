import { afterEach, describe, expect } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import { Effect, Layer } from "effect"
import { SessionPrompt } from "@/session/prompt"
import { Session } from "@/session/session"
import { disposeAllInstances, TestInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

// Resolve @opencode-ai/plugin from the workspace — uses the bun workspace symlink
// so the path works on any machine without hardcoding.
const PLUGIN_DIR = fileURLToPath(import.meta.resolve("@opencode-ai/plugin"))

const it = testEffect(Layer.mergeAll(SessionPrompt.defaultLayer, Session.defaultLayer))

afterEach(async () => {
  await disposeAllInstances()
})

describe("workflow command", () => {
  it.instance("lists and runs project workflows", () =>
    Effect.gen(function* () {
      const test = yield* TestInstance
      const opencodeDir = path.join(test.directory, ".opencode")
      const workflowDir = path.join(opencodeDir, "workflows")
      const pluginLink = path.join(opencodeDir, "node_modules", "@opencode-ai", "plugin")
      yield* Effect.promise(() => fs.mkdir(workflowDir, { recursive: true }))
      yield* Effect.promise(() => fs.mkdir(path.dirname(pluginLink), { recursive: true }))
      yield* Effect.promise(() => fs.symlink(PLUGIN_DIR, pluginLink, "dir"))
      yield* Effect.promise(() =>
        Bun.write(
          path.join(workflowDir, "hello.ts"),
          [
            'import { workflow } from "@opencode-ai/plugin"',
            "",
            "export default workflow({",
            '  name: "hello",',
            '  description: "test workflow",',
            "  arguments: { topic: { type: 'string', description: 'topic' } },",
            "  async run(args, ctx) {",
            '    ctx.log(`topic=${String(args.topic ?? "")}`)',
            "    return `done ${String(args.topic ?? '')}`",
            "  },",
            "})",
            "",
          ].join("\n"),
        ),
      )

      const sessions = yield* Session.Service
      const session = yield* sessions.create()
      const prompt = yield* SessionPrompt.Service

      const listed = yield* prompt.command({
        sessionID: session.id,
        command: "workflow",
        arguments: "",
        agent: "build",
        model: "test/test-model",
      })
      expect(listed.parts.findLast((part) => part.type === "text")?.text ?? "").toContain("Available workflows:")

      const result = yield* prompt.command({
        sessionID: session.id,
        command: "workflow",
        arguments: "hello topic=world",
        agent: "build",
        model: "test/test-model",
      })
      const text = result.parts.findLast((part) => part.type === "text")?.text ?? ""
      expect(text).toContain("Workflow hello complete.")
      expect(text).toContain("done world")
      expect(text).toContain("topic=world")
    }),
  )
})
