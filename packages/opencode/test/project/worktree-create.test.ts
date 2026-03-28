import { describe, expect, spyOn, test } from "bun:test"
import { $ } from "bun"
import path from "path"
import { Instance } from "../../src/project/instance"
import { Worktree } from "../../src/worktree"
import { tmpdir } from "../fixture/fixture"

describe("Worktree.makeWorktreeInfo", () => {
  test("uses the project folder and a numeric timestamp", async () => {
    await using tmp = await tmpdir({ git: true })
    const now = spyOn(Date, "now").mockReturnValue(new Date("2026-03-27T14:05:00").getTime())

    try {
      const info = await Instance.provide({
        directory: tmp.path,
        fn: () => Worktree.makeWorktreeInfo(),
      })

      const name = `${path.basename(tmp.path)}-2026-03-27-14-05`
      expect(info.name).toBe(name)
      expect(info.branch).toBe(`opencode/${name}`)
      expect(path.basename(info.directory)).toBe(name)
    } finally {
      now.mockRestore()
    }
  })

  test("adds a numeric suffix when the timestamped name already exists", async () => {
    await using tmp = await tmpdir({ git: true })
    const now = spyOn(Date, "now").mockReturnValue(new Date("2026-03-27T14:05:00").getTime())

    try {
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const first = await Worktree.makeWorktreeInfo()
          await $`git branch ${first.branch}`.cwd(tmp.path).quiet()

          const second = await Worktree.makeWorktreeInfo()

          expect(second.name).toBe(`${first.name}-2`)
          expect(second.branch).toBe(`opencode/${first.name}-2`)
        },
      })
    } finally {
      now.mockRestore()
    }
  })
})
