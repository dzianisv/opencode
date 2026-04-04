import { afterEach, expect, test } from "bun:test"
import { Instance } from "../../src/project/instance"
import { Log } from "../../src/util/log"
import { tmpdir } from "../fixture/fixture"

Log.init({ print: false })

afterEach(async () => {
  await Instance.disposeAll()
})

test("instance state disposers can read Instance.directory during teardown", async () => {
  await using dir = await tmpdir({ git: true })
  let disposedDirectory: string | undefined

  await Instance.provide({
    directory: dir.path,
    fn: async () => {
      const state = Instance.state(
        () => ({}),
        async () => {
          disposedDirectory = Instance.directory
        },
      )
      state()
    },
  })

  await Instance.disposeAll()

  expect(disposedDirectory).toBe(dir.path)
})
