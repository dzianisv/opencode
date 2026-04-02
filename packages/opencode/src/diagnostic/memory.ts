import fs from "fs/promises"
import path from "path"
import { writeHeapSnapshot } from "v8"
import z from "zod"
import { Flag } from "@/flag/flag"
import { Global } from "@/global"
import { Instance } from "@/project/instance"
import { Pty } from "@/pty"
import { Database, isNull, sql } from "@/storage/db"
import { SessionTable } from "@/session/session.sql"
import { Log } from "@/util/log"
import { Process } from "@/util/process"

const log = Log.create({ service: "memory" })

const mib = 1024 * 1024
const keep = 2

const run = {
  busy: false,
  snap: false,
  last: 0,
}

const one = {
  timer: undefined as NodeJS.Timeout | undefined,
  file: "",
}

function now() {
  return new Date().toISOString()
}

function stamp() {
  return now().replaceAll(":", "-").replaceAll(".", "-")
}

function mb(n: number) {
  return Math.round((n / mib) * 10) / 10
}

async function ps() {
  if (process.platform === "win32") return
  const out = await Process.text(["ps", "-axo", "pid=,ppid=,rss=,comm="], { nothrow: true })
  if (out.code !== 0) return

  const map = new Map<number, { ppid: number; rss_bytes: number; name: string }>()
  const kids = new Map<number, number[]>()

  for (const line of out.text.split(/\r?\n/)) {
    const txt = line.trim()
    if (!txt) continue
    const match = txt.match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/)
    if (!match) continue

    const pid = Number(match[1])
    const ppid = Number(match[2])
    const rss_bytes = Number(match[3]) * 1024
    const name = match[4]

    map.set(pid, { ppid, rss_bytes, name })

    const list = kids.get(ppid) ?? []
    list.push(pid)
    kids.set(ppid, list)
  }

  return { map, kids }
}

async function tree(pid: number) {
  const rows = await ps()
  if (!rows) return

  const seen = new Set<number>()
  const list: Array<{ pid: number; rss_bytes: number; name: string }> = []
  let rss_bytes = 0
  const walk = [pid]

  while (walk.length > 0) {
    const cur = walk.pop()!
    if (seen.has(cur)) continue
    seen.add(cur)

    const row = rows.map.get(cur)
    if (!row) continue
    rss_bytes += row.rss_bytes
    list.push({ pid: cur, rss_bytes: row.rss_bytes, name: row.name })

    for (const kid of rows.kids.get(cur) ?? []) walk.push(kid)
  }

  const top = list
    .filter((item) => item.pid !== pid)
    .sort((a, b) => b.rss_bytes - a.rss_bytes)
    .slice(0, 8)

  return {
    pid,
    process_count: list.length,
    rss_bytes,
    top,
  }
}

async function session() {
  return Database.use((db) => {
    const total =
      db
        .select({ value: sql<number>`count(*)` })
        .from(SessionTable)
        .get()?.value ?? 0
    const active =
      db
        .select({ value: sql<number>`count(*)` })
        .from(SessionTable)
        .where(isNull(SessionTable.time_archived))
        .get()?.value ?? 0
    return { total, active }
  })
}

async function dump(cmd: string[], file: string) {
  const out = await Process.run(cmd, { nothrow: true })
  const text = [`$ ${cmd.join(" ")}`, `exit=${out.code}`, "", out.stdout.toString(), out.stderr.toString()].join("\n")
  await fs.writeFile(file, text)
}

function env() {
  const on = Flag.OPENCODE_MEMORY_MONITOR || Flag.OPENCODE_MEMORY_MONITOR_THRESHOLD_MB !== undefined
  if (!on) return

  const interval_ms = Flag.OPENCODE_MEMORY_MONITOR_INTERVAL_MS ?? 10_000
  const cooldown_ms = Flag.OPENCODE_MEMORY_MONITOR_COOLDOWN_MS ?? 5 * 60 * 1000
  const threshold_mb = Flag.OPENCODE_MEMORY_MONITOR_THRESHOLD_MB
  const children = Flag.OPENCODE_MEMORY_MONITOR_CHILDREN || threshold_mb !== undefined

  return {
    interval_ms,
    cooldown_ms,
    threshold_mb,
    children,
    path: Flag.OPENCODE_MEMORY_MONITOR_PATH,
  }
}

type Entry = {
  dir: string
  time: number
}

async function prune(input?: {
  dir?: string
  keep?: number
}) {
  const root = input?.dir ?? path.join(Global.Path.log, "memory")
  const max = input?.keep ?? keep
  const list = await fs.readdir(root, { withFileTypes: true }).catch(() => [])
  const rows = await Promise.all(
    list
      .filter((item) => item.isDirectory())
      .map(async (item) => {
        const dir = path.join(root, item.name)
        const stat = await fs.stat(dir).catch(() => undefined)
        if (!stat) return
        return {
          dir,
          time: stat.mtimeMs,
        } satisfies Entry
      }),
  )
  const dirs = rows
    .filter((item): item is Entry => Boolean(item))
    .sort((a, b) => a.time - b.time)
  if (dirs.length <= max) return
  await Promise.all(dirs.slice(0, -max).map((item) => fs.rm(item.dir, { recursive: true, force: true }).catch(() => {})))
}

export namespace Memory {
  export const TreeProcess = z.object({
    pid: z.number(),
    rss_bytes: z.number(),
    name: z.string(),
  })

  export const Tree = z.object({
    pid: z.number(),
    process_count: z.number(),
    rss_bytes: z.number(),
    top: z.array(TreeProcess),
  })

  export const Sample = z.object({
    time: z.string(),
    pid: z.number(),
    uptime_sec: z.number(),
    rss_bytes: z.number(),
    heap_total_bytes: z.number(),
    heap_used_bytes: z.number(),
    external_bytes: z.number(),
    array_buffer_bytes: z.number(),
    session: z.object({
      total: z.number(),
      active: z.number(),
    }),
    pty: z.object({
      active: z.number(),
    }),
    instance: z.object({
      size: z.number(),
      max: z.number(),
      idle_ms: z.number(),
      entries: z.array(
        z.object({
          directory: z.string(),
          refs: z.number(),
          idle_ms: z.number(),
        }),
      ),
    }),
    tree: Tree.optional(),
  })

  export type Sample = z.infer<typeof Sample>

  export const trim = prune

  export async function sample(input?: { children?: boolean }) {
    const mem = process.memoryUsage()
    const data: Sample = {
      time: now(),
      pid: process.pid,
      uptime_sec: Math.round(process.uptime() * 10) / 10,
      rss_bytes: mem.rss,
      heap_total_bytes: mem.heapTotal,
      heap_used_bytes: mem.heapUsed,
      external_bytes: mem.external,
      array_buffer_bytes: mem.arrayBuffers,
      session: await session(),
      pty: { active: Pty.count() },
      instance: Instance.stats(),
      tree: undefined,
    }
    if (input?.children) data.tree = await tree(process.pid)
    return data
  }

  export async function snapshot(input: { reason: string; sample?: Sample }) {
    if (run.snap) return
    run.snap = true
    return Promise.resolve()
      .then(async () => {
        const tag = stamp()
        const dir = path.join(Global.Path.log, "memory", tag)
        await fs.mkdir(dir, { recursive: true })

        const data = input.sample ?? (await sample({ children: true }))
        await fs.writeFile(path.join(dir, "sample.json"), JSON.stringify(data, null, 2))

        const meta = {
          reason: input.reason,
          time: now(),
          pid: process.pid,
          threshold_mb: Flag.OPENCODE_MEMORY_MONITOR_THRESHOLD_MB,
          rss_mb: mb(data.rss_bytes),
          tree_mb: data.tree ? mb(data.tree.rss_bytes) : undefined,
          pty: data.pty.active,
          sessions: data.session,
          instance_size: data.instance.size,
        }
        await fs.writeFile(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2))

        await dump(["ps", "-axo", "pid,ppid,rss,vsz,etime,command"], path.join(dir, "ps.txt"))

        if (process.platform === "darwin") {
          await dump(["vmmap", "-summary", String(process.pid)], path.join(dir, "vmmap.txt"))
          await dump(["sample", String(process.pid), "5", "1"], path.join(dir, "sample.txt"))
        }

        const heap = writeHeapSnapshot(path.join(dir, "heap.heapsnapshot"))

        log.warn("memory snapshot written", {
          reason: input.reason,
          dir,
          heap,
          rss_mb: mb(data.rss_bytes),
          tree_mb: data.tree ? mb(data.tree.rss_bytes) : undefined,
          instance_size: data.instance.size,
          pty: data.pty.active,
          sessions_active: data.session.active,
        })

        await Memory.trim()

        return dir
      })
      .finally(() => {
        run.snap = false
      })
  }

  export function start(label: string) {
    if (one.timer) return

    void Memory.trim().catch((error) => {
      log.error("memory trim failed", { error })
    })

    const cfg = env()
    if (!cfg) return

    one.file =
      cfg.path || path.join(Global.Path.log, `memory-${label}-${new Date().toISOString().split(".")[0].replace(/:/g, "")}.ndjson`)

    log.info("memory monitor started", {
      label,
      file: one.file,
      interval_ms: cfg.interval_ms,
      threshold_mb: cfg.threshold_mb,
      children: cfg.children,
    })

    const tick = async () => {
      if (run.busy) return
      run.busy = true
      await Promise.resolve()
        .then(async () => {
          const data = await sample({ children: cfg.children })
          await fs.appendFile(one.file, JSON.stringify(data) + "\n")
          await Log.trim()

          if (cfg.threshold_mb === undefined) return
          const value = data.tree?.rss_bytes ?? data.rss_bytes
          if (value < cfg.threshold_mb * mib) return
          if (Date.now() - run.last < cfg.cooldown_ms) return
          run.last = Date.now()
          log.warn("memory threshold breached", {
            label,
            threshold_mb: cfg.threshold_mb,
            rss_mb: mb(data.rss_bytes),
            tree_mb: data.tree ? mb(data.tree.rss_bytes) : undefined,
          })
          void snapshot({ reason: "threshold", sample: data }).catch((error) => {
            log.error("memory snapshot failed", { error })
          })
        })
        .finally(() => {
          run.busy = false
        })
    }

    one.timer = setInterval(() => {
      void tick().catch((error) => {
        log.error("memory monitor tick failed", { error })
      })
    }, cfg.interval_ms)
    void tick().catch((error) => {
      log.error("memory monitor tick failed", { error })
    })
  }

  export function stop() {
    if (!one.timer) return
    clearInterval(one.timer)
    one.timer = undefined
    log.info("memory monitor stopped", { file: one.file })
  }
}
