const id = Bun.argv[2] ?? Bun.env.OPENCODE_ISSUE
if (!id) {
  console.error("Missing issue id")
  process.exit(1)
}

const base = Bun.env.OPENCODE_WORKTREE_BASE ?? ".opencode-worktrees"
const dir = `${base}/issue-${id}`
const branch = `opencode/issue-${id}`

const remove = Bun.spawnSync(["git", "worktree", "remove", "--force", dir])
if (remove.exitCode !== 0) {
  process.exit(remove.exitCode)
}

Bun.spawnSync(["git", "branch", "-D", branch])
