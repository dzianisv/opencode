import { test, expect } from "bun:test"
import { $ } from "bun"
import fs from "fs/promises"
import path from "path"
import { latestRootSessionID } from "../../src/cli/cmd/run"
import { SessionListCommand } from "../../src/cli/cmd/session"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { tmpdir } from "../fixture/fixture"

test("latestRootSessionID requests sessions for the current directory", async () => {
  const calls: Array<Record<string, string>> = []
  const sdk = {
    session: {
      list: async (query?: Record<string, string>) => {
        calls.push(query ?? {})
        return {
          data: [
            { id: "ses_child", parentID: "ses_root" },
            { id: "ses_root" },
          ],
        }
      },
    },
  } as any

  const id = await latestRootSessionID(sdk, "/tmp/worktree")

  expect(id).toBe("ses_root")
  expect(calls).toEqual([{ directory: "/tmp/worktree" }])
})

test("SessionListCommand only lists sessions for the current worktree", async () => {
  await using tmp = await tmpdir({ git: true })
  const root = tmp.path
  const name = `session-worktree-${Date.now().toString(36)}`
  const branch = `opencode/${name}`
  const dir = path.join(root, "..", name)

  await $`git worktree add --no-checkout -b ${branch} ${dir}`.cwd(root).quiet()
  await $`git reset --hard`.cwd(dir).quiet()

  const rootSession = await Instance.provide({
    directory: root,
    fn: async () => Session.create({ title: "root-session" }),
  })
  const worktreeSession = await Instance.provide({
    directory: dir,
    fn: async () => Session.create({ title: "worktree-session" }),
  })

  const cwd = process.cwd()
  const seen: string[] = []
  const log = console.log

  try {
    console.log = (...args) => {
      seen.push(args.join(" "))
    }
    process.chdir(dir)
    await SessionListCommand.handler({ format: "json" } as any)
  } finally {
    console.log = log
    process.chdir(cwd)
    await Instance.disposeAll().catch(() => undefined)
    await $`git worktree remove --force ${dir}`.cwd(root).quiet().nothrow()
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined)
  }

  const listed = JSON.parse(seen.join("\n")) as Array<{ id: string }>
  const ids = listed.map((item) => item.id)

  expect(ids).toContain(worktreeSession.id)
  expect(ids).not.toContain(rootSession.id)
})
