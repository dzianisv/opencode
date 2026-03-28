import z from "zod"
import { spawn } from "child_process"
import { createWriteStream } from "fs"
import { Tool } from "./tool"
import path from "path"
import DESCRIPTION from "./bash.txt"
import { Log } from "../util/log"
import { Instance } from "../project/instance"
import { lazy } from "@/util/lazy"
import { Language } from "web-tree-sitter"
import fs from "fs/promises"

import { Filesystem } from "@/util/filesystem"
import { fileURLToPath } from "url"
import { Flag } from "@/flag/flag.ts"
import { Shell } from "@/shell/shell"

import { BashArity } from "@/permission/arity"
import { Truncate } from "./truncation"
import { Plugin } from "@/plugin"
import { ToolID } from "./schema"

const MAX_METADATA_LENGTH = 30_000
const DEFAULT_TIMEOUT = Flag.OPENCODE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS || 2 * 60 * 1000
const MAX_OUTPUT_LINES = Truncate.MAX_LINES
const MAX_OUTPUT_BYTES = Truncate.MAX_BYTES

export const log = Log.create({ service: "bash-tool" })

const resolveWasm = (asset: string) => {
  if (asset.startsWith("file://")) return fileURLToPath(asset)
  if (asset.startsWith("/") || /^[a-z]:/i.test(asset)) return asset
  const url = new URL(asset, import.meta.url)
  return fileURLToPath(url)
}

const parser = lazy(async () => {
  const { Parser } = await import("web-tree-sitter")
  const { default: treeWasm } = await import("web-tree-sitter/tree-sitter.wasm" as string, {
    with: { type: "wasm" },
  })
  const treePath = resolveWasm(treeWasm)
  await Parser.init({
    locateFile() {
      return treePath
    },
  })
  const { default: bashWasm } = await import("tree-sitter-bash/tree-sitter-bash.wasm" as string, {
    with: { type: "wasm" },
  })
  const bashPath = resolveWasm(bashWasm)
  const bashLanguage = await Language.load(bashPath)
  const p = new Parser()
  p.setLanguage(bashLanguage)
  return p
})

// TODO: we may wanna rename this tool so it works better on other shells
export const BashTool = Tool.define("bash", async () => {
  const shell = Shell.acceptable()
  log.info("bash tool using shell", { shell })

  return {
    description: DESCRIPTION.replaceAll("${directory}", Instance.directory)
      .replaceAll("${maxLines}", String(Truncate.MAX_LINES))
      .replaceAll("${maxBytes}", String(Truncate.MAX_BYTES)),
    parameters: z.object({
      command: z.string().describe("The command to execute"),
      timeout: z.number().describe("Optional timeout in milliseconds").optional(),
      workdir: z
        .string()
        .describe(
          `The working directory to run the command in. Defaults to ${Instance.directory}. Use this instead of 'cd' commands.`,
        )
        .optional(),
      description: z
        .string()
        .describe(
          "Clear, concise description of what this command does in 5-10 words. Examples:\nInput: ls\nOutput: Lists files in current directory\n\nInput: git status\nOutput: Shows working tree status\n\nInput: npm install\nOutput: Installs package dependencies\n\nInput: mkdir foo\nOutput: Creates directory 'foo'",
        ),
    }),
    async execute(params, ctx) {
      const cwd = params.workdir || Instance.directory
      if (params.timeout !== undefined && params.timeout < 0) {
        throw new Error(`Invalid timeout value: ${params.timeout}. Timeout must be a positive number.`)
      }
      const timeout = params.timeout ?? DEFAULT_TIMEOUT
      const tree = await parser().then((p) => p.parse(params.command))
      if (!tree) {
        throw new Error("Failed to parse command")
      }
      const directories = new Set<string>()
      if (!Instance.containsPath(cwd)) directories.add(cwd)
      const patterns = new Set<string>()
      const always = new Set<string>()

      for (const node of tree.rootNode.descendantsOfType("command")) {
        if (!node) continue

        // Get full command text including redirects if present
        let commandText = node.parent?.type === "redirected_statement" ? node.parent.text : node.text

        const command = []
        for (let i = 0; i < node.childCount; i++) {
          const child = node.child(i)
          if (!child) continue
          if (
            child.type !== "command_name" &&
            child.type !== "word" &&
            child.type !== "string" &&
            child.type !== "raw_string" &&
            child.type !== "concatenation"
          ) {
            continue
          }
          command.push(child.text)
        }

        // not an exhaustive list, but covers most common cases
        if (["cd", "rm", "cp", "mv", "mkdir", "touch", "chmod", "chown", "cat"].includes(command[0])) {
          for (const arg of command.slice(1)) {
            if (arg.startsWith("-") || (command[0] === "chmod" && arg.startsWith("+"))) continue
            const resolved = await fs.realpath(path.resolve(cwd, arg)).catch(() => "")
            log.info("resolved path", { arg, resolved })
            if (resolved) {
              const normalized =
                process.platform === "win32" ? Filesystem.windowsPath(resolved).replace(/\//g, "\\") : resolved
              if (!Instance.containsPath(normalized)) {
                const dir = (await Filesystem.isDir(normalized)) ? normalized : path.dirname(normalized)
                directories.add(dir)
              }
            }
          }
        }

        // cd covered by above check
        if (command.length && command[0] !== "cd") {
          patterns.add(commandText)
          always.add(BashArity.prefix(command).join(" ") + " *")
        }
      }

      if (directories.size > 0) {
        const globs = Array.from(directories).map((dir) => {
          // Preserve POSIX-looking paths with /s, even on Windows
          if (dir.startsWith("/")) return `${dir.replace(/[\\/]+$/, "")}/*`
          return path.join(dir, "*")
        })
        await ctx.ask({
          permission: "external_directory",
          patterns: globs,
          always: globs,
          metadata: {},
        })
      }

      if (patterns.size > 0) {
        await ctx.ask({
          permission: "bash",
          patterns: Array.from(patterns),
          always: Array.from(always),
          metadata: {},
        })
      }

      const shellEnv = await Plugin.trigger(
        "shell.env",
        { cwd, sessionID: ctx.sessionID, callID: ctx.callID },
        { env: {} },
      )
      const proc = spawn(params.command, {
        shell,
        cwd,
        env: {
          ...process.env,
          ...shellEnv.env,
        },
        stdio: ["ignore", "pipe", "pipe"],
        detached: process.platform !== "win32",
        windowsHide: process.platform === "win32",
      })

      const outputPath = path.join(Truncate.DIR, ToolID.ascending())
      await fs.mkdir(Truncate.DIR, { recursive: true })
      const file = createWriteStream(outputPath)

      let bytes = 0
      let lines = 0
      let kept = 0
      let lineKept = 0
      let cut = false
      let over = false
      let streamError: Error | undefined
      let paused = false
      let timer: ReturnType<typeof setTimeout> | undefined
      let dirty = false

      const out: string[] = []
      const preview: string[] = []
      let previewLen = 0

      // Initialize metadata with empty output
      ctx.metadata({
        metadata: {
          output: "",
          description: params.description,
        },
      })

      const renderPreview = () => {
        const text = preview.join("")
        if (previewLen > MAX_METADATA_LENGTH) {
          return text.slice(0, MAX_METADATA_LENGTH) + "\n\n..."
        }
        return text
      }

      const publish = () => {
        timer = undefined
        if (!dirty) return
        dirty = false
        ctx.metadata({
          metadata: {
            output: renderPreview(),
            description: params.description,
            truncated: over || cut,
          },
        })
      }

      file.once("error", (error) => {
        streamError = error
      })

      const toBytes = (value: string, max: number) => Buffer.from(value, "utf-8").subarray(0, max).toString("utf-8")
      const clip = (text: string) => {
        const lines = text.split("\n").slice(0, MAX_OUTPUT_LINES).join("\n")
        return toBytes(lines, MAX_OUTPUT_BYTES)
      }

      const append = (chunk: Buffer) => {
        const text = chunk.toString()
        bytes += chunk.byteLength
        for (const value of chunk) {
          if (value === 10) lines++
        }

        if (!streamError) {
          const ok = file.write(chunk)
          if (!ok && !paused) {
            paused = true
            proc.stdout?.pause()
            proc.stderr?.pause()
            file.once("drain", () => {
              paused = false
              proc.stdout?.resume()
              proc.stderr?.resume()
            })
          }
        }

        if (!cut) {
          out.push(text)
          kept += chunk.byteLength
          lineKept += text.split("\n").length - 1
          if (kept > MAX_OUTPUT_BYTES || lineKept + 1 > MAX_OUTPUT_LINES) {
            const short = clip(out.join(""))
            out.length = 0
            out.push(short)
            cut = true
            over = true
          }
        }

        if (previewLen <= MAX_METADATA_LENGTH) {
          preview.push(text)
          previewLen += text.length
        }
        dirty = true
        if (!timer) timer = setTimeout(publish, 100)
      }
      proc.stdout?.on("data", append)
      proc.stderr?.on("data", append)

      let timedOut = false
      let aborted = false
      let exited = false

      const kill = () => Shell.killTree(proc, { exited: () => exited })

      if (ctx.abort.aborted) {
        aborted = true
        await kill()
      }

      const abortHandler = () => {
        aborted = true
        void kill()
      }

      ctx.abort.addEventListener("abort", abortHandler, { once: true })

      const timeoutTimer = setTimeout(() => {
        timedOut = true
        void kill()
      }, timeout + 100)

      try {
        await new Promise<void>((resolve, reject) => {
          const cleanup = () => {
            clearTimeout(timeoutTimer)
            ctx.abort.removeEventListener("abort", abortHandler)
          }

          proc.once("close", () => {
            exited = true
            cleanup()
            resolve()
          })

          proc.once("error", (error) => {
            exited = true
            cleanup()
            reject(error)
          })
        })
      } finally {
        await new Promise<void>((resolve) => file.end(() => resolve()))
      }

      if (timer) clearTimeout(timer)
      publish()

      let output = out.join("")

      const resultMetadata: string[] = []

      if (timedOut) {
        resultMetadata.push(`bash tool terminated command after exceeding timeout ${timeout} ms`)
      }

      if (aborted) {
        resultMetadata.push("User aborted the command")
      }

      if (streamError) {
        resultMetadata.push(`failed to persist full output: ${streamError.message}`)
      }

      if (resultMetadata.length > 0) {
        output += "\n\n<bash_metadata>\n" + resultMetadata.join("\n") + "\n</bash_metadata>"
      }

      const totalLines = bytes === 0 ? 0 : lines + 1
      const truncated = over || totalLines > MAX_OUTPUT_LINES || bytes > MAX_OUTPUT_BYTES

      const result =
        truncated && !streamError
          ? (() => {
              const short = output
              const shortLines = short.length === 0 ? 0 : short.split("\n").length
              const overflowByBytes = bytes > MAX_OUTPUT_BYTES
              const removed = overflowByBytes
                ? Math.max(0, bytes - Buffer.byteLength(short, "utf-8"))
                : totalLines - shortLines
              const unit = overflowByBytes ? "bytes" : "lines"
              const hint =
                `The tool call succeeded but the output was truncated. Full output saved to: ${outputPath}\n` +
                "Use Grep to search the full content or Read with offset/limit to view specific sections."
              return `${short}\n\n...${Math.max(0, removed)} ${unit} truncated...\n\n${hint}`
            })()
          : output

      return {
        title: params.description,
        metadata: {
          output: result.length > MAX_METADATA_LENGTH ? result.slice(0, MAX_METADATA_LENGTH) + "\n\n..." : result,
          exit: proc.exitCode,
          description: params.description,
          truncated,
          outputPath: truncated && !streamError ? outputPath : undefined,
        },
        output: result,
      }
    },
  }
})
