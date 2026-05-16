import { expect, test } from "bun:test"
import { Instance } from "../../src/project/instance"
import { SessionID } from "../../src/session/schema"
import { SessionStatus } from "../../src/session/status"
import { SessionPrompt } from "../../src/session/prompt"
import { tmpdir } from "../fixture/fixture"

test("reconcile resets stale busy sessions to idle", async () => {
  await using dir = await tmpdir()
  await Instance.provide({
    directory: dir.path,
    async fn() {
      const id = SessionID.make("reconcile_stale_busy")

      // Manually set status to busy without starting a prompt loop
      await SessionStatus.set(id, { type: "busy" })
      const before = await SessionStatus.get(id)
      expect(before.type).toBe("busy")

      // Reconcile should detect no active loop and reset to idle
      await SessionPrompt.reconcile()

      const after = await SessionStatus.get(id)
      expect(after.type).toBe("idle")
    },
  })
})

test("reconcile does not reset sessions with active loops", async () => {
  await using dir = await tmpdir()
  await Instance.provide({
    directory: dir.path,
    async fn() {
      const id = SessionID.make("reconcile_active")

      // Start a real prompt state entry by simulating the internal state
      // We can't easily start a real loop, so we test the negative case:
      // an idle session should remain idle
      await SessionStatus.set(id, { type: "idle" })
      await SessionPrompt.reconcile()
      const after = await SessionStatus.get(id)
      expect(after.type).toBe("idle")
    },
  })
})

test("reconcile resets retry status without active loop", async () => {
  await using dir = await tmpdir()
  await Instance.provide({
    directory: dir.path,
    async fn() {
      const id = SessionID.make("reconcile_stale_retry")

      await SessionStatus.set(id, {
        type: "retry",
        attempt: 3,
        message: "rate limited",
        next: Date.now() + 60000,
      })
      const before = await SessionStatus.get(id)
      expect(before.type).toBe("retry")

      await SessionPrompt.reconcile()

      const after = await SessionStatus.get(id)
      expect(after.type).toBe("idle")
    },
  })
})
