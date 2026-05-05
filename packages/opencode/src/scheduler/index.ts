import { Config } from "../config/config"
import { SchedulerRunner } from "./runner"
import { SchedulerHeartbeat } from "./heartbeat"

export namespace Scheduler {
  export async function start() {
    const config = await Config.get()
    const scheduler = config.scheduler ?? {
      enabled: false,
      heartbeat: { enabled: true, interval: "30m" },
      maxConcurrent: 1,
    }
    if (!scheduler.enabled) return
    await SchedulerRunner.start()
    await SchedulerHeartbeat.start()
  }

  export async function stop() {
    SchedulerHeartbeat.stop()
    await SchedulerRunner.stop()
  }
}
