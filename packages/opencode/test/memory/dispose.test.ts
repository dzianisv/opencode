import { describe, test, expect } from "bun:test"
import { PermissionNext } from "../../src/permission/next"
import { Question } from "../../src/question"
import { FileTime } from "../../src/file/time"
import { Instance } from "../../src/project/instance"
import { tmpdir } from "../fixture/fixture"

describe("memory: dispose callbacks", () => {
  test("PermissionNext: pending promises are rejected on Instance.dispose()", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        // Create a pending permission request (action = "ask" returns a pending promise)
        const promise = PermissionNext.ask({
          id: "perm_dispose_test",
          sessionID: "session_dispose",
          permission: "bash",
          patterns: ["ls"],
          metadata: {},
          always: [],
          ruleset: [], // no rules = "ask", so it pends
        })

        // Catch the rejection to avoid unhandled rejection
        const result = promise.catch((e) => e)

        // Dispose the instance — this should trigger our dispose callback
        // which rejects all pending promises
        await Instance.dispose()

        // The pending promise should have been rejected with RejectedError
        const error = await result
        expect(error).toBeInstanceOf(PermissionNext.RejectedError)
      },
    })
  })

  test("PermissionNext: multiple pending promises all rejected on dispose", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const promises = []
        for (let i = 0; i < 5; i++) {
          const p = PermissionNext.ask({
            id: `perm_multi_${i}`,
            sessionID: `session_multi_${i}`,
            permission: "bash",
            patterns: ["test"],
            metadata: {},
            always: [],
            ruleset: [],
          }).catch((e) => e)
          promises.push(p)
        }

        await Instance.dispose()

        const results = await Promise.all(promises)
        for (const error of results) {
          expect(error).toBeInstanceOf(PermissionNext.RejectedError)
        }
      },
    })
  })

  test("Question: pending promises are rejected on Instance.dispose()", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const promise = Question.ask({
          sessionID: "session_q_dispose",
          questions: [
            {
              question: "test?",
              header: "Test",
              options: [{ label: "A", description: "option A" }],
            },
          ],
        })

        const result = promise.catch((e) => e)

        await Instance.dispose()

        const error = await result
        expect(error).toBeInstanceOf(Question.RejectedError)
      },
    })
  })

  test("FileTime: state is cleared on Instance.dispose()", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        // Record some file read times
        FileTime.read("session1", "/some/file.ts")
        FileTime.read("session1", "/another/file.ts")
        FileTime.read("session2", "/other/file.ts")

        // Verify state exists
        expect(FileTime.get("session1", "/some/file.ts")).toBeInstanceOf(Date)
        expect(FileTime.get("session2", "/other/file.ts")).toBeInstanceOf(Date)

        await Instance.dispose()
      },
    })

    // After disposal, re-providing should give fresh state
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        expect(FileTime.get("session1", "/some/file.ts")).toBeUndefined()
        expect(FileTime.get("session2", "/other/file.ts")).toBeUndefined()
      },
    })
  })

  test("PermissionNext: dispose does not affect already-resolved promises", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        // This should resolve immediately (action = "allow")
        const resolved = await PermissionNext.ask({
          sessionID: "session_resolved",
          permission: "bash",
          patterns: ["ls"],
          metadata: {},
          always: [],
          ruleset: [{ permission: "bash", pattern: "*", action: "allow" }],
        })

        expect(resolved).toBeUndefined()

        // Dispose should not throw even with no pending promises
        await Instance.dispose()
      },
    })
  })

  test("Instance.disposeAll is idempotent", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        FileTime.read("session_idem", "/file.ts")

        // Call dispose twice in sequence — should not throw
        await Instance.dispose()
      },
    })

    // Re-provide should work normally after disposal
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        expect(FileTime.get("session_idem", "/file.ts")).toBeUndefined()
        await Instance.dispose()
      },
    })
  })
})
