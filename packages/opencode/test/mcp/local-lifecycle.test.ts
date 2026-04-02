import { afterEach, beforeEach, expect, mock, test } from "bun:test"
import { EventEmitter } from "node:events"

let mode: "hang" | "ok" = "ok"
const transports: MockTransport[] = []

class MockTransport {
  stderr = new EventEmitter()
  onclose?: () => void
  onerror?: (error: Error) => void
  onmessage?: (message: unknown) => void
  pid = null
  closed = 0

  constructor(_opts: unknown) {
    transports.push(this)
  }

  async start() {
    if (mode === "hang") {
      await new Promise<void>(() => {})
    }
  }

  async close() {
    this.closed += 1
    this.onclose?.()
  }

  async send(_message: unknown) {}
}

class MockClient {
  transport?: MockTransport

  constructor(_info: unknown) {}

  async connect(transport: MockTransport) {
    this.transport = transport
    await transport.start()
  }

  setNotificationHandler(_schema: unknown, _handler: unknown) {}

  async close() {
    await this.transport?.close()
  }

  async listTools() {
    return { tools: [] }
  }
}

mock.module("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: MockClient,
}))

mock.module("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: MockTransport,
}))

const { MCP } = await import("../../src/mcp/index")
const { Instance } = await import("../../src/project/instance")
const { tmpdir } = await import("../fixture/fixture")

beforeEach(() => {
  mode = "ok"
  transports.length = 0
})

afterEach(async () => {
  await Instance.disposeAll()
  await MCP.closeAll()
  mock.restore()
})

test("timed out local mcp startup closes the spawned transport", async () => {
  mode = "hang"

  await using tmp = await tmpdir({
    config: {
      mcp: {
        slow: {
          type: "local",
          command: ["node", "slow"],
          timeout: 5,
          enabled: true,
        },
      },
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const status = await MCP.status()
      const clients = await MCP.clients()
      expect(status.slow?.status).toBe("failed")
      expect(clients.slow).toBeUndefined()
    },
  })

  expect(transports).toHaveLength(1)
  expect(transports[0].closed).toBe(1)
})

test("disposing one instance does not close a shared local mcp still used elsewhere", async () => {
  await using a = await tmpdir({
    config: {
      mcp: {
        shared: {
          type: "local",
          command: ["node", "shared"],
          timeout: 5,
          enabled: true,
        },
      },
    },
  })
  await using b = await tmpdir({
    config: {
      mcp: {
        shared: {
          type: "local",
          command: ["node", "shared"],
          timeout: 5,
          enabled: true,
        },
      },
    },
  })

  await Instance.provide({
    directory: a.path,
    fn: async () => {
      const clients = await MCP.clients()
      expect(clients.shared).toBeDefined()
    },
  })

  await Instance.provide({
    directory: b.path,
    fn: async () => {
      const clients = await MCP.clients()
      expect(clients.shared).toBeDefined()
    },
  })

  expect(transports).toHaveLength(1)
  expect(transports[0].closed).toBe(0)

  await Instance.provide({
    directory: a.path,
    fn: async () => {
      await Instance.dispose()
    },
  })

  expect(transports[0].closed).toBe(0)

  await Instance.provide({
    directory: b.path,
    fn: async () => {
      const clients = await MCP.clients()
      expect(clients.shared).toBeDefined()
      await Instance.dispose()
    },
  })

  expect(transports[0].closed).toBe(1)
})
