// E2E test for the /workflow slash command via the HTTP API.
//
// Tests that a workflow file placed in .opencode/workflows/ can be:
//   1. listed via POST /session/:id/command { command: "workflow", arguments: "" }
//   2. executed via POST /session/:id/command { command: "workflow", arguments: "<name> [args]" }
//
// No LLM is required — the test workflow only calls ctx.log() and returns a string.

import { afterEach, describe, expect, mock, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import { Effect } from "effect"
import { WithInstance } from "../../src/project/with-instance"
import { Server } from "../../src/server/server"
import { Session as SessionNs } from "@/session/session"
import type { SessionID } from "../../src/session/schema"
import * as Log from "@opencode-ai/core/util/log"
import { disposeAllInstances, tmpdir } from "../fixture/fixture"

void Log.init({ print: false })

// Resolve @opencode-ai/plugin from the workspace symlink — machine-independent.
const PLUGIN_DIR = fileURLToPath(import.meta.resolve("@opencode-ai/plugin"))

function run<A, E>(fx: Effect.Effect<A, E, SessionNs.Service>) {
  return Effect.runPromise(fx.pipe(Effect.provide(SessionNs.defaultLayer)))
}

const svc = {
  create(input?: SessionNs.CreateInput) {
    return run(SessionNs.Service.use((s) => s.create(input)))
  },
  remove(id: SessionID) {
    return run(SessionNs.Service.use((s) => s.remove(id)))
  },
}

afterEach(async () => {
  mock.restore()
  await disposeAllInstances()
})

async function setupWorkflow(dir: string) {
  const opencodeDir = path.join(dir, ".opencode")
  const workflowDir = path.join(opencodeDir, "workflows")
  const pluginLink = path.join(opencodeDir, "node_modules", "@opencode-ai", "plugin")

  await fs.mkdir(workflowDir, { recursive: true })
  await fs.mkdir(path.dirname(pluginLink), { recursive: true })
  await fs.symlink(PLUGIN_DIR, pluginLink, "dir")

  await Bun.write(
    path.join(workflowDir, "greet.ts"),
    [
      'import { workflow } from "@opencode-ai/plugin"',
      "",
      "export default workflow({",
      '  name: "greet",',
      '  description: "greeter workflow",',
      "  arguments: { name: { type: 'string', description: 'name to greet' } },",
      "  async run(args, ctx) {",
      '    ctx.log(`greeting name=${String(args.name ?? "")}`)' ,
      "    return `Hello, ${String(args.name ?? 'world')}!`",
      "  },",
      "})",
    ].join("\n"),
  )
}

describe("workflow command via HTTP API", () => {
  test("lists workflows via POST /session/:id/command", async () => {
    await using tmp = await tmpdir({ git: true })
    await setupWorkflow(tmp.path)
    await WithInstance.provide({
      directory: tmp.path,
      fn: async () => {
        const session = await svc.create({})
        const app = Server.Default().app

        // Pass directory so InstanceMiddleware resolves the correct project root.
        const res = await app.request(`/session/${session.id}/command`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-opencode-directory": tmp.path },
          body: JSON.stringify({
            command: "workflow",
            arguments: "",
            agent: "build",
            model: "test/test-model",
          }),
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        const text = body.parts?.findLast((p: { type: string; text?: string }) => p.type === "text")?.text ?? ""
        expect(text).toContain("Available workflows:")
        expect(text).toContain("greet")

        await svc.remove(session.id)
      },
    })
  })

  test("executes workflow via POST /session/:id/command", async () => {
    await using tmp = await tmpdir({ git: true })
    await setupWorkflow(tmp.path)
    await WithInstance.provide({
      directory: tmp.path,
      fn: async () => {
        const session = await svc.create({})
        const app = Server.Default().app

        const res = await app.request(`/session/${session.id}/command`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-opencode-directory": tmp.path },
          body: JSON.stringify({
            command: "workflow",
            arguments: "greet name=World",
            agent: "build",
            model: "test/test-model",
          }),
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        const text = body.parts?.findLast((p: { type: string; text?: string }) => p.type === "text")?.text ?? ""
        expect(text).toContain("Workflow greet complete.")
        expect(text).toContain("Hello, World!")
        expect(text).toContain("greeting name=World")

        await svc.remove(session.id)
      },
    })
  })

  test("returns error for unknown workflow", async () => {
    await using tmp = await tmpdir({ git: true })
    await setupWorkflow(tmp.path)
    await WithInstance.provide({
      directory: tmp.path,
      fn: async () => {
        const session = await svc.create({})
        const app = Server.Default().app

        const res = await app.request(`/session/${session.id}/command`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-opencode-directory": tmp.path },
          body: JSON.stringify({
            command: "workflow",
            arguments: "nonexistent",
            agent: "build",
            model: "test/test-model",
          }),
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        const text = body.parts?.findLast((p: { type: string; text?: string }) => p.type === "text")?.text ?? ""
        expect(text).toContain("Workflow not found: nonexistent")

        await svc.remove(session.id)
      },
    })
  })
})
