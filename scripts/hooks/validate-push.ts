#!/usr/bin/env bun
/**
 * validate-push.ts — AI-powered pre-push validation
 *
 * Called from .husky/pre-push. Receives git push refs on stdin.
 * Runs fast invariant checks first, then spawns Claude as a validation
 * agent to verify feature completeness and run smoke tests.
 *
 * Skip AI only:  SKIP_AI_VALIDATION=1 git push
 * Skip entirely: git push --no-verify
 */

import { existsSync, readFileSync } from "fs"
import { spawnSync } from "child_process"

const RED = "\x1b[31m"
const GREEN = "\x1b[32m"
const YELLOW = "\x1b[33m"
const BOLD = "\x1b[1m"
const RESET = "\x1b[0m"
const DIM = "\x1b[2m"

const out = (msg: string) => process.stderr.write(msg + "\n")
const ok = (msg: string) => out(`${GREEN}  ✓${RESET} ${msg}`)
const fail = (msg: string) => out(`${RED}  ✗${RESET} ${msg}`)
const info = (msg: string) => out(`${YELLOW}  →${RESET} ${msg}`)
const dim = (msg: string) => out(`${DIM}${msg}${RESET}`)

// ─── Parse git push refs from stdin ──────────────────────────────────────────
// Format: "<local-ref> <local-sha1> <remote-ref> <remote-sha1>"
const stdin = readFileSync("/dev/stdin", "utf8")
const refs = stdin
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [localRef, localSha, remoteRef, remoteSha] = line.split(" ")
    return { localRef, localSha, remoteRef, remoteSha }
  })

const targetBranches = refs.map((r) => r.remoteRef || "").filter(Boolean)
const pushingToProtected = targetBranches.some((b) => b.includes("/dev") || b.includes("/main"))

// ─── Feature invariant checks (instant, no AI) ───────────────────────────────
out(`\n${BOLD}[pre-push] Feature invariants${RESET}`)

const INVARIANTS: Array<{ desc: string; check: () => boolean; fatal: boolean }> = [
  {
    // v2 design: recent sessions are native to sidebar-project.tsx (no sidebar-recent.tsx)
    desc: "sidebar-project.tsx has recentSessions (v2 recent sessions)",
    check: () => {
      const f = "packages/app/src/pages/layout/sidebar-project.tsx"
      return existsSync(f) && readFileSync(f, "utf8").includes("recentSessions")
    },
    fatal: true,
  },
  {
    desc: "layout.tsx imports SortableProject (v2 layout intact)",
    check: () => {
      const f = "packages/app/src/pages/layout.tsx"
      return existsSync(f) && readFileSync(f, "utf8").includes("SortableProject")
    },
    fatal: true,
  },
  {
    desc: "sidebar-shell.tsx has SidebarContent (nav rail intact)",
    check: () => {
      const f = "packages/app/src/pages/layout/sidebar-shell.tsx"
      return existsSync(f) && readFileSync(f, "utf8").includes("SidebarContent")
    },
    fatal: true,
  },
]

let invariantErrors = 0
for (const { desc, check } of INVARIANTS) {
  if (check()) ok(desc)
  else {
    fail(desc)
    invariantErrors++
  }
}

if (invariantErrors > 0) {
  out(`\n${RED}${BOLD}PUSH BLOCKED: ${invariantErrors} v2 layout invariant(s) missing.${RESET}`)
  out(`The v2 layout was likely broken during a rebase.`)
  out(`See FORK.md "Invariants That Must Survive Every Rebase".`)
  out(`${DIM}To bypass: git push --no-verify${RESET}\n`)
  process.exit(1)
}

// ─── Skip AI if requested ─────────────────────────────────────────────────────
if (process.env.SKIP_AI_VALIDATION === "1") {
  info("SKIP_AI_VALIDATION=1 — skipping AI agent validation")
  process.exit(0)
}

// Only run deep AI validation when pushing to protected branches
if (!pushingToProtected) {
  info("Not pushing to dev/main — skipping AI validation")
  process.exit(0)
}

// Check if any app or opencode package files changed vs remote
const diffResult = spawnSync(
  "git",
  ["diff", "--name-only", refs[0]?.remoteSha || "origin/dev", "HEAD"],
  { encoding: "utf8" },
)
const changedFiles = diffResult.stdout || ""
const hasAppChanges =
  changedFiles.includes("packages/app/") || changedFiles.includes("packages/opencode/")

if (!hasAppChanges) {
  info("No app/opencode changes detected — skipping AI validation")
  process.exit(0)
}

// ─── AI validation agent ──────────────────────────────────────────────────────
out(`\n${BOLD}[pre-push] AI validation agent${RESET}`)
info("Spawning Claude to verify feature completeness + run smoke tests...")
dim("  This checks what grep can't: build errors, missing wiring, broken routes.")
dim("  Budget cap: $0.30 | Timeout: 5min | Skip: SKIP_AI_VALIDATION=1\n")

const repoRoot = process.cwd()
const openCodeUrl = process.env.OPENCODE_URL || "http://100.108.64.76:4096"

const VALIDATION_PROMPT = `You are a pre-push validation agent for the dzianisv/opencode fork.
Working directory: ${repoRoot}
Remote: ${openCodeUrl}

A developer is pushing changes to the dev branch. Verify the build is not broken
and the "recent sessions" feature is present and functional.

Run ALL of the following checks using bash. Do not skip any.

## 1. Feature invariants
\`\`\`bash
test -f packages/app/src/pages/layout/sidebar-recent.tsx && echo "OK sidebar-recent.tsx" || echo "FAIL sidebar-recent.tsx"
grep -q "RecentTile" packages/app/src/pages/layout.tsx && echo "OK RecentTile" || echo "FAIL RecentTile"
grep -q "RecentSidebarPanel" packages/app/src/pages/layout.tsx && echo "OK RecentSidebarPanel" || echo "FAIL RecentSidebarPanel"
grep -q 'sidebarView' packages/app/src/pages/layout.tsx && echo "OK sidebarView" || echo "FAIL sidebarView"
grep -q '"/recent"' packages/app/src/app.tsx && echo "OK /recent route" || echo "FAIL /recent route"
\`\`\`

## 2. Build check (catches TypeScript errors and broken imports)
\`\`\`bash
cd packages/app && bun run build 2>&1 | tail -20
\`\`\`

## 3. Smoke test
\`\`\`bash
bash packages/app/scripts/smoke-recent-sessions.sh 2>&1
\`\`\`

## 4. Live server check (verify sessions endpoint returns data)
\`\`\`bash
curl -sf --max-time 5 "${openCodeUrl}/session?roots=true&limit=5" \\
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Server sessions: {len(d)} (PASS)' if d else 'WARNING: 0 sessions returned')" \\
  || echo "WARNING: server unreachable at ${openCodeUrl} (non-fatal)"
\`\`\`

After running ALL checks, output EXACTLY one of these as your final line:
VALIDATION_PASSED: <one-line summary of what passed>
VALIDATION_FAILED: <specific reason — which check failed and why>

Rules:
- Do NOT skip any check
- Do NOT ask questions  
- VALIDATION_FAILED if build has errors or any FAIL invariant
- VALIDATION_FAILED if smoke test exits non-zero
- Server unreachable is a WARNING, not a failure`

const claudeBin = "/home/azureuser/.local/bin/claude"
if (!existsSync(claudeBin)) {
  out(`${YELLOW}[pre-push] claude CLI not found at ${claudeBin} — skipping AI validation${RESET}`)
  out(`Install Claude Code CLI to enable AI validation: https://claude.ai/code`)
  process.exit(0)
}

const result = spawnSync(
  claudeBin,
  [
    "--print",
    "--allowedTools",
    "Bash,Read",
    "--max-budget-usd",
    "0.30",
    "--model",
    "claude-sonnet-4-5",
    "-p",
    VALIDATION_PROMPT,
  ],
  {
    encoding: "utf8",
    timeout: 5 * 60 * 1000,
    cwd: repoRoot,
    env: { ...process.env, OPENCODE_URL: openCodeUrl },
  },
)

const agentOutput = ((result.stdout || "") + (result.stderr || "")).trim()
out(agentOutput)

// Parse verdict from agent output
const verdictLine = agentOutput
  .split("\n")
  .reverse()
  .find((l) => l.startsWith("VALIDATION_PASSED") || l.startsWith("VALIDATION_FAILED"))

if (!verdictLine) {
  if (result.status !== 0) {
    out(`\n${RED}${BOLD}PUSH BLOCKED: AI validation agent failed (exit ${result.status}).${RESET}`)
    out(`${DIM}To bypass: SKIP_AI_VALIDATION=1 git push  or  git push --no-verify${RESET}\n`)
    process.exit(1)
  }
  out(`\n${YELLOW}AI agent produced no verdict — assuming pass (agent may have timed out)${RESET}`)
  process.exit(0)
}

if (verdictLine.startsWith("VALIDATION_FAILED")) {
  out(`\n${RED}${BOLD}PUSH BLOCKED: ${verdictLine}${RESET}`)
  out(`Fix the issues above, then retry.`)
  out(`${DIM}To bypass: SKIP_AI_VALIDATION=1 git push  or  git push --no-verify${RESET}\n`)
  process.exit(1)
}

out(`\n${GREEN}${BOLD}${verdictLine}${RESET}\n`)
process.exit(0)
