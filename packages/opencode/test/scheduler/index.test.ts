import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { Scheduler } from "../../src/scheduler"
import { Config } from "../../src/config/config"
import { SchedulerRunner } from "../../src/scheduler/runner"
import { SchedulerHeartbeat } from "../../src/scheduler/heartbeat"

afterEach(async () => {
  mock.restore()
  await Scheduler.stop()
})

describe("scheduler.index", () => {
  test("does not start when disabled", async () => {
    spyOn(Config, "get").mockResolvedValue({
      scheduler: {
        enabled: false,
        heartbeat: { enabled: true, interval: "30m" },
        maxConcurrent: 1,
      },
    } as unknown as Awaited<ReturnType<typeof Config.get>>)
    const run = spyOn(SchedulerRunner, "start")
    const beat = spyOn(SchedulerHeartbeat, "start")

    await Scheduler.start()

    expect(run).not.toHaveBeenCalled()
    expect(beat).not.toHaveBeenCalled()
  })

  test("starts and stops when enabled", async () => {
    spyOn(Config, "get").mockResolvedValue({
      scheduler: {
        enabled: true,
        heartbeat: { enabled: true, interval: "30m" },
        maxConcurrent: 1,
      },
    } as unknown as Awaited<ReturnType<typeof Config.get>>)
    const run = spyOn(SchedulerRunner, "start").mockResolvedValue()
    const beat = spyOn(SchedulerHeartbeat, "start").mockResolvedValue()
    const stopRun = spyOn(SchedulerRunner, "stop").mockResolvedValue()
    const stopBeat = spyOn(SchedulerHeartbeat, "stop")

    await Scheduler.start()
    await Scheduler.stop()

    expect(run).toHaveBeenCalledTimes(1)
    expect(beat).toHaveBeenCalledTimes(1)
    expect(stopBeat).toHaveBeenCalledTimes(1)
    expect(stopRun).toHaveBeenCalledTimes(1)
  })
})
