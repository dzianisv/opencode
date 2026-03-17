import { afterEach, beforeEach, expect, mock, test } from "bun:test"

const hit = {
  transport: 0,
  connect: 0,
  list: 0,
  prompt: 0,
}

mock.module("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: class MockStdio {
    pid = 424242
    stderr = {
      on() {},
    }

    constructor(_opts: unknown) {
      hit.transport += 1
    }

    async start() {}
  },
}))

mock.module("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: class MockClient {
    async connect(transport: { start?: () => Promise<void> | void }) {
      hit.connect += 1
      await transport.start?.()
    }

    setNotificationHandler() {}

    async listTools() {
      hit.list += 1
      return { tools: [] }
    }

    async listPrompts() {
      hit.prompt += 1
      return {
        prompts: [
          {
            name: "ping",
            description: "ping",
            arguments: [],
          },
        ],
      }
    }

    async close() {}
  },
}))

const { MCP } = await import("../../src/mcp/index")
const { Command } = await import("../../src/command")
const { Instance } = await import("../../src/project/instance")
const { tmpdir } = await import("../fixture/fixture")

beforeEach(() => {
  hit.transport = 0
  hit.connect = 0
  hit.list = 0
  hit.prompt = 0
})

afterEach(async () => {
  await Instance.disposeAll()
})

test("status and command list do not eagerly spawn MCP clients", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        `${dir}/opencode.json`,
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          mcp: {
            local_probe: {
              type: "local",
              command: ["node", "-e", "process.exit(0)"],
            },
          },
        }),
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const status = await MCP.status()
      expect(status.local_probe?.status).toBe("disabled")
      expect(hit.transport).toBe(0)
      expect(hit.connect).toBe(0)

      const cmds = await Command.list()
      expect(cmds.some((item) => item.source === "mcp")).toBe(false)
      expect(hit.transport).toBe(0)
      expect(hit.connect).toBe(0)
      expect(hit.list).toBe(0)
      expect(hit.prompt).toBe(0)
    },
  })
})

test("tools do not auto-connect disabled-by-default MCP clients", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        `${dir}/opencode.json`,
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          mcp: {
            local_probe: {
              type: "local",
              command: ["node", "-e", "process.exit(0)"],
            },
          },
        }),
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const tools = await MCP.tools()
      expect(Object.keys(tools).length).toBe(0)
      expect(hit.transport).toBe(0)
      expect(hit.connect).toBe(0)
      expect(hit.list).toBe(0)
    },
  })
})

test("tools connect MCP clients with enabled=true", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        `${dir}/opencode.json`,
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          mcp: {
            local_probe: {
              type: "local",
              command: ["node", "-e", "process.exit(0)"],
              enabled: true,
            },
          },
        }),
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const tools = await MCP.tools()
      expect(Object.keys(tools).length).toBe(0)
      expect(hit.transport).toBe(1)
      expect(hit.connect).toBe(1)
      expect(hit.list).toBeGreaterThan(0)
    },
  })
})

test("connected MCP clients are reflected in command list", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        `${dir}/opencode.json`,
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          mcp: {
            local_probe: {
              type: "local",
              command: ["node", "-e", "process.exit(0)"],
            },
          },
        }),
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      await MCP.connect("local_probe")
      const cmds = await Command.list()
      expect(cmds.some((item) => item.source === "mcp" && item.name === "local_probe:ping")).toBe(true)
      expect(hit.prompt).toBeGreaterThan(0)
    },
  })
})
