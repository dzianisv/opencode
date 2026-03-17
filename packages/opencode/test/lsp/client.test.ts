import { describe, expect, test, beforeEach } from "bun:test"
import path from "path"
import fs from "fs/promises"
import { pathToFileURL } from "url"
import { LSPClient } from "../../src/lsp/client"
import { LSPServer } from "../../src/lsp/server"
import { Instance } from "../../src/project/instance"
import { Log } from "../../src/util/log"
import { tmpdir } from "../fixture/fixture"
import { Filesystem } from "../../src/util/filesystem"

// Minimal fake LSP server that speaks JSON-RPC over stdio
function spawnFakeServer() {
  const { spawn } = require("child_process")
  const serverPath = path.join(__dirname, "../fixture/lsp/fake-lsp-server.js")
  return {
    process: spawn(process.execPath, [serverPath], {
      stdio: "pipe",
    }),
  }
}

async function waitFor(fn: () => boolean, timeout = 500) {
  const start = Date.now()
  while (!fn()) {
    if (Date.now() - start > timeout) return false
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  return true
}

describe("LSPClient interop", () => {
  beforeEach(async () => {
    await Log.init({ print: true })
  })

  test("handles workspace/workspaceFolders request", async () => {
    const handle = spawnFakeServer() as any

    const client = await Instance.provide({
      directory: process.cwd(),
      fn: () =>
        LSPClient.create({
          serverID: "fake",
          server: handle as unknown as LSPServer.Handle,
          root: process.cwd(),
        }),
    })

    await client.connection.sendNotification("test/trigger", {
      method: "workspace/workspaceFolders",
    })

    await new Promise((r) => setTimeout(r, 100))

    expect(client.connection).toBeDefined()

    await client.shutdown()
  })

  test("handles client/registerCapability request", async () => {
    const handle = spawnFakeServer() as any

    const client = await Instance.provide({
      directory: process.cwd(),
      fn: () =>
        LSPClient.create({
          serverID: "fake",
          server: handle as unknown as LSPServer.Handle,
          root: process.cwd(),
        }),
    })

    await client.connection.sendNotification("test/trigger", {
      method: "client/registerCapability",
    })

    await new Promise((r) => setTimeout(r, 100))

    expect(client.connection).toBeDefined()

    await client.shutdown()
  })

  test("handles client/unregisterCapability request", async () => {
    const handle = spawnFakeServer() as any

    const client = await Instance.provide({
      directory: process.cwd(),
      fn: () =>
        LSPClient.create({
          serverID: "fake",
          server: handle as unknown as LSPServer.Handle,
          root: process.cwd(),
        }),
    })

    await client.connection.sendNotification("test/trigger", {
      method: "client/unregisterCapability",
    })

    await new Promise((r) => setTimeout(r, 100))

    expect(client.connection).toBeDefined()

    await client.shutdown()
  })

  test("evicts old open files when cap is reached", async () => {
    const original = process.env.OPENCODE_LSP_OPEN_FILE_MAX
    process.env.OPENCODE_LSP_OPEN_FILE_MAX = "1"
    await using tmp = await tmpdir()
    const a = path.join(tmp.path, "a.ts")
    const b = path.join(tmp.path, "b.ts")
    await fs.writeFile(a, "export const a = 1\n")
    await fs.writeFile(b, "export const b = 2\n")

    try {
      const handle = spawnFakeServer() as any
      let stderr = ""
      handle.process.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString()
      })

      const client = await Instance.provide({
        directory: tmp.path,
        fn: () =>
          LSPClient.create({
            serverID: "fake",
            server: handle as unknown as LSPServer.Handle,
            root: tmp.path,
          }),
      })

      await client.notify.open({ path: a })
      await client.notify.open({ path: b })

      const closed = `didClose ${pathToFileURL(a).href}`
      expect(await waitFor(() => stderr.includes(closed))).toBe(true)
      await client.shutdown()
    } finally {
      if (original === undefined) delete process.env.OPENCODE_LSP_OPEN_FILE_MAX
      else process.env.OPENCODE_LSP_OPEN_FILE_MAX = original
    }
  })

  test("evicts old diagnostics when cap is reached", async () => {
    const original = process.env.OPENCODE_LSP_DIAGNOSTIC_MAX
    process.env.OPENCODE_LSP_DIAGNOSTIC_MAX = "1"
    await using tmp = await tmpdir()
    const a = path.join(tmp.path, "a.ts")
    const b = path.join(tmp.path, "b.ts")
    await fs.writeFile(a, "export const a = 1\n")
    await fs.writeFile(b, "export const b = 2\n")

    try {
      const handle = spawnFakeServer() as any
      const client = await Instance.provide({
        directory: tmp.path,
        fn: () =>
          LSPClient.create({
            serverID: "fake",
            server: handle as unknown as LSPServer.Handle,
            root: tmp.path,
          }),
      })

      await client.connection.sendNotification("test/diagnostics", {
        uri: pathToFileURL(a).href,
        message: "a",
      })
      await client.connection.sendNotification("test/diagnostics", {
        uri: pathToFileURL(b).href,
        message: "b",
      })

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(client.diagnostics.size).toBe(1)
      expect(client.diagnostics.has(Filesystem.normalizePath(b))).toBe(true)
      await client.shutdown()
    } finally {
      if (original === undefined) delete process.env.OPENCODE_LSP_DIAGNOSTIC_MAX
      else process.env.OPENCODE_LSP_DIAGNOSTIC_MAX = original
    }
  })
})
