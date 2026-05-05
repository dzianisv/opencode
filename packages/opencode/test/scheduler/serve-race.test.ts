import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { ServeCommand } from "../../src/cli/cmd/serve"
import * as Network from "../../src/cli/network"
import { Server } from "../../src/server/server"
import { Session } from "../../src/session"
import { Memory } from "../../src/diagnostic/memory"
import { Instance } from "../../src/project/instance"
import { MCP } from "../../src/mcp"

const max = process.env.OPENCODE_SERVE_RESUME_MAX

afterEach(() => {
  if (max === undefined) delete process.env.OPENCODE_SERVE_RESUME_MAX
  else process.env.OPENCODE_SERVE_RESUME_MAX = max
  mock.restore()
})

describe("serve lifecycle", () => {
  test("waits for scheduler start before scheduler stop", async () => {
    process.env.OPENCODE_SERVE_RESUME_MAX = "0"
    spyOn(Network, "resolveNetworkOptions").mockResolvedValue({
      hostname: "127.0.0.1",
      port: 0,
      mdns: false,
      mdnsDomain: "opencode.local",
      cors: [],
    })
    spyOn(Server, "listen").mockReturnValue({
      hostname: "127.0.0.1",
      port: 4096,
      stop: async () => {},
    } as Awaited<ReturnType<typeof Server.listen>>)
    spyOn(Session, "startSweep").mockImplementation(() => {})
    spyOn(Session, "stopSweep").mockImplementation(() => {})
    spyOn(Memory, "start").mockImplementation(() => {})
    spyOn(Memory, "stop").mockImplementation(() => {})
    spyOn(Memory, "snapshot").mockResolvedValue()
    spyOn(MCP, "closeAll").mockResolvedValue()
    spyOn(Instance, "disposeAll").mockResolvedValue()

    const order: string[] = []
    let release = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let call = 0
    spyOn(Instance, "provide").mockImplementation(async () => {
      call += 1
      if (call === 1) {
        order.push("start")
        await gate
        return
      }
      order.push("stop")
    })

    const run = ServeCommand.handler({} as any)
    await Bun.sleep(10)
    process.emit("SIGINT", "SIGINT")
    await Bun.sleep(10)
    expect(order).toEqual(["start"])

    release()
    await run
    expect(order).toEqual(["start", "stop"])
  })
})
