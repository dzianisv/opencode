#!/usr/bin/env bun

import path from "path"

const raw = process.argv.slice(2)
const split = raw.indexOf("--")
const arg = split === -1 ? raw : raw.slice(0, split)
const cmd = split === -1 ? [] : raw.slice(split + 1)

const opt = {
  duration: 120,
  interval: 2000,
  warmup: 5,
  out: "",
  max_delta: undefined as number | undefined,
}

for (let i = 0; i < arg.length; i++) {
  const x = arg[i]
  if ((x === "--duration" || x === "-d") && arg[i + 1]) {
    opt.duration = Number(arg[++i])
    continue
  }
  if ((x === "--interval" || x === "-i") && arg[i + 1]) {
    opt.interval = Number(arg[++i])
    continue
  }
  if ((x === "--warmup" || x === "-w") && arg[i + 1]) {
    opt.warmup = Number(arg[++i])
    continue
  }
  if ((x === "--out" || x === "-o") && arg[i + 1]) {
    opt.out = arg[++i]
    continue
  }
  if (x === "--max-delta-mb" && arg[i + 1]) {
    opt.max_delta = Number(arg[++i])
    continue
  }
  if (x === "--help" || x === "-h") {
    usage()
    process.exit(0)
  }
}

if (!cmd.length) {
  usage()
  throw new Error("Missing target command. Pass it after '--'.")
}

if (!Number.isFinite(opt.duration) || opt.duration <= 0) {
  throw new Error("duration must be > 0")
}
if (!Number.isFinite(opt.interval) || opt.interval <= 0) {
  throw new Error("interval must be > 0")
}
if (!Number.isFinite(opt.warmup) || opt.warmup < 0) {
  throw new Error("warmup must be >= 0")
}

const out =
  opt.out ||
  path.join(process.cwd(), `memory-profile-${new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-")}.json`)

console.log(`memory-profile: launching -> ${cmd.join(" ")}`)
console.log(`memory-profile: duration=${opt.duration}s interval=${opt.interval}ms warmup=${opt.warmup}s`)
console.log(`memory-profile: output=${out}`)

const run = Bun.spawn(cmd, {
  cwd: process.cwd(),
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
})

const ready = await wait(run.pid, 5000)
if (!ready) {
  console.log("memory-profile: warning target pid not yet visible in ps output")
}
if (opt.warmup > 0) {
  const done = await Promise.race([run.exited.then(() => true), Bun.sleep(opt.warmup * 1000).then(() => false)])
  if (done) {
    const code = await run.exited
    throw new Error(`Target exited during warmup with code ${code}`)
  }
}

const start = Date.now()
const rows: {
  at: string
  elapsed_ms: number
  total_rss_kb: number
  proc: {
    pid: number
    ppid: number
    rss_kb: number
    cmd: string
  }[]
}[] = []

let alive = true
for (;;) {
  rows.push(sample(run.pid, start))

  if (Date.now() - start >= opt.duration * 1000) break
  const done = await Promise.race([run.exited.then(() => true), Bun.sleep(opt.interval).then(() => false)])
  if (done) {
    alive = false
    break
  }
}

if (alive) {
  stop(rows.at(-1)?.proc.map((x) => x.pid) ?? [], "SIGTERM")
  const done = await Promise.race([run.exited.then(() => true), Bun.sleep(3000).then(() => false)])
  if (!done) {
    stop(rows.at(-1)?.proc.map((x) => x.pid) ?? [], "SIGKILL")
  }
}

const total = rows.map((x) => x.total_rss_kb)
const first = total[0] ?? 0
const last = total.at(-1) ?? 0
const peak = total.length ? Math.max(...total) : 0
const delta = last - first
const span = ((rows.at(-1)?.elapsed_ms ?? 0) - (rows[0]?.elapsed_ms ?? 0)) / 1000
const slope = span > 0 ? delta / span : 0

const report = {
  cmd,
  pid: run.pid,
  started_at: new Date(start).toISOString(),
  ended_at: new Date().toISOString(),
  config: opt,
  summary: {
    start_rss_mb: mb(first),
    end_rss_mb: mb(last),
    peak_rss_mb: mb(peak),
    delta_rss_mb: mb(delta),
    slope_mb_per_s: mb(slope),
    samples: rows.length,
  },
  samples: rows,
}

await Bun.write(out, JSON.stringify(report, null, 2))

console.log("")
console.log("memory-profile: summary")
console.log(`  start rss: ${mb(first).toFixed(2)} MB`)
console.log(`  end rss:   ${mb(last).toFixed(2)} MB`)
console.log(`  peak rss:  ${mb(peak).toFixed(2)} MB`)
console.log(`  delta rss: ${mb(delta).toFixed(2)} MB`)
console.log(`  slope:     ${mb(slope).toFixed(4)} MB/s`)

if (opt.max_delta !== undefined && mb(delta) > opt.max_delta) {
  console.error(`memory-profile: FAIL delta ${mb(delta).toFixed(2)} MB > max ${opt.max_delta.toFixed(2)} MB`)
  process.exit(1)
}

console.log("memory-profile: PASS")

function usage() {
  console.log("Usage:")
  console.log("  bun run script/memory-profile.ts [options] -- <command> [args...]")
  console.log("")
  console.log("Options:")
  console.log("  -d, --duration <seconds>    sample duration (default: 120)")
  console.log("  -i, --interval <ms>         sample interval (default: 2000)")
  console.log("  -w, --warmup <seconds>      settle time before sampling (default: 5)")
  console.log("  -o, --out <path>            output json path")
  console.log("      --max-delta-mb <mb>     fail if end-start RSS exceeds threshold")
  console.log("")
  console.log("Example:")
  console.log(
    "  bun run script/memory-profile.ts -d 60 -i 1000 -w 5 -- bun run --conditions=browser ./src/index.ts debug wait",
  )
}

function sample(pid: number, start: number) {
  const list = ps()
  const sub = tree(list, pid)
  const total = sub.reduce((sum, item) => sum + item.rss_kb, 0)
  return {
    at: new Date().toISOString(),
    elapsed_ms: Date.now() - start,
    total_rss_kb: total,
    proc: sub,
  }
}

function ps() {
  const out = Bun.spawnSync(["ps", "-axo", "pid=,ppid=,rss=,command="], {
    stdout: "pipe",
    stderr: "pipe",
  })
  if (out.exitCode !== 0) {
    const err = new TextDecoder().decode(out.stderr).trim() || `exit ${out.exitCode}`
    throw new Error(`ps failed: ${err}`)
  }

  return new TextDecoder()
    .decode(out.stdout)
    .split("\n")
    .map((line) => parse(line))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
}

function parse(line: string) {
  const match = line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/)
  if (!match) return
  return {
    pid: Number(match[1]),
    ppid: Number(match[2]),
    rss_kb: Number(match[3]),
    cmd: match[4],
  }
}

function tree(
  rows: {
    pid: number
    ppid: number
    rss_kb: number
    cmd: string
  }[],
  root: number,
) {
  const map = new Map<number, typeof rows>()
  const head = rows.find((item) => item.pid === root)
  for (const row of rows) {
    const next = map.get(row.ppid) ?? []
    next.push(row)
    map.set(row.ppid, next)
  }

  const out: typeof rows = head ? [head] : []
  const seen = new Set<number>()
  const queue = [root]
  while (queue.length) {
    const cur = queue.shift()!
    if (seen.has(cur)) continue
    seen.add(cur)
    const child = map.get(cur) ?? []
    for (const row of child) {
      out.push(row)
      queue.push(row.pid)
    }
  }
  return out
}

function stop(pids: number[], sig: NodeJS.Signals) {
  for (const pid of pids) {
    if (pid === process.pid) continue
    try {
      process.kill(pid, sig)
    } catch {}
  }
}

function mb(kb: number) {
  return kb / 1024
}

async function wait(pid: number, timeout: number) {
  const end = Date.now() + timeout
  for (;;) {
    const ok = ps().some((item) => item.pid === pid)
    if (ok) return true
    if (Date.now() >= end) return false
    await Bun.sleep(100)
  }
}
