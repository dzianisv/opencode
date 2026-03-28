import z from "zod"
import { spawn } from "child_process"
import { createWriteStream } from "fs"
import { Tool } from "./tool"
import path from "path"
import DESCRIPTION from "./bash.txt"
import { Log } from "../util/log"
import { Instance } from "../project/instance"
import { lazy } from "@/util/lazy"
import { Language, type Node } from "web-tree-sitter"

import { Filesystem } from "@/util/filesystem"
import { Process } from "@/util/process"
import { fileURLToPath } from "url"
import { Flag } from "@/flag/flag"
import { Shell } from "@/shell/shell"

import { BashArity } from "@/permission/arity"
import { Truncate } from "./truncate"
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

function parts(node: Node) {
  const out: Part[] = []
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i)
    if (!child) continue
    if (child.type === "command_elements") {
      for (let j = 0; j < child.childCount; j++) {
        const item = child.child(j)
        if (!item || item.type === "command_argument_sep" || item.type === "redirection") continue
        out.push({ type: item.type, text: item.text })
      }
      continue
    }
    if (
      child.type !== "command_name" &&
      child.type !== "command_name_expr" &&
      child.type !== "word" &&
      child.type !== "string" &&
      child.type !== "raw_string" &&
      child.type !== "concatenation"
    ) {
      continue
    }
    out.push({ type: child.type, text: child.text })
  }
  return out
}

function source(node: Node) {
  return (node.parent?.type === "redirected_statement" ? node.parent.text : node.text).trim()
}

function commands(node: Node) {
  return node.descendantsOfType("command").filter((child): child is Node => Boolean(child))
}

function unquote(text: string) {
  if (text.length < 2) return text
  const first = text[0]
  const last = text[text.length - 1]
  if ((first === '"' || first === "'") && first === last) return text.slice(1, -1)
  return text
}

function home(text: string) {
  if (text === "~") return os.homedir()
  if (text.startsWith("~/") || text.startsWith("~\\")) return path.join(os.homedir(), text.slice(2))
  return text
}

function envValue(key: string) {
  if (process.platform !== "win32") return process.env[key]
  const name = Object.keys(process.env).find((item) => item.toLowerCase() === key.toLowerCase())
  return name ? process.env[name] : undefined
}

function auto(key: string, cwd: string, shell: string) {
  const name = key.toUpperCase()
  if (name === "HOME") return os.homedir()
  if (name === "PWD") return cwd
  if (name === "PSHOME") return path.dirname(shell)
}

function expand(text: string, cwd: string, shell: string) {
  const out = unquote(text)
    .replace(/\$\{env:([^}]+)\}/gi, (_, key: string) => envValue(key) || "")
    .replace(/\$env:([A-Za-z_][A-Za-z0-9_]*)/gi, (_, key: string) => envValue(key) || "")
    .replace(/\$(HOME|PWD|PSHOME)(?=$|[\\/])/gi, (_, key: string) => auto(key, cwd, shell) || "")
  return home(out)
}

function provider(text: string) {
  const match = text.match(/^([A-Za-z]+)::(.*)$/)
  if (match) {
    if (match[1].toLowerCase() !== "filesystem") return
    return match[2]
  }
  const prefix = text.match(/^([A-Za-z]+):(.*)$/)
  if (!prefix) return text
  if (prefix[1].length === 1) return text
  return
}

function dynamic(text: string, ps: boolean) {
  if (text.startsWith("(") || text.startsWith("@(")) return true
  if (text.includes("$(") || text.includes("${") || text.includes("`")) return true
  if (ps) return /\$(?!env:)/i.test(text)
  return text.includes("$")
}

function prefix(text: string) {
  const match = /[?*\[]/.exec(text)
  if (!match) return text
  if (match.index === 0) return
  return text.slice(0, match.index)
}

async function cygpath(shell: string, text: string) {
  const out = await Process.text([shell, "-lc", 'cygpath -w -- "$1"', "_", text], { nothrow: true })
  if (out.code !== 0) return
  const file = out.text.trim()
  if (!file) return
  return Filesystem.normalizePath(file)
}

async function resolvePath(text: string, root: string, shell: string) {
  if (process.platform === "win32") {
    if (Shell.posix(shell) && text.startsWith("/") && Filesystem.windowsPath(text) === text) {
      const file = await cygpath(shell, text)
      if (file) return file
    }
    return Filesystem.normalizePath(path.resolve(root, Filesystem.windowsPath(text)))
  }
  return path.resolve(root, text)
}

async function argPath(arg: string, cwd: string, ps: boolean, shell: string) {
  const text = ps ? expand(arg, cwd, shell) : home(unquote(arg))
  const file = text && prefix(text)
  if (!file || dynamic(file, ps)) return
  const next = ps ? provider(file) : file
  if (!next) return
  return resolvePath(next, cwd, shell)
}

function pathArgs(list: Part[], ps: boolean) {
  if (!ps) {
    return list
      .slice(1)
      .filter((item) => !item.text.startsWith("-") && !(list[0]?.text === "chmod" && item.text.startsWith("+")))
      .map((item) => item.text)
  }

  const out: string[] = []
  let want = false
  for (const item of list.slice(1)) {
    if (want) {
      out.push(item.text)
      want = false
      continue
    }
    if (item.type === "command_parameter") {
      const flag = item.text.toLowerCase()
      if (SWITCHES.has(flag)) continue
      want = FLAGS.has(flag)
      continue
    }
    out.push(item.text)
  }
  return out
}

async function collect(root: Node, cwd: string, ps: boolean, shell: string): Promise<Scan> {
  const scan: Scan = {
    dirs: new Set<string>(),
    patterns: new Set<string>(),
    always: new Set<string>(),
  }

  for (const node of commands(root)) {
    const command = parts(node)
    const tokens = command.map((item) => item.text)
    const cmd = ps ? tokens[0]?.toLowerCase() : tokens[0]

    if (cmd && FILES.has(cmd)) {
      for (const arg of pathArgs(command, ps)) {
        const resolved = await argPath(arg, cwd, ps, shell)
        log.info("resolved path", { arg, resolved })
        if (!resolved || Instance.containsPath(resolved)) continue
        const dir = (await Filesystem.isDir(resolved)) ? resolved : path.dirname(resolved)
        scan.dirs.add(dir)
      }
    }

    if (tokens.length && (!cmd || !CWD.has(cmd))) {
      scan.patterns.add(source(node))
      scan.always.add(BashArity.prefix(tokens).join(" ") + " *")
    }
  }

  return scan
}

function preview(text: string) {
  if (text.length <= MAX_METADATA_LENGTH) return text
  return text.slice(0, MAX_METADATA_LENGTH) + "\n\n..."
}

async function parse(command: string, ps: boolean) {
  const tree = await parser().then((p) => (ps ? p.ps : p.bash).parse(command))
  if (!tree) throw new Error("Failed to parse command")
  return tree.rootNode
}

async function ask(ctx: Tool.Context, scan: Scan) {
  if (scan.dirs.size > 0) {
    const globs = Array.from(scan.dirs).map((dir) => {
      if (process.platform === "win32") return Filesystem.normalizePathPattern(path.join(dir, "*"))
      return path.join(dir, "*")
    })
    await ctx.ask({
      permission: "external_directory",
      patterns: globs,
      always: globs,
      metadata: {},
    })
  }

  if (scan.patterns.size === 0) return
  await ctx.ask({
    permission: "bash",
    patterns: Array.from(scan.patterns),
    always: Array.from(scan.always),
    metadata: {},
  })
}

async function shellEnv(ctx: Tool.Context, cwd: string) {
  const extra = await Plugin.trigger("shell.env", { cwd, sessionID: ctx.sessionID, callID: ctx.callID }, { env: {} })
  return {
    ...process.env,
    ...extra.env,
  }
}

function cmd(shell: string, name: string, command: string, cwd: string, env: NodeJS.ProcessEnv) {
  if (process.platform === "win32" && PS.has(name)) {
    return ChildProcess.make(shell, ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", command], {
      cwd,
      env,
      stdin: "ignore",
      detached: false,
    })
  }

  return ChildProcess.make(command, [], {
    shell,
    cwd,
    env,
    stdin: "ignore",
    detached: process.platform !== "win32",
  })
}

async function run(
  input: {
    shell: string
    name: string
    command: string
    cwd: string
    env: NodeJS.ProcessEnv
    timeout: number
    description: string
  },
  ctx: Tool.Context,
) {
  let output = ""
  let expired = false
  let aborted = false

  ctx.metadata({
    metadata: {
      output: "",
      description: input.description,
    },
  })

  const exit = await CrossSpawnSpawner.runPromiseExit((spawner) =>
    Effect.gen(function* () {
      const handle = yield* spawner.spawn(cmd(input.shell, input.name, input.command, input.cwd, input.env))

      yield* Effect.forkScoped(
        Stream.runForEach(Stream.decodeText(handle.all), (chunk) =>
          Effect.sync(() => {
            output += chunk
            ctx.metadata({
              metadata: {
                output: preview(output),
                description: input.description,
              },
            })
          }),
        ),
      )

      const abort = Effect.callback<void>((resume) => {
        if (ctx.abort.aborted) return resume(Effect.void)
        const handler = () => resume(Effect.void)
        ctx.abort.addEventListener("abort", handler, { once: true })
        return Effect.sync(() => ctx.abort.removeEventListener("abort", handler))
      })

      const timeout = Effect.sleep(`${input.timeout + 100} millis`)

      const exit = yield* Effect.raceAll([
        handle.exitCode.pipe(Effect.map((code) => ({ kind: "exit" as const, code }))),
        abort.pipe(Effect.map(() => ({ kind: "abort" as const, code: null }))),
        timeout.pipe(Effect.map(() => ({ kind: "timeout" as const, code: null }))),
      ])

      if (exit.kind === "abort") {
        aborted = true
        yield* handle.kill({ forceKillAfter: "3 seconds" }).pipe(Effect.orDie)
      }
      if (exit.kind === "timeout") {
        expired = true
        yield* handle.kill({ forceKillAfter: "3 seconds" }).pipe(Effect.orDie)
      }

      return exit.kind === "exit" ? exit.code : null
    }).pipe(Effect.scoped, Effect.orDie),
  )

  let code: number | null = null
  if (Exit.isSuccess(exit)) {
    code = exit.value
  } else if (!Cause.hasInterruptsOnly(exit.cause)) {
    throw Cause.squash(exit.cause)
  }

  const meta: string[] = []
  if (expired) meta.push(`bash tool terminated command after exceeding timeout ${input.timeout} ms`)
  if (aborted) meta.push("User aborted the command")
  if (meta.length > 0) {
    output += "\n\n<bash_metadata>\n" + meta.join("\n") + "\n</bash_metadata>"
  }

  return {
    title: input.description,
    metadata: {
      output: preview(output),
      exit: code,
      description: input.description,
    },
    output,
  }
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
  const { default: psWasm } = await import("tree-sitter-powershell/tree-sitter-powershell.wasm" as string, {
    with: { type: "wasm" },
  })
  const bashPath = resolveWasm(bashWasm)
  const psPath = resolveWasm(psWasm)
  const [bashLanguage, psLanguage] = await Promise.all([Language.load(bashPath), Language.load(psPath)])
  const bash = new Parser()
  bash.setLanguage(bashLanguage)
  const ps = new Parser()
  ps.setLanguage(psLanguage)
  return { bash, ps }
})

// TODO: we may wanna rename this tool so it works better on other shells
export const BashTool = Tool.define("bash", async () => {
  const shell = Shell.acceptable()
  const name = Shell.name(shell)
  const chain =
    name === "powershell"
      ? "If the commands depend on each other and must run sequentially, avoid '&&' in this shell because Windows PowerShell 5.1 does not support it. Use PowerShell conditionals such as `cmd1; if ($?) { cmd2 }` when later commands must depend on earlier success."
      : "If the commands depend on each other and must run sequentially, use a single Bash call with '&&' to chain them together (e.g., `git add . && git commit -m \"message\" && git push`). For instance, if one operation must complete before another starts (like mkdir before cp, Write before Bash for git operations, or git add before git commit), run these operations sequentially instead."
  log.info("bash tool using shell", { shell })

  return {
    description: DESCRIPTION.replaceAll("${directory}", Instance.directory)
      .replaceAll("${os}", process.platform)
      .replaceAll("${shell}", name)
      .replaceAll("${chaining}", chain)
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
      const cwd = params.workdir ? await resolvePath(params.workdir, Instance.directory, shell) : Instance.directory
      if (params.timeout !== undefined && params.timeout < 0) {
        throw new Error(`Invalid timeout value: ${params.timeout}. Timeout must be a positive number.`)
      }
      const timeout = params.timeout ?? DEFAULT_TIMEOUT
      const ps = PS.has(name)
      const root = await parse(params.command, ps)
      const scan = await collect(root, cwd, ps, shell)
      if (!Instance.containsPath(cwd)) scan.dirs.add(cwd)
      await ask(ctx, scan)

      return run(
        {
          shell,
          name,
          command: params.command,
          cwd,
          env: await shellEnv(ctx, cwd),
          timeout,
          description: params.description,
        },
        ctx,
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
