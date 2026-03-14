const tests = [
  "e2e/projects/projects-switch.spec.ts",
  "e2e/projects/workspaces.spec.ts",
  "e2e/projects/workspace-new-session.spec.ts",
  "e2e/terminal/terminal-tabs.spec.ts",
]

const args = process.argv.slice(2)
const flags = args.some((x) => x.startsWith("--workers")) ? [] : ["--workers=1"]
const cmd = ["bun", "script/e2e-local.ts", ...flags, ...tests, ...args]

const proc = Bun.spawn(cmd, {
  cwd: process.cwd(),
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
})

process.exit(await proc.exited)
