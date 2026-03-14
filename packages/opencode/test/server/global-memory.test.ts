import { describe, expect, test } from "bun:test"
import { Server } from "../../src/server/server"
import { Log } from "../../src/util/log"

Log.init({ print: false })

describe("global.memory", () => {
  test("returns process and opencode diagnostics", async () => {
    const app = Server.Default()
    const response = await app.request("/global/memory")
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(typeof body.pid).toBe("number")
    expect(typeof body.rss_bytes).toBe("number")
    expect(typeof body.heap_used_bytes).toBe("number")
    expect(typeof body.instance.size).toBe("number")
    expect(typeof body.session.total).toBe("number")
    expect(typeof body.pty.active).toBe("number")
  })

  test("returns process-tree diagnostics when children=true", async () => {
    const app = Server.Default()
    const response = await app.request("/global/memory?children=true")
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(typeof body.tree?.pid).toBe("number")
    expect(typeof body.tree?.rss_bytes).toBe("number")
    expect(Array.isArray(body.tree?.top)).toBe(true)
  })
})
