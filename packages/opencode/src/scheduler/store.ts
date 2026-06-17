import path from "path"
import fs from "fs/promises"
import { Cron } from "croner"
import { Schema } from "effect"
import { Global } from "@opencode-ai/core/global"
import { ModelV2 } from "@opencode-ai/core/model"
import { ProviderV2 } from "@opencode-ai/core/provider"
import { Flock } from "@opencode-ai/core/util/flock"
import { ToolID } from "@/tool/schema"

const model = Schema.Struct({
  providerID: ProviderV2.ID,
  modelID: ModelV2.ID,
})

export const Job = Schema.Struct({
  id: ToolID,
  schedule: Schema.String,
  prompt: Schema.String,
  enabled: Schema.Boolean,
  agent: Schema.optional(Schema.String),
  model: Schema.optional(model),
  variant: Schema.optional(Schema.String),
  created_at: Schema.Number,
  updated_at: Schema.Number,
  last_run_at: Schema.optional(Schema.Number),
})
export type Job = Schema.Schema.Type<typeof Job>

const schedule = Schema.String

export const Input = Schema.Struct({
  schedule,
  prompt: Schema.String,
  enabled: Schema.optional(Schema.Boolean),
  agent: Schema.optional(Schema.String),
  model: Schema.optional(model),
  variant: Schema.optional(Schema.String),
})
export type Input = Schema.Schema.Type<typeof Input>

const Jobs = Schema.Array(Job)

export function file() {
  return path.join(Global.Path.data, "scheduler", "jobs.json")
}

function lock() {
  return `scheduler:${file()}`
}

async function readRaw() {
  const text = await Bun.file(file())
    .text()
    .catch((err) => {
      if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") return "[]"
      throw err
    })
  return Schema.decodeUnknownSync(Jobs)(JSON.parse(text))
}

async function writeRaw(list: ReadonlyArray<Job>) {
  const target = file()
  await fs.mkdir(path.dirname(target), { recursive: true })
  const next = `${target}.tmp-${process.pid}-${Date.now()}`
  await Bun.write(next, JSON.stringify(list, null, 2))
  await fs.rename(next, target)
}

export async function list() {
  return Flock.withLock(lock(), () => readRaw())
}

export async function get(id: string) {
  return (await list()).find((item) => item.id === id)
}

export async function add(input: Input) {
  const parsed = Schema.decodeUnknownSync(Input)(input)
  new Cron(parsed.schedule, { paused: true })
  return Flock.withLock(lock(), async () => {
    const now = Date.now()
    const job = Schema.decodeUnknownSync(Job)({
      id: ToolID.ascending(),
      schedule: parsed.schedule,
      prompt: parsed.prompt,
      enabled: parsed.enabled ?? true,
      agent: parsed.agent,
      model: parsed.model,
      variant: parsed.variant,
      created_at: now,
      updated_at: now,
    })
    const jobs = await readRaw()
    await writeRaw([...jobs, job])
    return job
  })
}

export async function remove(id: string) {
  return Flock.withLock(lock(), async () => {
    const jobs = await readRaw()
    const next = jobs.filter((item) => item.id !== id)
    if (next.length === jobs.length) return false
    await writeRaw(next)
    return true
  })
}

export async function setEnabled(id: string, enabled: boolean) {
  return Flock.withLock(lock(), async () => {
    const now = Date.now()
    const jobs = await readRaw()
    let found = false
    const next = jobs.map((item) => {
      if (item.id !== id) return item
      found = true
      return { ...item, enabled, updated_at: now }
    })
    if (!found) return
    await writeRaw(next)
    return next.find((item) => item.id === id)
  })
}

export async function touch(id: string, at: number) {
  return Flock.withLock(lock(), async () => {
    const jobs = await readRaw()
    const next = jobs.map((item) => {
      if (item.id !== id) return item
      return { ...item, last_run_at: at, updated_at: at }
    })
    await writeRaw(next)
  })
}

export const SchedulerStore = { file, list, get, add, remove, setEnabled, touch, Job, Input }
