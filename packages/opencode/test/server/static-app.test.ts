import { describe, expect, test } from "bun:test"
import path from "path"
import { mkdir } from "fs/promises"
import { Server } from "../../src/server/server"
import { Instance } from "../../src/project/instance"
import { Log } from "../../src/util/log"
import { tmpdir } from "../fixture/fixture"

Log.init({ print: false })

async function setup(root: string) {
  await mkdir(path.join(root, "packages/app/dist/assets"), { recursive: true })
  await Bun.write(path.join(root, "packages/app/dist/index.html"), "<!doctype html><title>local app</title>")
  await Bun.write(path.join(root, "packages/app/dist/assets/session-test.js"), "console.log('ok')")
}

async function check<T>(fn: (app: ReturnType<typeof Server.createApp>, root: string) => Promise<T>) {
  await using tmp = await tmpdir()
  await setup(tmp.path)
  const cwd = process.cwd()
  try {
    process.chdir(tmp.path)
    return await fn(Server.createApp({}), tmp.path)
  } finally {
    process.chdir(cwd)
    await Instance.disposeAll()
  }
}

describe("server static app", () => {
  test("serves local asset files from repo app dist", async () => {
    await check(async (app) => {
      const res = await app.request("/assets/session-test.js")
      expect(res.status).toBe(200)
      expect(res.headers.get("content-type")).toContain("javascript")
      expect(await res.text()).toContain("console.log('ok')")
    })
  })

  test("uses SPA fallback for extensionless routes only", async () => {
    await check(async (app) => {
      const res = await app.request("/recent")
      expect(res.status).toBe(200)
      expect(res.headers.get("content-type")).toContain("text/html")
      expect(await res.text()).toContain("<title>local app</title>")
    })
  })

  test("does not return index.html for missing asset files", async () => {
    await check(async (app) => {
      const res = await app.request("/assets/missing.js")
      expect(res.status).toBe(404)
      expect(await res.text()).toBe("Not Found")
    })
  })
})
