import type { Argv } from "yargs"
import { cmd } from "./cmd"
import { Session } from "../../session"
import { bootstrap } from "../bootstrap"
import { UI } from "../ui"
import { Locale } from "../../util/locale"
import { Flag } from "../../flag/flag"
import { Filesystem } from "../../util/filesystem"
import { EOL } from "os"
import path from "path"
import { Global } from "../../global"
import { Instance } from "../../project/instance"
import fs from "fs/promises"

function pagerCmd(): string[] {
  const lessOptions = ["-R", "-S"]
  if (process.platform !== "win32") {
    return ["less", ...lessOptions]
  }

  // user could have less installed via other options
  const lessOnPath = Bun.which("less")
  if (lessOnPath) {
    if (Filesystem.stat(lessOnPath)?.size) return [lessOnPath, ...lessOptions]
  }

  if (Flag.OPENCODE_GIT_BASH_PATH) {
    const less = path.join(Flag.OPENCODE_GIT_BASH_PATH, "..", "..", "usr", "bin", "less.exe")
    if (Filesystem.stat(less)?.size) return [less, ...lessOptions]
  }

  const git = Bun.which("git")
  if (git) {
    const less = path.join(git, "..", "..", "usr", "bin", "less.exe")
    if (Filesystem.stat(less)?.size) return [less, ...lessOptions]
  }

  // Fall back to Windows built-in more (via cmd.exe)
  return ["cmd", "/c", "more"]
}

export const SessionCommand = cmd({
  command: "session",
  describe: "manage sessions",
  builder: (yargs: Argv) =>
    yargs.command(SessionListCommand).command(SessionDeleteCommand).command(SessionPruneCommand).demandCommand(),
  async handler() {},
})

export const SessionDeleteCommand = cmd({
  command: "delete <sessionID>",
  describe: "delete a session",
  builder: (yargs: Argv) => {
    return yargs.positional("sessionID", {
      describe: "session ID to delete",
      type: "string",
      demandOption: true,
    })
  },
  handler: async (args) => {
    await bootstrap(process.cwd(), async () => {
      try {
        await Session.get(args.sessionID)
      } catch {
        UI.error(`Session not found: ${args.sessionID}`)
        process.exit(1)
      }
      await Session.remove(args.sessionID)
      UI.println(UI.Style.TEXT_SUCCESS_BOLD + `Session ${args.sessionID} deleted` + UI.Style.TEXT_NORMAL)
    })
  },
})

export const SessionListCommand = cmd({
  command: "list",
  describe: "list sessions",
  builder: (yargs: Argv) => {
    return yargs
      .option("max-count", {
        alias: "n",
        describe: "limit to N most recent sessions",
        type: "number",
      })
      .option("format", {
        describe: "output format",
        type: "string",
        choices: ["table", "json"],
        default: "table",
      })
  },
  handler: async (args) => {
    await bootstrap(process.cwd(), async () => {
      const sessions = [...Session.list({ roots: true, limit: args.maxCount })]

      if (sessions.length === 0) {
        return
      }

      let output: string
      if (args.format === "json") {
        output = formatSessionJSON(sessions)
      } else {
        output = formatSessionTable(sessions)
      }

      const shouldPaginate = process.stdout.isTTY && !args.maxCount && args.format === "table"

      if (shouldPaginate) {
        const proc = Bun.spawn({
          cmd: pagerCmd(),
          stdin: "pipe",
          stdout: "inherit",
          stderr: "inherit",
        })

        proc.stdin.write(output)
        proc.stdin.end()
        await proc.exited
      } else {
        console.log(output)
      }
    })
  },
})

function formatSessionTable(sessions: Session.Info[]): string {
  const lines: string[] = []

  const maxIdWidth = Math.max(20, ...sessions.map((s) => s.id.length))
  const maxTitleWidth = Math.max(25, ...sessions.map((s) => s.title.length))

  const header = `Session ID${" ".repeat(maxIdWidth - 10)}  Title${" ".repeat(maxTitleWidth - 5)}  Updated`
  lines.push(header)
  lines.push("─".repeat(header.length))
  for (const session of sessions) {
    const truncatedTitle = Locale.truncate(session.title, maxTitleWidth)
    const timeStr = Locale.todayTimeOrDateTime(session.time.updated)
    const line = `${session.id.padEnd(maxIdWidth)}  ${truncatedTitle.padEnd(maxTitleWidth)}  ${timeStr}`
    lines.push(line)
  }

  return lines.join(EOL)
}

function formatSessionJSON(sessions: Session.Info[]): string {
  const jsonData = sessions.map((session) => ({
    id: session.id,
    title: session.title,
    updated: session.time.updated,
    created: session.time.created,
    projectId: session.projectID,
    directory: session.directory,
  }))
  return JSON.stringify(jsonData, null, 2)
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([dhwm])$/)
  if (!match) throw new Error(`Invalid duration format: ${duration}. Use format like 1d, 7d, 2w, 1m`)

  const value = parseInt(match[1], 10)
  const unit = match[2]

  const ms = {
    d: 24 * 60 * 60 * 1000,
    h: 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    m: 30 * 24 * 60 * 60 * 1000,
  }[unit]!

  return value * ms
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MB"
  return (bytes / 1024 / 1024 / 1024).toFixed(1) + " GB"
}

async function getDirectorySize(dir: string): Promise<number> {
  try {
    let size = 0
    for await (const file of new Bun.Glob("**/*").scan({ cwd: dir, absolute: true, onlyFiles: true })) {
      try {
        const stat = await fs.stat(file)
        size += stat.size
      } catch {}
    }
    return size
  } catch {
    return 0
  }
}

export const SessionPruneCommand = cmd({
  command: "prune <duration>",
  describe: "delete sessions older than the specified duration",
  builder: (yargs: Argv) => {
    return yargs
      .positional("duration", {
        describe: "duration (e.g., 1d, 7d, 2w, 1m for days/hours/weeks/months)",
        type: "string",
        demandOption: true,
      })
      .option("dry-run", {
        describe: "show what would be deleted without deleting",
        type: "boolean",
        default: false,
      })
      .option("force", {
        alias: "f",
        describe: "skip confirmation prompt",
        type: "boolean",
        default: false,
      })
      .option("all", {
        alias: "a",
        describe: "prune sessions from all projects (not just current)",
        type: "boolean",
        default: false,
      })
      .option("logs", {
        describe: "also prune old log files",
        type: "boolean",
        default: false,
      })
      .option("snapshots", {
        describe: "also prune orphaned snapshots",
        type: "boolean",
        default: false,
      })
  },
  handler: async (args) => {
    const duration = parseDuration(args.duration as string)
    const cutoff = Date.now() - duration
    const dryRun = args.dryRun as boolean
    const force = args.force as boolean
    const pruneAll = args.all as boolean
    const pruneLogs = args.logs as boolean
    const pruneSnapshots = args.snapshots as boolean

    await bootstrap(process.cwd(), async () => {
      const sessionsToDelete: Array<{ session: Session.Info; project: string }> = []
      let totalSize = 0

      // Get all projects
      const storageDir = path.join(Global.Path.data, "storage")
      const sessionDir = path.join(storageDir, "session")

      let projects: string[] = []
      try {
        projects = await fs.readdir(sessionDir)
      } catch {
        console.log("No sessions found")
        return
      }

      if (!pruneAll) {
        const currentProjectID = Instance.project.id
        projects = projects.filter((p) => p === currentProjectID)
      }

      // Collect sessions to delete
      for (const projectID of projects) {
        const projectSessionDir = path.join(sessionDir, projectID)
        try {
          const files = await fs.readdir(projectSessionDir)
          for (const file of files) {
            if (!file.endsWith(".json")) continue
            try {
              const sessionPath = path.join(projectSessionDir, file)
              const session = (await Bun.file(sessionPath).json()) as Session.Info

              if (session.time.updated < cutoff) {
                sessionsToDelete.push({ session, project: projectID })

                // Estimate size: session file + messages + parts
                const sessionSize = (await fs.stat(sessionPath)).size
                const msgDir = path.join(storageDir, "message", session.id)
                const msgSize = await getDirectorySize(msgDir)
                totalSize += sessionSize + msgSize

                // Add parts size
                try {
                  const msgFiles = await fs.readdir(msgDir)
                  for (const msgFile of msgFiles) {
                    const msgId = msgFile.replace(".json", "")
                    const partDir = path.join(storageDir, "part", msgId)
                    totalSize += await getDirectorySize(partDir)
                  }
                } catch {}
              }
            } catch {}
          }
        } catch {}
      }

      if (sessionsToDelete.length === 0) {
        console.log(`No sessions older than ${args.duration} found`)
        return
      }

      // Show summary
      console.log(`${EOL}Sessions to ${dryRun ? "prune (dry run)" : "prune"}:`)
      console.log("─".repeat(80))

      for (const { session } of sessionsToDelete) {
        const age = Math.floor((Date.now() - session.time.updated) / (24 * 60 * 60 * 1000))
        const title = Locale.truncate(session.title, 40)
        console.log(`  ${session.id}  ${title.padEnd(42)}  ${age}d ago`)
      }

      console.log("─".repeat(80))
      console.log(`Total: ${sessionsToDelete.length} sessions, ~${formatBytes(totalSize)} estimated`)

      // Handle logs
      let logFiles: string[] = []
      let logSize = 0
      if (pruneLogs) {
        const logDir = path.join(Global.Path.data, "log")
        try {
          const files = await fs.readdir(logDir)
          for (const file of files) {
            const filePath = path.join(logDir, file)
            const stat = await fs.stat(filePath)
            if (stat.mtime.getTime() < cutoff) {
              logFiles.push(filePath)
              logSize += stat.size
            }
          }
          if (logFiles.length > 0) {
            console.log(`${EOL}Log files to prune: ${logFiles.length} files, ~${formatBytes(logSize)}`)
          }
        } catch {}
      }

      // Handle snapshots
      let snapshotDirs: string[] = []
      let snapshotSize = 0
      if (pruneSnapshots) {
        const snapshotDir = path.join(Global.Path.data, "snapshot")
        const activeSessionIds = new Set<string>()

        // Get all active session IDs
        for (const projectID of projects) {
          try {
            const files = await fs.readdir(path.join(sessionDir, projectID))
            for (const file of files) {
              if (file.endsWith(".json")) {
                activeSessionIds.add(file.replace(".json", ""))
              }
            }
          } catch {}
        }

        // Find orphaned snapshots
        try {
          const snapshots = await fs.readdir(snapshotDir)
          for (const snapshot of snapshots) {
            if (!activeSessionIds.has(snapshot)) {
              const snapPath = path.join(snapshotDir, snapshot)
              snapshotDirs.push(snapPath)
              snapshotSize += await getDirectorySize(snapPath)
            }
          }
          if (snapshotDirs.length > 0) {
            console.log(`${EOL}Orphaned snapshots to prune: ${snapshotDirs.length} dirs, ~${formatBytes(snapshotSize)}`)
          }
        } catch {}
      }

      const grandTotal = totalSize + logSize + snapshotSize
      console.log(`${EOL}Total space to free: ~${formatBytes(grandTotal)}`)

      if (dryRun) {
        console.log(`${EOL}Dry run - no changes made. Remove --dry-run to delete.`)
        return
      }

      // Confirm
      if (!force && process.stdin.isTTY) {
        process.stdout.write(`${EOL}Proceed with deletion? [y/N] `)
        const reader = process.stdin
        const response = await new Promise<string>((resolve) => {
          let data = ""
          const onData = (chunk: Buffer) => {
            data += chunk.toString()
            if (data.includes("\n")) {
              reader.removeListener("data", onData)
              resolve(data.trim().toLowerCase())
            }
          }
          reader.on("data", onData)
          reader.resume()
        })

        if (response !== "y" && response !== "yes") {
          console.log("Aborted")
          return
        }
      }

      // Delete sessions
      console.log(`${EOL}Deleting sessions...`)
      let deleted = 0
      for (const { session, project } of sessionsToDelete) {
        try {
          // Delete session file
          await fs.unlink(path.join(sessionDir, project, session.id + ".json")).catch(() => {})

          // Delete messages
          const msgDir = path.join(storageDir, "message", session.id)
          try {
            const msgFiles = await fs.readdir(msgDir)
            for (const msgFile of msgFiles) {
              const msgId = msgFile.replace(".json", "")
              // Delete parts for this message
              await fs.rm(path.join(storageDir, "part", msgId), { recursive: true, force: true }).catch(() => {})
            }
            await fs.rm(msgDir, { recursive: true, force: true })
          } catch {}

          // Delete session diff
          await fs.unlink(path.join(storageDir, "session_diff", session.id + ".json")).catch(() => {})

          // Delete todos
          await fs.unlink(path.join(storageDir, "todo", session.id + ".json")).catch(() => {})

          deleted++
          if (deleted % 10 === 0) {
            process.stdout.write(`  Deleted ${deleted}/${sessionsToDelete.length} sessions\r`)
          }
        } catch (e) {
          console.error(`  Failed to delete session ${session.id}:`, e)
        }
      }
      console.log(`  Deleted ${deleted}/${sessionsToDelete.length} sessions`)

      // Delete logs
      if (pruneLogs && logFiles.length > 0) {
        console.log(`Deleting log files...`)
        for (const file of logFiles) {
          await fs.unlink(file).catch(() => {})
        }
        console.log(`  Deleted ${logFiles.length} log files`)
      }

      // Delete snapshots
      if (pruneSnapshots && snapshotDirs.length > 0) {
        console.log(`Deleting orphaned snapshots...`)
        for (const dir of snapshotDirs) {
          await fs.rm(dir, { recursive: true, force: true }).catch(() => {})
        }
        console.log(`  Deleted ${snapshotDirs.length} snapshot directories`)
      }

      console.log(`${EOL}Done! Freed approximately ${formatBytes(grandTotal)}`)
    })
  },
})
