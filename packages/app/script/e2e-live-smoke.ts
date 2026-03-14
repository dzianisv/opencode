import os from "node:os"
import path from "node:path"
import { chromium } from "@playwright/test"
import { base64Encode } from "@opencode-ai/util/encode"

const base = process.env.OPENCODE_SMOKE_BASE_URL ?? "http://127.0.0.1:4096"
const user = process.env.OPENCODE_SERVER_USERNAME
const pass = process.env.OPENCODE_SERVER_PASSWORD

const auth = user && pass ? `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}` : undefined
const headers = auth ? { Authorization: auth } : undefined

type Project = {
  id: string
  worktree: string
  sandboxes?: string[]
}

type Session = {
  id: string
  directory: string
}

type Pty = {
  id: string
  cwd: string
  title: string
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const url = (input: string, query?: Record<string, string | number | boolean | undefined>) => {
  const next = new URL(input, base)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined) continue
    next.searchParams.set(key, String(value))
  }
  return next
}

async function waitForHealth() {
  const end = Date.now() + 30_000
  let last = ""
  while (Date.now() < end) {
    const result = await fetch(url("/global/health"), { headers }).catch((error) => {
      last = error instanceof Error ? error.message : String(error)
      return undefined
    })
    if (result?.ok) {
      const json = await result.json()
      return json
    }
    if (result) {
      last = `${result.status} ${result.statusText}`
    }
    await sleep(500)
  }
  throw new Error(`health check failed for ${base}: ${last}`)
}

async function request<T>(input: {
  method?: string
  path: string
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
}) {
  const result = await fetch(url(input.path, input.query), {
    method: input.method ?? "GET",
    headers: {
      ...(headers ?? {}),
      ...(input.body ? { "content-type": "application/json" } : {}),
    },
    body: input.body ? JSON.stringify(input.body) : undefined,
  })
  if (!result.ok) {
    const text = await result.text().catch(() => "")
    throw new Error(`${input.method ?? "GET"} ${input.path} failed: ${result.status} ${result.statusText} ${text}`)
  }
  return (await result.json()) as T
}

async function ptyProbe(input: { directory: string }) {
  const token = `OC_SMOKE_PTY_${Date.now()}`
  const pty = await request<Pty>({
    method: "POST",
    path: "/pty",
    query: { directory: input.directory },
    body: { title: `smoke-${Date.now()}` },
  })

  const wsURL = url(`/pty/${pty.id}/connect`, { directory: input.directory, cursor: -1 })
  wsURL.protocol = wsURL.protocol === "https:" ? "wss:" : "ws:"

  if (user && pass) {
    wsURL.username = user
    wsURL.password = pass
  }
  const ws = new WebSocket(wsURL.toString())

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("pty websocket open timeout")), 10_000)
      ws.addEventListener("open", () => {
        clearTimeout(timer)
        resolve()
      })
      ws.addEventListener("error", () => {
        clearTimeout(timer)
        reject(new Error("pty websocket open error"))
      })
    })

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("pty output timeout")), 15_000)
      const done = () => {
        clearTimeout(timer)
        resolve()
      }

      const fail = (error: Error) => {
        clearTimeout(timer)
        reject(error)
      }

      ws.addEventListener("message", (event) => {
        const parse = async () => {
          const data = event.data
          if (typeof data === "string") return data
          if (data instanceof ArrayBuffer) return new TextDecoder().decode(new Uint8Array(data))
          if (data instanceof Uint8Array) return new TextDecoder().decode(data)
          if (data instanceof Blob) return new TextDecoder().decode(new Uint8Array(await data.arrayBuffer()))
          return ""
        }

        void parse()
          .then((text) => {
            if (!text) return
            if (text.charCodeAt(0) === 0) return
            if (text.includes(token)) done()
          })
          .catch((error) => fail(error instanceof Error ? error : new Error(String(error))))
      })

      ws.addEventListener("error", () => fail(new Error("pty websocket message error")))
      ws.send(`echo ${token}\n`)
    })
  } finally {
    try {
      ws.close()
    } catch {}
    await request<boolean>({
      method: "DELETE",
      path: `/pty/${pty.id}`,
      query: { directory: input.directory },
    }).catch(() => false)
  }
}

async function uiProbe(input: { directory: string; sessionID?: string }) {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const errors: string[] = []
  const reqs: Array<{ url: string; status: number }> = []

  page.on("console", (message) => {
    if (message.type() !== "error") return
    const text = message.text()
    if (text.includes("[global-sdk] event stream error")) return
    errors.push(`console:${text}`)
  })
  page.on("pageerror", (error) => errors.push(`page:${error.message}`))
  page.on("response", (response) => {
    if (!response.url().startsWith(base)) return
    if (!response.url().includes("/project") && !response.url().includes("/session")) return
    reqs.push({ url: response.url(), status: response.status() })
  })

  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.addInitScript(
      ({ directory, origin }) => {
        const key = "opencode.global.dat:server"
        const raw = localStorage.getItem(key)
        const parsed = (() => {
          if (!raw) return undefined
          try {
            return JSON.parse(raw) as unknown
          } catch {
            return undefined
          }
        })()
        const store = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
        const projects = store.projects && typeof store.projects === "object" ? store.projects : {}
        const next = { ...(projects as Record<string, unknown>) }

        const put = (key: string) => {
          const value = next[key]
          const list = Array.isArray(value) ? value : []
          const items = list.filter(
            (item): item is { worktree: string; expanded?: boolean } =>
              !!item &&
              typeof item === "object" &&
              "worktree" in item &&
              typeof (item as { worktree?: unknown }).worktree === "string",
          )
          if (items.some((item) => item.worktree === directory)) return
          next[key] = [{ worktree: directory, expanded: true }, ...items]
        }

        put("local")
        put(origin)

        localStorage.setItem(
          key,
          JSON.stringify({
            list: Array.isArray(store.list) ? store.list : [],
            projects: next,
            lastProject: store.lastProject && typeof store.lastProject === "object" ? store.lastProject : {},
          }),
        )
      },
      { directory: input.directory, origin: new URL(base).origin },
    )
    const slug = base64Encode(input.directory)
    await page.goto(`${base}/${slug}/session`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    })
    await page.waitForResponse(
      (r) => r.url().includes("/project") && r.status() === 200 && r.url().startsWith(base),
      { timeout: 15_000 },
    )
    await page.waitForResponse(
      (r) => r.url().includes("/session") && r.status() === 200 && r.url().startsWith(base),
      { timeout: 15_000 },
    )
    const prompt = page.locator('[data-component="prompt-input"]')
    await prompt.first().waitFor({ state: "visible", timeout: 15_000 })

    if (input.sessionID) {
      await page.goto(`${base}/${slug}/session/${input.sessionID}`, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      })
      await page.waitForResponse((r) => r.url().includes(`/session/${input.sessionID}`) && r.status() === 200, {
        timeout: 15_000,
      })
    }

    const png = path.join(os.tmpdir(), "opencode-live-smoke-ui.png")
    await page.screenshot({ path: png, fullPage: true })
    if (errors.length > 0) throw new Error(`ui errors: ${errors.join("; ")}`)
    return { screenshot: png, requests: reqs.length }
  } finally {
    await browser.close()
  }
}

async function run() {
  const health = await waitForHealth()
  console.log(`health: ok (${health.version ?? "unknown"})`)

  const projects = await request<Project[]>({ path: "/project" })
  if (!Array.isArray(projects) || projects.length === 0) throw new Error("project list is empty")
  console.log(`project.list: ok (${projects.length})`)

  const current = await request<Project>({ path: "/project/current" })
  const directory = process.env.OPENCODE_SMOKE_DIRECTORY ?? current.worktree
  if (!directory) throw new Error("failed to resolve current directory/worktree")
  console.log(`project.current: ok (${directory})`)

  const sessions = await request<Session[]>({
    path: "/session",
    query: { directory, roots: true, limit: 20 },
  })
  console.log(`session.list: ok (${sessions.length})`)

  if (sessions[0]?.id) {
    await request<Session>({
      path: `/session/${sessions[0].id}`,
      query: { directory },
    })
    console.log(`session.get: ok (${sessions[0].id})`)
  }

  await request<Record<string, unknown>>({ path: "/session/status", query: { directory } })
  console.log("session.status: ok")

  const created = await request<Session>({
    method: "POST",
    path: "/session",
    query: { directory },
    body: { title: `live-smoke-${Date.now()}` },
  })
  console.log(`session.create: ok (${created.id})`)

  try {
    await request<Session>({
      path: `/session/${created.id}`,
      query: { directory },
    })
    console.log("session.roundtrip: ok")
  } finally {
    await request<boolean>({
      method: "DELETE",
      path: `/session/${created.id}`,
      query: { directory },
    })
    console.log(`session.delete: ok (${created.id})`)
  }

  await ptyProbe({ directory })
  console.log("pty.probe: ok")

  const ui = await uiProbe({ directory, sessionID: sessions[0]?.id })
  console.log(`ui.probe: ok (${ui.requests} api responses, screenshot: ${ui.screenshot})`)

  console.log("live smoke: PASS")
}

await run().catch((error) => {
  const text = error instanceof Error ? error.stack || error.message : String(error)
  console.error(`live smoke: FAIL\n${text}`)
  process.exit(1)
})
