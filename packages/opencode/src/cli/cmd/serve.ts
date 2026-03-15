import { Server } from "../../server/server"
import { cmd } from "./cmd"
import { withNetworkOptions, resolveNetworkOptions } from "../network"
import { Flag } from "../../flag/flag"
import { Workspace } from "../../control-plane/workspace"
import { Project } from "../../project/project"
import { Installation } from "../../installation"
import { Memory } from "../../diagnostic/memory"
import { Session } from "../../session"
import { MCP } from "../../mcp"
import { Instance } from "../../project/instance"
import { Log } from "../../util/log"

const log = Log.create({ service: "serve" })

export const ServeCommand = cmd({
  command: "serve",
  builder: (yargs) => withNetworkOptions(yargs),
  describe: "starts a headless opencode server",
  handler: async (args) => {
    if (!Flag.OPENCODE_SERVER_PASSWORD) {
      console.log("Warning: OPENCODE_SERVER_PASSWORD is not set; server is unsecured.")
    }
    const opts = await resolveNetworkOptions(args)
    const server = Server.listen(opts)
    console.log(`opencode server listening on http://${server.hostname}:${server.port}`)

    const shutdown = async (signal: string) => {
      log.warn("received signal, shutting down", { signal })
      Session.stopSweep()
      await Memory.snapshot({ reason: `shutdown:${signal}` }).catch((e) => {
        log.error("shutdown snapshot failed", { error: e })
      })
      Memory.stop()
      await Instance.disposeAll().catch((e: unknown) => {
        log.error("instance disposal failed", { error: e })
      })
      await MCP.closeAll().catch((e: unknown) => {
        log.error("mcp close failed", { error: e })
      })
      await server.stop()
      process.exit(0)
    }

    process.on("SIGTERM", () => void shutdown("SIGTERM"))
    process.on("SIGINT", () => void shutdown("SIGINT"))
    await new Promise(() => {})
    await server.stop()
  },
})
