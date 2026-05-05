import type { Argv } from "yargs"
import { cmd } from "./cmd"
import { bootstrap } from "../bootstrap"
import { SchedulerStore } from "../../scheduler/store"
import { SchedulerRunner } from "../../scheduler/runner"
import { Provider } from "../../provider/provider"

function parseModel(input: unknown) {
  const text = String(input ?? "").trim()
  if (!text) return
  return Provider.parseModel(text)
}

const AddCommand = cmd({
  command: "add <schedule> <prompt>",
  describe: "add a cron job",
  builder: (yargs: Argv) =>
    yargs
      .positional("schedule", { type: "string", demandOption: true })
      .positional("prompt", { type: "string", demandOption: true })
      .option("agent", { type: "string" })
      .option("model", { type: "string" })
      .option("variant", { type: "string" })
      .option("enabled", { type: "boolean", default: true }),
  handler: async (args) => {
    await bootstrap(process.cwd(), async () => {
      const job = await SchedulerStore.add({
        schedule: String(args.schedule),
        prompt: String(args.prompt),
        enabled: Boolean(args.enabled),
        agent: args.agent ? String(args.agent) : undefined,
        model: parseModel(args.model),
        variant: args.variant ? String(args.variant) : undefined,
      })
      SchedulerRunner.notify()
      console.log(job.id)
    })
  },
})

const ListCommand = cmd({
  command: "list",
  aliases: ["ls"],
  describe: "list cron jobs",
  builder: (yargs: Argv) => yargs.option("json", { type: "boolean", default: false }),
  handler: async (args) => {
    await bootstrap(process.cwd(), async () => {
      const jobs = await SchedulerStore.list()
      if (args.json) {
        console.log(JSON.stringify(jobs, null, 2))
        return
      }
      for (const job of jobs) {
        console.log(`${job.id}	${job.enabled ? "enabled" : "disabled"}	${job.schedule}	${job.prompt}`)
      }
    })
  },
})

const RemoveCommand = cmd({
  command: "remove <id>",
  describe: "remove cron job",
  builder: (yargs: Argv) => yargs.positional("id", { type: "string", demandOption: true }),
  handler: async (args) => {
    await bootstrap(process.cwd(), async () => {
      const ok = await SchedulerStore.remove(String(args.id))
      if (!ok) throw new Error(`cron job not found: ${args.id}`)
      SchedulerRunner.notify()
      console.log("ok")
    })
  },
})

const RunCommand = cmd({
  command: "run <id>",
  describe: "run cron job now",
  builder: (yargs: Argv) => yargs.positional("id", { type: "string", demandOption: true }),
  handler: async (args) => {
    await bootstrap(process.cwd(), async () => {
      const ok = await SchedulerRunner.runNow(String(args.id))
      if (!ok) throw new Error(`cron job not found: ${args.id}`)
      console.log("ok")
    })
  },
})

const EnableCommand = cmd({
  command: "enable <id>",
  describe: "enable cron job",
  builder: (yargs: Argv) => yargs.positional("id", { type: "string", demandOption: true }),
  handler: async (args) => {
    await bootstrap(process.cwd(), async () => {
      const job = await SchedulerStore.setEnabled(String(args.id), true)
      if (!job) throw new Error(`cron job not found: ${args.id}`)
      SchedulerRunner.notify()
      console.log("ok")
    })
  },
})

const DisableCommand = cmd({
  command: "disable <id>",
  describe: "disable cron job",
  builder: (yargs: Argv) => yargs.positional("id", { type: "string", demandOption: true }),
  handler: async (args) => {
    await bootstrap(process.cwd(), async () => {
      const job = await SchedulerStore.setEnabled(String(args.id), false)
      if (!job) throw new Error(`cron job not found: ${args.id}`)
      SchedulerRunner.notify()
      console.log("ok")
    })
  },
})

export const CronCommand = cmd({
  command: "cron",
  describe: "manage scheduler jobs",
  builder: (yargs: Argv) =>
    yargs
      .command(AddCommand)
      .command(ListCommand)
      .command(RemoveCommand)
      .command(RunCommand)
      .command(EnableCommand)
      .command(DisableCommand)
      .demandCommand(),
  async handler() {},
})
