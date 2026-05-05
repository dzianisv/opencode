import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { SchedulerRunner } from "../../src/scheduler/runner"
import { SchedulerStore } from "../../src/scheduler/store"
import { SessionPrompt } from "../../src/session/prompt"
import { Session } from "../../src/session"
import { Provider } from "../../src/provider/provider"
import { tmpdir } from "../fixture/fixture"
import fs from "fs/promises"
import path from "path"
import { ProviderID, ModelID } from "../../src/provider/schema"
import { Config } from "../../src/config/config"
import { Cron } from "croner"

const original = process.env.OPENCODE_TEST_HOME

afterEach(async () => {
  if (original === undefined) delete process.env.OPENCODE_TEST_HOME
  else process.env.OPENCODE_TEST_HOME = original
  mock.restore()
  await SchedulerRunner.stop()
})

describe("scheduler.runner", () => {
  test("runNow executes prompt", async () => {
    await using tmp = await tmpdir()
    process.env.OPENCODE_TEST_HOME = tmp.path
    await fs.mkdir(path.dirname(SchedulerStore.file()), { recursive: true })
    await Bun.write(SchedulerStore.file(), "[]")

    const job = await SchedulerStore.add({
      schedule: "*/5 * * * * *",
      prompt: "hello",
      enabled: true,
    })

    spyOn(Provider, "defaultModel").mockResolvedValue({
      providerID: ProviderID.make("opencode"),
      modelID: ModelID.make("gpt-5-mini"),
    })
    spyOn(Session, "create").mockResolvedValue({ id: "session_1" } as unknown as Awaited<ReturnType<typeof Session.create>>)
    const prompt = spyOn(SessionPrompt, "prompt").mockResolvedValue(
      { parts: [{ type: "text", text: "done" }] } as unknown as Awaited<ReturnType<typeof SessionPrompt.prompt>>,
    )

    const ok = await SchedulerRunner.runNow(job.id)
    expect(ok).toBe(true)
    expect(prompt).toHaveBeenCalledTimes(1)
  })

  test("start uses setTimeout wake loop", async () => {
    await using tmp = await tmpdir()
    process.env.OPENCODE_TEST_HOME = tmp.path
    await fs.mkdir(path.dirname(SchedulerStore.file()), { recursive: true })
    await Bun.write(SchedulerStore.file(), "[]")

    await SchedulerStore.add({
      schedule: "0 0 1 1 * *",
      prompt: "future",
      enabled: true,
    })

    const timeout = spyOn(globalThis, "setTimeout")
    const interval = spyOn(globalThis, "setInterval")
    spyOn(Config, "get").mockResolvedValue({
      scheduler: {
        enabled: true,
        heartbeat: { enabled: true, interval: "30m" },
        maxConcurrent: 1,
      },
    } as unknown as Awaited<ReturnType<typeof Config.get>>)

    await SchedulerRunner.start()
    await SchedulerRunner.stop()

    expect(timeout).toHaveBeenCalled()
    expect(interval).not.toHaveBeenCalled()
  })

  test("timer wake runs due jobs without notify", async () => {
    await using tmp = await tmpdir()
    process.env.OPENCODE_TEST_HOME = tmp.path
    await fs.mkdir(path.dirname(SchedulerStore.file()), { recursive: true })
    await Bun.write(SchedulerStore.file(), "[]")

    await SchedulerStore.add({
      schedule: "* * * * * *",
      prompt: "tick",
      enabled: true,
    })

    spyOn(Config, "get").mockResolvedValue({
      scheduler: {
        enabled: true,
        heartbeat: { enabled: true, interval: "30m" },
        maxConcurrent: 1,
      },
    } as unknown as Awaited<ReturnType<typeof Config.get>>)
    spyOn(Provider, "defaultModel").mockResolvedValue({
      providerID: ProviderID.make("opencode"),
      modelID: ModelID.make("gpt-5-mini"),
    })
    spyOn(Session, "create").mockResolvedValue({ id: "session_1" } as unknown as Awaited<ReturnType<typeof Session.create>>)
    const prompt = spyOn(SessionPrompt, "prompt").mockResolvedValue(
      { parts: [{ type: "text", text: "done" }] } as unknown as Awaited<ReturnType<typeof SessionPrompt.prompt>>,
    )

    await SchedulerRunner.start()
    const end = Date.now() + 2200
    while (Date.now() < end && prompt.mock.calls.length === 0) {
      await Bun.sleep(50)
    }
    await SchedulerRunner.stop()

    expect(prompt).toHaveBeenCalled()
  })

  test("notify wakes runner and coalesces", async () => {
    await using tmp = await tmpdir()
    process.env.OPENCODE_TEST_HOME = tmp.path
    await fs.mkdir(path.dirname(SchedulerStore.file()), { recursive: true })
    await Bun.write(SchedulerStore.file(), "[]")

    const timeout = spyOn(globalThis, "setTimeout")
    spyOn(Config, "get").mockResolvedValue({
      scheduler: {
        enabled: true,
        heartbeat: { enabled: true, interval: "30m" },
        maxConcurrent: 1,
      },
    } as unknown as Awaited<ReturnType<typeof Config.get>>)

    SchedulerRunner.notify()
    expect(timeout).not.toHaveBeenCalled()

    await SchedulerRunner.start()
    expect(timeout).not.toHaveBeenCalled()

    SchedulerRunner.notify()
    SchedulerRunner.notify()
    expect(timeout).toHaveBeenCalledTimes(1)
  })

  test("skips stale queued job removed after enqueue", async () => {
    await using tmp = await tmpdir()
    process.env.OPENCODE_TEST_HOME = tmp.path
    await fs.mkdir(path.dirname(SchedulerStore.file()), { recursive: true })
    await Bun.write(SchedulerStore.file(), "[]")

    const first = await SchedulerStore.add({
      schedule: "* * * * * *",
      prompt: "first",
      enabled: true,
    })
    const second = await SchedulerStore.add({
      schedule: "* * * * * *",
      prompt: "second",
      enabled: true,
    })

    spyOn(Config, "get").mockResolvedValue({
      scheduler: {
        enabled: true,
        heartbeat: { enabled: true, interval: "30m" },
        maxConcurrent: 1,
      },
    } as unknown as Awaited<ReturnType<typeof Config.get>>)
    spyOn(Provider, "defaultModel").mockResolvedValue({
      providerID: ProviderID.make("opencode"),
      modelID: ModelID.make("gpt-5-mini"),
    })
    spyOn(Session, "create").mockResolvedValue({ id: "session_1" } as unknown as Awaited<ReturnType<typeof Session.create>>)
    spyOn(Cron.prototype, "nextRun").mockImplementation(() => new Date(Date.now()))

    const seen: string[] = []
    let release = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let ready = () => {}
    const run = new Promise<void>((resolve) => {
      ready = resolve
    })
    let wait = true

    spyOn(SessionPrompt, "prompt").mockImplementation(async (input) => {
      const text = input.parts.findLast((part) => part.type === "text")?.text ?? ""
      seen.push(text)
      if (text === first.prompt && wait) {
        wait = false
        ready()
        await gate
      }
      return { parts: [{ type: "text", text: "done" }] } as Awaited<ReturnType<typeof SessionPrompt.prompt>>
    })

    await SchedulerRunner.start()
    SchedulerRunner.notify()
    await Promise.race([run, Bun.sleep(1000)])
    expect(seen).toContain(first.prompt)
    await SchedulerStore.remove(second.id)
    release()
    await Bun.sleep(200)
    await SchedulerRunner.stop()

    expect(seen).not.toContain(second.prompt)
  })
})
