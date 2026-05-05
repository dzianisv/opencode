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
import { SessionRevert } from "../../session/revert"
import { pickAction, ResumePrompt } from "../../session/auto-resume"
import { WorkspaceContext } from "../../control-plane/workspace-context"
import { InstanceBootstrap } from "../../project/bootstrap"
import { Scheduler } from "../../scheduler"

const log = Log.create({ service: "serve" })

function num(name: string, fallback: number) {
  const raw = Number(process.env[name])
  if (!Number.isFinite(raw)) return fallback
  return Math.max(0, Math.floor(raw))
}

export async function autoresume() {
  const scan = num("OPENCODE_SERVE_RESUME_SCAN_LIMIT", 30)
  const max = num("OPENCODE_SERVE_RESUME_MAX", 3)
  const age = num("OPENCODE_SERVE_RESUME_AGE_MS", 60 * 60 * 1000)
  if (scan <= 0 || max <= 0) return

  await Session.recover()

  // Collect candidates from both interrupted and unanswered sessions
  const interrupted = [...Session.listResumable({ limit: scan })]
  const unanswered = [...Session.listUnanswered({ limit: scan, age })]

  // Deduplicate: unanswered takes priority over interrupted for the same session
  const seen = new Set<string>()
  type Candidate = { session: Session.Info; source: "unanswered" | "interrupted" }
  const candidates: Candidate[] = []

  for (const session of unanswered) {
    if (seen.has(session.id)) continue
    seen.add(session.id)
    candidates.push({ session, source: "unanswered" })
  }
  for (const session of interrupted) {
    if (seen.has(session.id)) continue
    seen.add(session.id)
    candidates.push({ session, source: "interrupted" })
  }

  let resumed = 0

  for (const { session, source } of candidates) {
    if (resumed >= max) break
    const msgs = await Session.messages({ sessionID: session.id }).catch((error) => {
      log.error("auto resume message load failed", { sessionID: session.id, error })
      return
    })
    if (!msgs) continue

    const action = pickAction(msgs)
    if (!action) continue

    const ok = await WorkspaceContext.provide({
      workspaceID: session.workspaceID,
      fn() {
        return Instance.provide({
          directory: session.directory,
          init: InstanceBootstrap,
          async fn() {
            if (action.type === "unanswered") {
              // User message already exists — run cleanup + touch + loop directly
              await SessionRevert.cleanup(session)
              await Session.touch(session.id)
              return SessionPrompt.loop({ sessionID: session.id })
            }
            // Interrupted assistant — inject a resume prompt
            return SessionPrompt.prompt({
              sessionID: session.id,
              agent: action.user.agent,
              model: action.user.model,
              variant: action.user.variant,
              parts: [{ type: "text", text: ResumePrompt }],
            })
          },
        })
      },
    })
      .then(() => true)
      .catch((error) => {
        log.error("auto resume failed", { sessionID: session.id, type: action.type, error })
        return false
      })
    if (!ok) continue

    resumed += 1
    log.info("auto resumed session", {
      sessionID: session.id,
      type: action.type,
      directory: session.directory,
    })
  }

  log.info("auto resume complete", {
    scanned: candidates.length,
    resumed,
    interrupted: interrupted.length,
    unanswered: unanswered.length,
    scan_limit: scan,
    resume_limit: max,
  })
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
    const scheduler = Instance.provide({
      directory: process.cwd(),
      init: InstanceBootstrap,
      fn: () => Scheduler.start(),
    }).catch((error) => {
      log.error("scheduler start failed", { error })
    })

    const shutdown = async (signal: string) => {
      log.warn("received signal, shutting down", { signal })
      Session.stopSweep()
      await scheduler
      await Instance.provide({
        directory: process.cwd(),
        init: InstanceBootstrap,
        fn: () => Scheduler.stop(),
      }).catch((e) => {
        log.error("scheduler stop failed", { error: e })
      })
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
