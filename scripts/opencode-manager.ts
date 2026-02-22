import path from "node:path"

const repo = Bun.env.OPENCODE_REPO ?? ""
const token = Bun.env.GITHUB_TOKEN ?? ""
const assignee = Bun.env.OPENCODE_ASSIGNEE ?? ""
const label = Bun.env.OPENCODE_LABEL ?? ""
const root = Bun.env.OPENCODE_ROOT ?? process.cwd()
const base = Bun.env.OPENCODE_WORKTREE_BASE ?? path.join(root, ".opencode-worktrees")
const cmd = Bun.env.OPENCODE_CMD ?? "opencode"
const args = (Bun.env.OPENCODE_ARGS ?? "").split(" ").filter(Boolean)
const poll = Number(Bun.env.OPENCODE_POLL_SECONDS ?? "60")
const state = path.join(root, ".opencode-manager", "state.json")

if (!repo) throw new Error("OPENCODE_REPO is required")
if (!token) throw new Error("GITHUB_TOKEN is required")
if (!assignee && !label) throw new Error("OPENCODE_ASSIGNEE or OPENCODE_LABEL is required")
if (!Number.isFinite(poll) || poll < 10) throw new Error("OPENCODE_POLL_SECONDS must be >= 10")

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const readState = async () => {
  const file = Bun.file(state)
  if (!(await file.exists())) return { seen: [] as number[] }
  return (await file.json()) as { seen: number[] }
}

const writeState = async (seen: number[]) => {
  await Bun.write(state, JSON.stringify({ seen }, null, 2))
}

const search = async () => {
  const q = [
    `repo:${repo}`,
    "is:issue",
    "is:open",
    assignee ? `assignee:${assignee}` : "",
    label ? `label:${label}` : "",
  ]
    .filter(Boolean)
    .join(" ")

  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(q)}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  })

  if (!res.ok) throw new Error(`GitHub search failed: ${res.status}`)
  const data = (await res.json()) as { items: { number: number; html_url: string; title: string }[] }
  return data.items
}

const worktree = async (num: number) => {
  const branch = `opencode/issue-${num}`
  const dir = path.join(base, `issue-${num}`)
  await Bun.spawn({ cmd: ["git", "worktree", "add", "-b", branch, dir, "dev"], cwd: root }).exited
  return dir
}

const launch = (dir: string, num: number, url: string, title: string) => {
  Bun.spawn({
    cmd: [cmd, ...args],
    cwd: dir,
    stdout: "inherit",
    stderr: "inherit",
    env: {
      ...Bun.env,
      OPENCODE_ISSUE: String(num),
      OPENCODE_ISSUE_URL: url,
      OPENCODE_ISSUE_TITLE: title,
    },
  })
}

const run = async () => {
  const data = await readState()
  const list = await search()
  const next = list.filter((item) => !data.seen.includes(item.number))
  if (next.length === 0) return
  const seen = data.seen.concat(next.map((item) => item.number))
  await writeState(seen)
  await Promise.all(
    next.map(async (item) => {
      const dir = await worktree(item.number)
      launch(dir, item.number, item.html_url, item.title)
    }),
  )
}

while (true) {
  await run()
  await wait(poll * 1000)
}
