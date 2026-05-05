import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import path from "path"
import { Instance } from "../../src/project/instance"
import { SchedulerHeartbeat } from "../../src/scheduler/heartbeat"
import { SessionPrompt } from "../../src/session/prompt"
import { Session } from "../../src/session"
import { Provider } from "../../src/provider/provider"
import { tmpdir } from "../fixture/fixture"
import { ProviderID, ModelID } from "../../src/provider/schema"

afterEach(() => {
  mock.restore()
  SchedulerHeartbeat.stop()
})

describe("scheduler.heartbeat", () => {
  test("skips when HEARTBEAT.md missing or blank", async () => {
    await using tmp = await tmpdir()
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const prompt = spyOn(SessionPrompt, "prompt")
        await SchedulerHeartbeat.run()
        await Bun.write(path.join(tmp.path, "HEARTBEAT.md"), "   ")
        await SchedulerHeartbeat.run()
        expect(prompt).not.toHaveBeenCalled()
      },
    })
  })

  test("runs heartbeat prompt and accepts HEARTBEAT_OK", async () => {
    await using tmp = await tmpdir({ git: true })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        await Bun.write(path.join(Instance.worktree, "HEARTBEAT.md"), "Say HEARTBEAT_OK")
        spyOn(Provider, "defaultModel").mockResolvedValue({
          providerID: ProviderID.make("opencode"),
          modelID: ModelID.make("gpt-5-mini"),
        })
        spyOn(Session, "create").mockResolvedValue(
          { id: "session_heartbeat" } as unknown as Awaited<ReturnType<typeof Session.create>>,
        )
        const prompt = spyOn(SessionPrompt, "prompt").mockResolvedValue({
          parts: [{ type: "text", text: "HEARTBEAT_OK" }],
        } as unknown as Awaited<ReturnType<typeof SessionPrompt.prompt>>)

        await SchedulerHeartbeat.run()
        expect(prompt).toHaveBeenCalledTimes(1)
      },
    })
  })
})
