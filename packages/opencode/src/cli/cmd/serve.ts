import { Server } from "../../server/server"
import { cmd } from "./cmd"
import { withNetworkOptions, resolveNetworkOptions } from "../network"
import { Flag } from "../../flag/flag"
import { Workspace } from "../../control-plane/workspace"
import { Project } from "../../project/project"
import { Installation } from "../../installation"
import { MCP } from "../../mcp"
import { Instance } from "../../project/instance"
import { Log } from "../../util/log"
import { Memory } from "../../diagnostic/memory"
import { Session } from "../../session"
import { SessionPrompt } from "../../session/prompt"
import { pickResume, ResumePrompt } from "../../session/auto-resume"
import { WorkspaceContext } from "../../control-plane/workspace-context"
import { InstanceBootstrap } from "../../project/bootstrap"

const log = Log.create({ service: "serve" })

function num(name: string, fallback: number) {
  const raw = Number(process.env[name])
  if (!Number.isFinite(raw)) return fallback
  return Math.max(0, Math.floor(raw))
}

export async function autoresume() {
  const scan = num("OPENCODE_SERVE_RESUME_SCAN_LIMIT", 30)
  const max = num("OPENCODE_SERVE_RESUME_MAX", 3)
  if (scan <= 0 || max <= 0) return

  await Session.recover()

  const list = [...Session.listResumable({ limit: scan })]
  let resumed = 0

  for (const session of list) {
    if (resumed >= max) break
    const msgs = await Session.messages({ sessionID: session.id }).catch((error) => {
      log.error("auto resume message load failed", { sessionID: session.id, error })
      return
    })
    if (!msgs) continue

    const hit = pickResume(msgs)
    if (!hit) continue

    const ok = await WorkspaceContext.provide({
      workspaceID: session.workspaceID,
      fn() {
        return Instance.provide({
          directory: session.directory,
          init: InstanceBootstrap,
          fn() {
            return SessionPrompt.prompt({
              sessionID: session.id,
              agent: hit.user.agent,
              model: hit.user.model,
              variant: hit.user.variant,
              parts: [{ type: "text", text: ResumePrompt }],
            })
          },
        })
      },
    })
      .then(() => true)
      .catch((error) => {
        log.error("auto resume failed", { sessionID: session.id, error })
        return false
      })
    if (!ok) continue

    resumed += 1
    log.info("auto resumed session", { sessionID: session.id, directory: session.directory, assistantID: hit.assistant.id })
  }

  log.info("auto resume complete", { scanned: list.length, resumed, scan_limit: scan, resume_limit: max })
}

export const ServeCommand = cmd({
  command: "serve",
  builder: (yargs) => withNetworkOptions(yargs),
  describe: "starts a headless opencode server",
  handler: async (args) => {
    if (!Flag.OPENCODE_SERVER_PASSWORD) {
      console.log("Warning: OPENCODE_SERVER_PASSWORD is not set; server is unsecured.")
    }
    const opts = await resolveNetworkOptions(args)
    Memory.start("serve")
    const server = Server.listen(opts)
    console.log(`opencode server listening on http://${server.hostname}:${server.port}`)
    void autoresume().catch((error) => {
      log.error("auto resume process failed", { error })
    })
    Session.startSweep()

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
    }

    const signal = await new Promise<string>((resolve) => {
      for (const item of ["SIGTERM", "SIGINT", "SIGHUP"] as const) {
        process.once(item, () => resolve(item))
      }
    })

    await shutdown(signal)
  },
})
