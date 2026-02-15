import { describe, expect, test } from "bun:test"
import path from "path"
import fs from "fs/promises"
import { tmpdir } from "../fixture/fixture"
import { Instance } from "../../src/project/instance"
import { ToolRegistry } from "../../src/tool/registry"

describe("tool.registry", () => {
  const timeout = 20_000

  test(
    "loads tools from .opencode/tool (singular)",
    async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          const opencodeDir = path.join(dir, ".opencode")
          await fs.mkdir(opencodeDir, { recursive: true })

          const toolDir = path.join(opencodeDir, "tool")
          await fs.mkdir(toolDir, { recursive: true })

          await Bun.write(
            path.join(toolDir, "hello.ts"),
            [
              "export default {",
              "  description: 'hello tool',",
              "  args: {},",
              "  execute: async () => {",
              "    return 'hello world'",
              "  },",
              "}",
              "",
            ].join("\n"),
          )
        },
      })

      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const ids = await ToolRegistry.ids()
          expect(ids).toContain("hello")
        },
      })
    },
    timeout,
  )

  test(
    "loads tools from .opencode/tools (plural)",
    async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          const opencodeDir = path.join(dir, ".opencode")
          await fs.mkdir(opencodeDir, { recursive: true })

          const toolsDir = path.join(opencodeDir, "tools")
          await fs.mkdir(toolsDir, { recursive: true })

          await Bun.write(
            path.join(toolsDir, "hello.ts"),
            [
              "export default {",
              "  description: 'hello tool',",
              "  args: {},",
              "  execute: async () => {",
              "    return 'hello world'",
              "  },",
              "}",
              "",
            ].join("\n"),
          )
        },
      })

      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const ids = await ToolRegistry.ids()
          expect(ids).toContain("hello")
        },
      })
    },
    timeout,
  )

  test(
    "loads tools with external dependencies without crashing",
    async () => {
      const prev = process.env.OPENCODE_TEST_DISABLE_DEP_INSTALL
      await using tmp = await tmpdir({
        init: async (dir) => {
          const opencodeDir = path.join(dir, ".opencode")
          await fs.mkdir(opencodeDir, { recursive: true })

          const toolsDir = path.join(opencodeDir, "tools")
          await fs.mkdir(toolsDir, { recursive: true })

          process.env.OPENCODE_TEST_DISABLE_DEP_INSTALL = "1"
          await Bun.write(
            path.join(opencodeDir, "package.json"),
            JSON.stringify({
              name: "custom-tools",
              dependencies: {
                "@opencode-ai/plugin": "^0.0.0",
                cowsay: "^1.6.0",
              },
            }),
          )

          const nodeModulesDir = path.join(opencodeDir, "node_modules", "cowsay")
          await fs.mkdir(nodeModulesDir, { recursive: true })
          await Bun.write(
            path.join(nodeModulesDir, "package.json"),
            JSON.stringify({
              name: "cowsay",
              version: "1.6.0",
              type: "module",
            }),
          )
          await Bun.write(
            path.join(nodeModulesDir, "index.js"),
            ["export const say = ({ text }) => `cowsay ${text}`", ""].join("\n"),
          )

          await Bun.write(
            path.join(toolsDir, "cowsay.ts"),
            [
              "import { say } from 'cowsay'",
              "export default {",
              "  description: 'tool that imports cowsay at top level',",
              "  args: { text: { type: 'string' } },",
              "  execute: async ({ text }: { text: string }) => {",
              "    return say({ text })",
              "  },",
              "}",
              "",
            ].join("\n"),
          )
        },
        dispose: async () => {
          if (prev === undefined) delete process.env.OPENCODE_TEST_DISABLE_DEP_INSTALL
          else process.env.OPENCODE_TEST_DISABLE_DEP_INSTALL = prev
        },
      })

      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const ids = await ToolRegistry.ids()
          expect(ids).toContain("cowsay")
        },
      })
    },
    timeout,
  )
})
