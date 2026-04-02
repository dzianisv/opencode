import { describe, expect, test } from "bun:test"
import path from "path"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { Log } from "../../src/util/log"
import { WorkspaceContext } from "../../src/control-plane/workspace-context"
import { WorkspaceID } from "../../src/control-plane/schema"

const projectRoot = path.join(__dirname, "../..")
Log.init({ print: false })

describe("Session.list", () => {
  test("filters by directory", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const first = await Session.create({})

        const otherDir = path.join(projectRoot, "..", "__session_list_other")
        const second = await Instance.provide({
          directory: otherDir,
          fn: async () => Session.create({}),
        })

        const sessions = [...Session.list({ directory: projectRoot })]
        const ids = sessions.map((s) => s.id)

        expect(ids).toContain(first.id)
        expect(ids).not.toContain(second.id)
      },
    })
  })

  test("normalizes directory filter aliases", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const session = await Session.create({ title: "alias-filter-session" })
        const alias = `${projectRoot}${path.sep}..${path.sep}${path.basename(projectRoot)}`

        const sessions = await Instance.provide({
          directory: alias,
          fn: async () => [...Session.list({ directory: alias })],
        })
        const ids = sessions.map((s) => s.id)

        expect(ids).toContain(session.id)
      },
    })
  })

  test("filters root sessions", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const root = await Session.create({ title: "root-session" })
        const child = await Session.create({ title: "child-session", parentID: root.id })

        const sessions = [...Session.list({ roots: true })]
        const ids = sessions.map((s) => s.id)

        expect(ids).toContain(root.id)
        expect(ids).not.toContain(child.id)
      },
    })
  })

  test("filters by start time", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const session = await Session.create({ title: "new-session" })
        const futureStart = Date.now() + 86400000

        const sessions = [...Session.list({ start: futureStart })]
        expect(sessions.length).toBe(0)
      },
    })
  })

  test("filters by search term", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        await Session.create({ title: "unique-search-term-abc" })
        await Session.create({ title: "other-session-xyz" })

        const sessions = [...Session.list({ search: "unique-search" })]
        const titles = sessions.map((s) => s.title)

        expect(titles).toContain("unique-search-term-abc")
        expect(titles).not.toContain("other-session-xyz")
      },
    })
  })

  test("respects limit parameter", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        await Session.create({ title: "session-1" })
        await Session.create({ title: "session-2" })
        await Session.create({ title: "session-3" })

        const sessions = [...Session.list({ limit: 2 })]
        expect(sessions.length).toBe(2)
      },
    })
  })

  test("includes unscoped sessions inside workspace context", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const workspace = WorkspaceID.ascending()
        const scoped = await Session.create({ title: "workspace-session", workspaceID: workspace })
        const legacy = await Session.create({ title: "legacy-session" })
        const other = await Session.create({ title: "other-workspace-session", workspaceID: WorkspaceID.ascending() })

        const sessions = await WorkspaceContext.provide({
          workspaceID: workspace,
          fn: async () => [...Session.list({})],
        })
        const ids = sessions.map((s) => s.id)

        expect(ids).toContain(scoped.id)
        expect(ids).toContain(legacy.id)
        expect(ids).not.toContain(other.id)
      },
    })
  })
})
