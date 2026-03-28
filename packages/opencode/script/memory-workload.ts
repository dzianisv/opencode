const base = process.env["OPENCODE_BASE_URL"] || "http://127.0.0.1:4096"
const dir = process.env["OPENCODE_DIRECTORY"] || process.cwd()
const ms = Number(process.env["OPENCODE_PROFILE_DURATION_MS"] || 60 * 60 * 1000)
const batch = Number(process.env["OPENCODE_PROFILE_BATCH"] || 8)
const min = Number(process.env["OPENCODE_PROFILE_MIN_SESSIONS"] || 10)
const max = Number(process.env["OPENCODE_PROFILE_MAX_SESSIONS"] || 30)
const poll = Number(process.env["OPENCODE_PROFILE_POLL_MS"] || 1000)
const list = Number(process.env["OPENCODE_PROFILE_LIST_EVERY"] || 4)
const add = Number(process.env["OPENCODE_PROFILE_ADD_EVERY"] || 5)
const drop = Number(process.env["OPENCODE_PROFILE_DROP_EVERY"] || 7)
const stop = Number(process.env["OPENCODE_PROFILE_STOP_TREE_MB"] || 5120)

const q = (path: string, opt?: Record<string, string | number | boolean | null | undefined>) => {
  const url = new URL(path, base)
  url.searchParams.set("directory", dir)
  for (const k of Object.keys(opt || {})) {
    const val = opt?.[k]
    if (val === undefined || val === null) continue
    url.searchParams.set(k, String(val))
  }
  return url
}

const req = async (
  path: string,
  init?: RequestInit,
  opt?: Record<string, string | number | boolean | null | undefined>,
) => {
  const res = await fetch(q(path, opt), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => "")
    throw new Error(`${init?.method || "GET"} ${path} ${res.status} ${txt.slice(0, 200)}`)
  }
  const txt = await res.text()
  if (!txt) return null
  return JSON.parse(txt)
}

const wait = (ms: number) => new Promise((done) => setTimeout(done, ms))

const hit = (vals: number[]) => {
  if (!vals.length) return null
  return {
    start: vals[0],
    end: vals[vals.length - 1],
    min: Math.min(...vals),
    max: Math.max(...vals),
    delta: Number((vals[vals.length - 1] - vals[0]).toFixed(2)),
  }
}

const fit = (rows: any[], key: string) => {
  if (rows.length < 2) return 0
  const xs = rows.map((x) => (x.t - rows[0].t) / 60000)
  const ys = rows.map((x) => x[key])
  const xm = xs.reduce((a, b) => a + b, 0) / xs.length
  const ym = ys.reduce((a, b) => a + b, 0) / ys.length
  const num = xs.reduce((a, _, i) => a + (xs[i] - xm) * (ys[i] - ym), 0)
  const den = xs.reduce((a, x) => a + (x - xm) * (x - xm), 0)
  if (den === 0) return 0
  return Number((num / den).toFixed(2))
}

const one = async () => {
  const mem = await req("/global/memory", undefined, { children: true })
  return {
    t: Date.now(),
    rss_mb: Number((mem.rss_bytes / 1048576).toFixed(2)),
    heap_used_mb: Number((mem.heap_used_bytes / 1048576).toFixed(2)),
    heap_total_mb: Number((mem.heap_total_bytes / 1048576).toFixed(2)),
    ext_mb: Number((mem.external_bytes / 1048576).toFixed(2)),
    tree_rss_mb: Number((((mem.tree || {}).rss_bytes || 0) / 1048576).toFixed(2)),
    sessions_total: mem.session?.total || 0,
    sessions_active: mem.session?.active || 0,
    instances: mem.instance?.size || 0,
    pty_active: mem.pty?.active || 0,
  }
}

const run = async () => {
  const now = Date.now()
  const ses: string[] = []
  const rows: any[] = []
  let prompts = 0
  let shells = 0
  let adds = 0
  let drops = 0
  let errs = 0
  let loops = 0
  let log = 0
  let hit_stop = false

  console.log(`[memory-workload] base=${base} directory=${dir} duration_ms=${ms}`)

  await req("/global/health")

  const make = async () => {
    const out = await req("/session", { method: "POST", body: "{}" })
    ses.push(out.id)
    adds++
    return out.id as string
  }

  const del = async (id: string) => {
    await req(`/session/${id}`, { method: "DELETE" })
    const ix = ses.indexOf(id)
    if (ix >= 0) ses.splice(ix, 1)
    drops++
  }

  const pick = () => ses[Math.floor(Math.random() * ses.length)]

  while (ses.length < min) await make()

  while (Date.now() - now < ms) {
    loops++

    if (ses.length < min) await make().catch(() => errs++)

    await Promise.all(
      Array.from({ length: batch }).flatMap((_, i) => {
        const id = pick()
        if (!id) return []
        const list: Promise<unknown>[] = []
        list.push(
          req(`/session/${id}/message`, {
            method: "POST",
            body: JSON.stringify({
              agent: "build",
              noReply: true,
              parts: [{ type: "text", text: `mem profile prompt ${loops}-${i} ${Date.now()}` }],
            }),
          })
            .then(() => prompts++)
            .catch(() => errs++),
        )
        if ((loops + i) % 3 === 0) {
          list.push(
            req(`/session/${id}/shell`, {
              method: "POST",
              body: JSON.stringify({
                agent: "build",
                command: `echo mem-${loops}-${i}-${Date.now()} && ls >/dev/null && pwd >/dev/null`,
              }),
            })
              .then(() => shells++)
              .catch(() => errs++),
          )
        }
        return list
      }),
    )

    if (loops % list === 0) await req("/session", undefined, { limit: 50 }).catch(() => errs++)
    if (loops % add === 0 && ses.length < max) await make().catch(() => errs++)
    if (loops % drop === 0 && ses.length > min) await del(ses[0]).catch(() => errs++)

    const m = await one().catch(() => {
      errs++
      return null
    })

    if (m) rows.push(m)

    if (m && stop > 0 && m.tree_rss_mb >= stop) {
      hit_stop = true
      console.error(`[memory-workload] stop tree_rss_mb=${m.tree_rss_mb}MB threshold=${stop}MB`)
      break
    }

    if (m && Date.now() - log > 30000) {
      log = Date.now()
      console.log(
        `[memory-workload] loops=${loops} sessions=${ses.length} prompts=${prompts} shells=${shells} rss=${m.rss_mb}MB heap=${m.heap_used_mb}/${m.heap_total_mb}MB tree=${m.tree_rss_mb}MB errors=${errs}`,
      )
    }

    await wait(poll)
  }

  const rss = rows.map((x) => x.rss_mb)
  const heap = rows.map((x) => x.heap_used_mb)
  const tree = rows.map((x) => x.tree_rss_mb)
  const cut = rows.slice(Math.floor(rows.length / 2))

  const out = {
    started_at: new Date(now).toISOString(),
    ended_at: new Date().toISOString(),
    duration_sec: Math.round((Date.now() - now) / 1000),
    prompts,
    shells,
    adds,
    drops,
    errors: errs,
    sessions_left: ses.length,
    sample_count: rows.length,
    rss_mb: hit(rss),
    heap_used_mb: hit(heap),
    tree_rss_mb: hit(tree),
    slope_mb_per_min: {
      rss: fit(rows, "rss_mb"),
      heap_used: fit(rows, "heap_used_mb"),
      tree_rss: fit(rows, "tree_rss_mb"),
      rss_half: fit(cut, "rss_mb"),
      heap_used_half: fit(cut, "heap_used_mb"),
      tree_rss_half: fit(cut, "tree_rss_mb"),
    },
    threshold_hit: hit_stop,
    threshold_tree_mb: stop,
    final: rows[rows.length - 1] || null,
  }

  const path = `/tmp/opencode-memory-profile-${Date.now()}.json`
  await Bun.write(path, JSON.stringify({ summary: out, samples: rows }, null, 2))

  console.log(`[memory-workload] done ${path}`)
  console.log(JSON.stringify(out, null, 2))
}

run().catch((err) => {
  console.error("[memory-workload] failed", err)
  process.exit(1)
})
