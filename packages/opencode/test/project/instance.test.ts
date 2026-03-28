import { afterEach, describe, expect, test } from "bun:test"
import { Instance } from "../../src/project/instance"
import { Log } from "../../src/util/log"
import { tmpdir } from "../fixture/fixture"

Log.init({ print: false })

afterEach(async () => {
  delete process.env.OPENCODE_INSTANCE_MAX
  delete process.env.OPENCODE_INSTANCE_IDLE_MS
  await Instance.disposeAll()
})

describe("instance cache", () => {
  test("caps retained idle instances by OPENCODE_INSTANCE_MAX", async () => {
    process.env.OPENCODE_INSTANCE_MAX = "2"

    await using one = await tmpdir({ git: true })
    await using two = await tmpdir({ git: true })
    await using three = await tmpdir({ git: true })
    await using four = await tmpdir({ git: true })

    for (const item of [one, two, three, four]) {
      await Instance.provide({
        directory: item.path,
        fn: () => null,
      })
    }

    await Bun.sleep(50)

    const stats = Instance.stats()
    expect(stats.size).toBe(2)
    expect(stats.entries.map((item) => item.directory)).toEqual([three.path, four.path])
    expect(stats.entries.every((item) => item.refs === 0)).toBe(true)
  })
})
