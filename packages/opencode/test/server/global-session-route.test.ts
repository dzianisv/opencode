import { describe, expect, test } from "bun:test"
import { Server } from "../../src/server/server"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { Log } from "../../src/util/log"
import { tmpdir } from "../fixture/fixture"

Log.init({ print: false })

describe("global.session route", () => {
  test("returns x-next-cursor and respects cursor pagination", async () => {
    await using tmp = await tmpdir({ git: true })

    const first = await Instance.provide({
      directory: tmp.path,
      fn: async () => Session.create({ title: "route-page-one" }),
    })
    await new Promise((resolve) => setTimeout(resolve, 5))
    const second = await Instance.provide({
      directory: tmp.path,
      fn: async () => Session.create({ title: "route-page-two" }),
    })

    const app = Server.Default()

    const page1 = await app.request("/global/session?roots=true&limit=1")
    expect(page1.status).toBe(200)
    const firstBody = (await page1.json()) as Array<{ id: string; time: { updated: number } }>
    expect(firstBody).toHaveLength(1)
    expect(firstBody[0]?.id).toBe(second.id)

    const cursor = page1.headers.get("x-next-cursor")
    expect(cursor).toBeTruthy()

    const page2 = await app.request(`/global/session?roots=true&limit=1&cursor=${encodeURIComponent(cursor!)}`)
    expect(page2.status).toBe(200)
    const secondBody = (await page2.json()) as Array<{ id: string }>
    expect(secondBody).toHaveLength(1)
    expect(secondBody[0]?.id).toBe(first.id)
  })
})
