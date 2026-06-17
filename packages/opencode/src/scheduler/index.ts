import { AppRuntime } from "@/effect/app-runtime"
import { Config } from "@/config/config"
import { InstanceRuntime } from "@/project/instance-runtime"
import { context, type InstanceContext } from "@/project/instance-context"
import { SchedulerRunner } from "./runner"
import { SchedulerHeartbeat } from "./heartbeat"

let running = false
let instance: InstanceContext | undefined

async function start(directory: string) {
  if (running) return
  const ctx = await InstanceRuntime.load({ directory })
  if (
    !(await context.provide(ctx, () =>
      AppRuntime.runPromise(Config.Service.use((svc) => svc.get())).then((cfg) => cfg.scheduler?.enabled === true),
    ))
  ) {
    await InstanceRuntime.disposeInstance(ctx)
    return
  }
  instance = ctx
  await SchedulerRunner.start(ctx)
  await SchedulerHeartbeat.start(ctx)
  running = true
}

async function stop() {
  if (!running) return
  await SchedulerHeartbeat.stop()
  await SchedulerRunner.stop()
  if (instance) await InstanceRuntime.disposeInstance(instance)
  instance = undefined
  running = false
}

export const Scheduler = { start, stop }
