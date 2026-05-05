import { afterEach, describe, expect, test } from "bun:test"
import { SchedulerStore } from "../../src/scheduler/store"
import { tmpdir } from "../fixture/fixture"
import fs from "fs/promises"
import path from "path"

const original = process.env.OPENCODE_TEST_HOME

afterEach(() => {
  if (original === undefined) delete process.env.OPENCODE_TEST_HOME
  else process.env.OPENCODE_TEST_HOME = original
})

describe("scheduler.store", () => {
  test("add/list/remove lifecycle", async () => {
    await using tmp = await tmpdir()
    process.env.OPENCODE_TEST_HOME = tmp.path
    await fs.mkdir(path.dirname(SchedulerStore.file()), { recursive: true })
    await Bun.write(SchedulerStore.file(), "[]")

    const added = await SchedulerStore.add({
      schedule: "*/5 * * * * *",
      prompt: "hello",
      enabled: true,
    })

    const list = await SchedulerStore.list()
    expect(list.length).toBe(1)
    expect(list[0].id).toBe(added.id)

    const ok = await SchedulerStore.remove(added.id)
    expect(ok).toBe(true)
    expect((await SchedulerStore.list()).length).toBe(0)
  })

  test("setEnabled updates a job", async () => {
    await using tmp = await tmpdir()
    process.env.OPENCODE_TEST_HOME = tmp.path
    await fs.mkdir(path.dirname(SchedulerStore.file()), { recursive: true })
    await Bun.write(SchedulerStore.file(), "[]")

    const job = await SchedulerStore.add({
      schedule: "*/5 * * * * *",
      prompt: "hello",
      enabled: true,
    })

    const disabled = await SchedulerStore.setEnabled(job.id, false)
    expect(disabled?.enabled).toBe(false)
  })
})
