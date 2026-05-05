import z from "zod"
import { Tool } from "./tool"
import { SchedulerStore } from "../scheduler/store"
import { SchedulerRunner } from "../scheduler/runner"
import { Provider } from "../provider/provider"

const parameters = z.object({
  action: z.enum(["add", "list", "remove"]),
  id: z.string().optional(),
  schedule: z.string().optional(),
  prompt: z.string().optional(),
  enabled: z.boolean().optional(),
  agent: z.string().optional(),
  model: z.string().optional(),
  variant: z.string().optional(),
})

export const CronTool = Tool.define("cron", {
  description: "Manage scheduler jobs by adding, listing, or removing cron prompts.",
  parameters,
  async execute(params, ctx) {
    await ctx.ask({
      permission: "cron",
      patterns: ["*"],
      always: ["*"],
      metadata: {},
    })

    if (params.action === "list") {
      const jobs = await SchedulerStore.list()
      return {
        title: `${jobs.length} jobs`,
        output: JSON.stringify(jobs, null, 2),
        metadata: { count: jobs.length, id: "" },
      }
    }

    if (params.action === "remove") {
      if (!params.id) throw new Error("id is required for remove")
      const ok = await SchedulerStore.remove(params.id)
      if (!ok) throw new Error(`cron job not found: ${params.id}`)
      SchedulerRunner.notify()
      return {
        title: "removed",
        output: `Removed cron job ${params.id}`,
        metadata: { id: params.id, count: 0 },
      }
    }

    if (!params.schedule) throw new Error("schedule is required for add")
    if (!params.prompt) throw new Error("prompt is required for add")

    const job = await SchedulerStore.add({
      schedule: params.schedule,
      prompt: params.prompt,
      enabled: params.enabled ?? true,
      agent: params.agent,
      model: params.model ? Provider.parseModel(params.model) : undefined,
      variant: params.variant,
    })
    SchedulerRunner.notify()

    return {
      title: job.id,
      output: JSON.stringify(job, null, 2),
      metadata: { id: job.id, count: 0 },
    }
  },
})
