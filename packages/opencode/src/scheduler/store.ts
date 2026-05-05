import path from "path"
import fs from "fs/promises"
import z from "zod"
import { Global } from "../global"
import { Lock } from "../util/lock"
import { Filesystem } from "../util/filesystem"
import { Identifier } from "../id/id"
import { ProviderID, ModelID } from "../provider/schema"
import { Cron } from "croner"

export namespace SchedulerStore {
  export const Job = z.object({
    id: z.string(),
    schedule: z.string(),
    prompt: z.string(),
    enabled: z.boolean().default(true),
    agent: z.string().optional(),
    model: z
      .object({
        providerID: ProviderID.zod,
        modelID: ModelID.zod,
      })
      .optional(),
    variant: z.string().optional(),
    created_at: z.number(),
    updated_at: z.number(),
    last_run_at: z.number().optional(),
  })
  export type Job = z.output<typeof Job>

  export const Input = z.object({
    schedule: z.string().refine(
      (value) => {
        try {
          new Cron(value, { paused: true })
          return true
        } catch {
          return false
        }
      },
      { error: "invalid cron schedule" },
    ),
    prompt: z.string(),
    enabled: z.boolean().default(true),
    agent: z.string().optional(),
    model: Job.shape.model,
    variant: z.string().optional(),
  })
  export type Input = z.infer<typeof Input>

  const Jobs = z.array(Job)

  export function file() {
    return path.join(Global.Path.data, "scheduler", "jobs.json")
  }

  async function readRaw() {
    const p = file()
    const text = await Filesystem.readText(p).catch((err) => {
      if (typeof err === "object" && err && "code" in err && err.code === "ENOENT") return "[]"
      throw err
    })
    const parsed = JSON.parse(text)
    return Jobs.parse(parsed)
  }

  async function writeRaw(list: Job[]) {
    const p = file()
    const dir = path.dirname(p)
    await fs.mkdir(dir, { recursive: true })
    const tmp = `${p}.tmp-${process.pid}-${Date.now()}`
    await fs.writeFile(tmp, JSON.stringify(list, null, 2))
    await fs.rename(tmp, p)
  }

  export async function list() {
    using _ = await Lock.read(`scheduler:${file()}`)
    return readRaw()
  }

  export async function get(id: string) {
    const list = await SchedulerStore.list()
    return list.find((x) => x.id === id)
  }

  export async function add(input: Input) {
    const parsed = Input.parse(input)
    using _ = await Lock.write(`scheduler:${file()}`)
    const now = Date.now()
    const next = Job.parse({
      id: Identifier.ascending("tool"),
      schedule: parsed.schedule,
      prompt: parsed.prompt,
      enabled: parsed.enabled,
      agent: parsed.agent,
      model: parsed.model,
      variant: parsed.variant,
      created_at: now,
      updated_at: now,
    })
    const list = await readRaw()
    list.push(next)
    await writeRaw(list)
    return next
  }

  export async function remove(id: string) {
    using _ = await Lock.write(`scheduler:${file()}`)
    const list = await readRaw()
    const next = list.filter((x) => x.id !== id)
    if (next.length === list.length) return false
    await writeRaw(next)
    return true
  }

  export async function setEnabled(id: string, enabled: boolean) {
    using _ = await Lock.write(`scheduler:${file()}`)
    const list = await readRaw()
    const now = Date.now()
    let hit = false
    const next = list.map((item) => {
      if (item.id !== id) return item
      hit = true
      return {
        ...item,
        enabled,
        updated_at: now,
      }
    })
    if (!hit) return
    await writeRaw(next)
    return next.find((x) => x.id === id)
  }

  export async function touch(id: string, at: number) {
    using _ = await Lock.write(`scheduler:${file()}`)
    const list = await readRaw()
    const next = list.map((item) => {
      if (item.id !== id) return item
      return {
        ...item,
        last_run_at: at,
        updated_at: at,
      }
    })
    await writeRaw(next)
  }
}
