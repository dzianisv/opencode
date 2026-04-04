import { expect, spyOn, test } from "bun:test"
import { Bus } from "../../src/bus"
import { Instance } from "../../src/project/instance"
import { SessionID } from "../../src/session/schema"
import { SessionStatus } from "../../src/session/status"
import { tmpdir } from "../fixture/fixture"

test("session status clears idle state before publish rejection", async () => {
  await using dir = await tmpdir()
  await Instance.provide({
    directory: dir.path,
    async fn() {
      const id = SessionID.make("session_status_idle_publish_failure")
      const base = Bus.publish
      const mock = spyOn(Bus, "publish").mockImplementation(async (def, props) => {
        if (def.type === SessionStatus.Event.Status.type) {
          const info =
            typeof props === "object" && props && "status" in props
              ? (props as { status?: { type?: string } }).status
              : undefined
          if (info?.type === "idle") {
            throw new Error("publish failed")
          }
        }
        return base(def as never, props as never)
      })

      await SessionStatus.set(id, { type: "busy" })
      const result = await SessionStatus.set(id, { type: "idle" })
        .then(() => "ok" as const)
        .catch(() => "error" as const)
      const now = await SessionStatus.get(id)
      mock.mockRestore()

      expect(result).toBe("error")
      expect(now.type).toBe("idle")
    },
  })
})
