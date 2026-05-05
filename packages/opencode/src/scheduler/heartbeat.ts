import path from "path"
import { Log } from "../util/log"
import { Filesystem } from "../util/filesystem"
import { Instance } from "../project/instance"
import { Session } from "../session"
import { SessionPrompt } from "../session/prompt"
import { Provider } from "../provider/provider"
import { Config } from "../config/config"
import type { SessionID } from "../session/schema"

export namespace SchedulerHeartbeat {
  const log = Log.create({ service: "scheduler.heartbeat" })

  const state: {
    timer?: ReturnType<typeof setTimeout>
    running: boolean
    sessionID?: SessionID
  } = {
    running: false,
  }

  function parse(input: string) {
    const text = input.trim()
    if (!text) return 30 * 60 * 1000
    const num = Number(text.replace(/[a-zA-Z]+$/, ""))
    const unit = text.slice(String(num).length).toLowerCase()
    if (!Number.isFinite(num) || num <= 0) return 30 * 60 * 1000
    if (unit === "ms") return Math.floor(num)
    if (unit === "s") return Math.floor(num * 1000)
    if (unit === "m" || unit === "") return Math.floor(num * 60 * 1000)
    if (unit === "h") return Math.floor(num * 60 * 60 * 1000)
    if (unit === "d") return Math.floor(num * 24 * 60 * 60 * 1000)
    return 30 * 60 * 1000
  }

  async function session() {
    if (state.sessionID) return state.sessionID
    const created = await Session.create({ title: "Heartbeat" })
    state.sessionID = created.id
    return created.id
  }

  export async function run() {
    const file = path.join(Instance.worktree, "HEARTBEAT.md")
    const text = await Filesystem.readText(file).catch((err) => {
      if (typeof err === "object" && err && "code" in err && err.code === "ENOENT") return ""
      throw err
    })
    const prompt = text.trim()
    if (!prompt) return

    const sessionID = await session()
    const model = await Provider.defaultModel()
    const msg = await SessionPrompt.prompt({
      sessionID,
      model,
      parts: [{ type: "text", text: prompt }],
    })
    const output = msg.parts.findLast((x) => x.type === "text")?.text?.trim()
    if (output === "HEARTBEAT_OK") return
    log.info("heartbeat prompt completed", { sessionID })
  }

  async function tick() {
    if (!state.running) return
    const cfg = await Config.get()
    const ms = parse(cfg.scheduler?.heartbeat?.interval ?? "30m")
    await run().catch((error) => {
      log.error("heartbeat run failed", { error })
    })
    if (!state.running) return
    state.timer = setTimeout(() => {
      void tick()
    }, ms)
    state.timer.unref?.()
  }

  export async function start() {
    if (state.running) return
    const cfg = await Config.get()
    if ((cfg.scheduler?.heartbeat?.enabled ?? true) === false) return
    state.running = true
    await tick()
  }

  export function stop() {
    state.running = false
    if (!state.timer) return
    clearTimeout(state.timer)
    state.timer = undefined
  }
}
