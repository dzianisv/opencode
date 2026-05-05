import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { CronTool } from "../../src/tool/cron"
import { Instance } from "../../src/project/instance"
import { SessionID, MessageID } from "../../src/session/schema"
import { tmpdir } from "../fixture/fixture"
import { SchedulerStore } from "../../src/scheduler/store"
import { SchedulerRunner } from "../../src/scheduler/runner"
import fs from "fs/promises"
import path from "path"
import type { Tool } from "../../src/tool/tool"

afterEach(async () => {
  await Instance.disposeAll()
  mock.restore()
})

const ctx: Tool.Context = {
  sessionID: SessionID.make("session_cron"),
  messageID: MessageID.make("message_cron"),
  callID: "call_cron",
  agent: "build",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => {},
  ask: async () => {},
}

describe("tool.cron", () => {
  test("add/list/remove", async () => {
    await using tmp = await tmpdir()
    process.env.OPENCODE_TEST_HOME = tmp.path
    await fs.mkdir(path.dirname(SchedulerStore.file()), { recursive: true })
    await Bun.write(SchedulerStore.file(), "[]")

      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const notify = spyOn(SchedulerRunner, "notify")
          const tool = await CronTool.init()
          const add = await tool.execute(
            {
              action: "add",
            schedule: "*/5 * * * * *",
            prompt: "run me",
          },
          ctx,
        )
        expect(add.title.startsWith("tool_")).toBe(true)

        const list = await tool.execute({ action: "list" }, ctx)
        expect(list.output).toContain("run me")

          await tool.execute({ action: "remove", id: add.title }, ctx)
          const after = await tool.execute({ action: "list" }, ctx)
          expect(after.output).not.toContain("run me")
          expect(notify).toHaveBeenCalledTimes(2)
        },
      })
  })
})
