import path from "path"
import fs from "fs/promises"
import { pathToFileURL } from "url"
import type { WorkflowContext, WorkflowDefinition } from "@opencode-ai/plugin"
import { Global } from "@opencode-ai/core/global"
import { Glob } from "@opencode-ai/core/util/glob"
import { Agent } from "@/agent/agent"
import { Config } from "@/config/config"
import { EffectBridge } from "@/effect/bridge"
import { InstanceState } from "@/effect/instance-state"
import { Plugin } from "@/plugin"
import { Provider } from "@/provider/provider"
import { MessageV2 } from "@/session/message-v2"
import { Session } from "@/session/session"
import { MessageID, PartID, SessionID } from "@/session/schema"
import { ToolRegistry } from "@/tool/registry"
import * as Process from "@/util/process"
import { Effect } from "effect"

type ArgumentInfo = {
  type?: "string" | "number" | "boolean"
  default?: unknown
  description?: string
}

type Meta = {
  name: string
  description?: string
  whenToUse?: string
  phases?: readonly (string | { title: string; detail?: string; model?: string })[]
  arguments?: Record<string, ArgumentInfo>
}

type LoadedWorkflow = {
  path: string
  meta: Meta
  run: WorkflowDefinition["run"]
}

export type Info = {
  name: string
  description?: string
  whenToUse?: string
  path: string
  arguments?: Record<string, ArgumentInfo>
  phases?: readonly (string | { title: string; detail?: string; model?: string })[]
}

function lastText(message: MessageV2.WithParts) {
  return message.parts.findLast((part) => part.type === "text")?.text ?? ""
}

function parseArgs(input: string, info?: Info) {
  const trimmed = input.trim()
  if (!trimmed) return {}
  if (trimmed.startsWith("{")) return JSON.parse(trimmed) as Record<string, unknown>
  const entries = trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map((item) => {
      const index = item.indexOf("=")
      if (index === -1) return [item, true] as const
      return [item.slice(0, index), item.slice(index + 1)] as const
    })
  if (info?.arguments && Object.keys(info.arguments).length === 1 && entries.length === 1 && entries[0][1] === true) {
    return { [Object.keys(info.arguments)[0]]: entries[0][0] }
  }
  return Object.fromEntries(
    entries.map(([key, value]) => {
      if (value === true || value === "true") return [key, true]
      if (value === "false") return [key, false]
      const numeric = Number(value)
      return [key, Number.isFinite(numeric) && value.trim() !== "" ? numeric : value]
    }),
  )
}

async function importWorkflow(file: string) {
  const url = pathToFileURL(file)
  url.searchParams.set("t", String(Date.now()))
  const mod = await import(url.href)
  const workflow = mod.default
  if (!workflow || typeof workflow !== "object" || typeof workflow.run !== "function" || !workflow.meta?.name) {
    throw new Error(`Workflow ${file} must export default workflow({...})`)
  }
  return workflow as WorkflowDefinition
}

const materializePluginWorkflow = Effect.fn("Workflow.materializePlugin")(function* (name: string, source: string) {
  const dir = path.join(Global.Path.config, "workflows")
  yield* Effect.promise(() => fs.mkdir(dir, { recursive: true }))
  const file = path.join(dir, `plugin-${name.replace(/[^a-zA-Z0-9_-]/g, "_")}.ts`)
  yield* Effect.promise(() => fs.writeFile(file, source))
  return file
})

const load = Effect.fn("Workflow.load")(function* () {
  const config = yield* Config.Service
  const plugin = yield* Plugin.Service
  const ctx = yield* InstanceState.context
  const directories = [...new Set([path.join(ctx.worktree, ".opencode"), ...(yield* config.directories())])]
  const seen = new Set<string>()
  const result: LoadedWorkflow[] = []

  for (const dir of directories) {
    for (const pattern of ["workflows/*.ts", "workflows/*.js", "workflows/*.mts", "workflows/*.mjs"]) {
      for (const file of yield* Effect.promise(() => Glob.scan(pattern, { cwd: dir, absolute: true, dot: true, symlink: false }))) {
        const workflow = yield* Effect.promise(() => importWorkflow(file))
        if (seen.has(workflow.meta.name)) continue
        seen.add(workflow.meta.name)
        result.push({ path: file, meta: workflow.meta, run: workflow.run })
      }
    }
  }

  for (const hooks of yield* plugin.list()) {
    const workflows = yield* Effect.promise(() => hooks.workflow?.() ?? Promise.resolve(undefined))
    if (!workflows) continue
    for (const [name, item] of Object.entries(workflows)) {
      if (seen.has(name)) continue
      const workflow =
        typeof item === "string"
          ? yield* Effect.promise(() =>
              materializePluginWorkflow(name, item).pipe(
                Effect.flatMap((file) => Effect.promise(() => importWorkflow(file))),
                Effect.runPromise,
              ),
            )
          : item
      seen.add(name)
      result.push({ path: `plugin:${name}`, meta: workflow.meta, run: workflow.run })
    }
  }

  return result
})

export const list = Effect.fn("Workflow.list")(function* () {
  return (yield* load()).map((item) => ({
    name: item.meta.name,
    description: item.meta.description,
    whenToUse: item.meta.whenToUse,
    path: item.path,
    arguments: item.meta.arguments,
    phases: item.meta.phases,
  }))
})

const getByName = Effect.fn("Workflow.getByName")(function* (name: string) {
  return (yield* load()).find((item) => item.meta.name === name)
})

function renderList(items: Info[]) {
  if (items.length === 0) return "No workflows found. Create .opencode/workflows/<name>.ts and export default workflow({...})."
  return [
    "Available workflows:",
    ...items.map((item) => {
      const args = item.arguments ? ` args: ${Object.keys(item.arguments).join(", ")}` : ""
      return `- ${item.name}${item.description ? ` — ${item.description}` : ""}${args}`
    }),
    "",
    "Run one with: /workflow <name> key=value",
  ].join("\n")
}

function renderResult(name: string, logs: string[], result: unknown) {
  const output =
    typeof result === "string"
      ? result
      : result === undefined
        ? ""
        : JSON.stringify(result, null, 2)
  const sections = [`Workflow ${name} complete.`]
  if (output) sections.push(output)
  if (logs.length > 0) sections.push(["Logs:", ...logs.map((item) => `- ${item}`)].join("\n"))
  return sections.join("\n\n")
}

const createUserMessage = Effect.fn("Workflow.createUserMessage")(function* (input: {
  sessionID: SessionID
  command: string
  messageID?: MessageID
  agent?: string
  model?: string
  variant?: string
}) {
  const sessions = yield* Session.Service
  const agents = yield* Agent.Service
  const providers = yield* Provider.Service
  const session = yield* sessions.get(input.sessionID)
  const agent = input.agent ?? session.agent ?? (yield* agents.defaultAgent())
  const baseModel = input.model ? Provider.parseModel(input.model) : (session.model ?? (yield* providers.defaultModel()))
  const modelID = "id" in baseModel ? baseModel.id : baseModel.modelID
  const variant = "variant" in baseModel ? baseModel.variant : undefined
  const info: MessageV2.User = {
    id: input.messageID ?? MessageID.ascending(),
    sessionID: input.sessionID,
    role: "user",
    time: { created: Date.now() },
    agent,
    model: {
      providerID: baseModel.providerID,
      modelID,
      variant: input.variant ?? variant,
    },
  }
  yield* sessions.updateMessage(info)
  const part: MessageV2.TextPart = {
    id: PartID.ascending(),
    messageID: info.id,
    sessionID: input.sessionID,
    type: "text",
    text: input.command,
  }
  yield* sessions.updatePart(part)
  return { info, parts: [part] }
})

const createAssistantMessage = Effect.fn("Workflow.createAssistantMessage")(function* (input: {
  sessionID: SessionID
  parent: MessageV2.User
  text: string
  structured?: unknown
}) {
  const sessions = yield* Session.Service
  const ctx = yield* InstanceState.context
  const info: MessageV2.Assistant = {
    id: MessageID.ascending(),
    sessionID: input.sessionID,
    parentID: input.parent.id,
    role: "assistant",
    time: { created: Date.now(), completed: Date.now() },
    modelID: input.parent.model.modelID,
    providerID: input.parent.model.providerID,
    mode: input.parent.agent,
    agent: input.parent.agent,
    path: { cwd: ctx.directory, root: ctx.worktree },
    summary: false,
    cost: 0,
    tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
    structured: input.structured,
    variant: input.parent.model.variant,
  }
  yield* sessions.updateMessage(info)
  const part: MessageV2.TextPart = {
    id: PartID.ascending(),
    messageID: info.id,
    sessionID: input.sessionID,
    type: "text",
    text: input.text,
  }
  yield* sessions.updatePart(part)
  return { info, parts: [part] }
})

function withConcurrency<T, R>(items: readonly T[], limit: number, fn: (item: T, index: number) => Promise<R>) {
  if (items.length === 0) return Promise.resolve([] as R[])
  const results = Array.from({ length: items.length }) as R[]
  const queue = [...items]
  let index = 0
  return Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
      while (queue.length > 0) {
        const item = queue.shift()
        if (item === undefined) return
        const current = index++
        results[current] = await fn(item, current)
      }
    }),
  ).then(() => results)
}

const executeLoaded = Effect.fn("Workflow.executeLoaded")(function* (input: {
  workflow: LoadedWorkflow
  args: Record<string, unknown>
  sessionID: SessionID
  messageID: MessageID
  agent: string
  depth?: number
}) {
  const bridge = yield* EffectBridge.make()
  const sessions = yield* Session.Service
  const config = yield* Config.Service
  const registry = yield* ToolRegistry.Service
  const agents = yield* Agent.Service
  const ctx = yield* InstanceState.context
  const logs: string[] = []
  let phase: string | undefined
  const run = <A, E, R>(effect: Effect.Effect<A, E, R>) => bridge.promise(effect)
  const workflowCtx: WorkflowContext = {
    budgetRemaining: Infinity,
    budget: {
      total: null,
      spent: () => 0,
      remaining: () => Infinity,
      tokensTotal: null,
      tokensSpent: () => 0,
      tokensRemaining: () => Infinity,
    },
    setPhase(next: string) {
      phase = next
    },
    log(message: string) {
      logs.push(phase ? `[${phase}] ${message}` : message)
    },
    parallel: <T>(tasks: readonly (() => Promise<T>)[], options?: { concurrencyLimit?: number }) =>
      withConcurrency(tasks, options?.concurrencyLimit ?? (tasks.length || 1), async (task) => {
        try {
          return await task()
        } catch {
          return null
        }
      }) as Promise<(T | null)[]>,
    pipeline: async (items: readonly unknown[], ...rest: unknown[]) => {
      const last = rest.at(-1)
      const options =
        last && typeof last === "object" && "concurrencyLimit" in (last as Record<string, unknown>)
          ? (rest.pop() as { concurrencyLimit?: number })
          : undefined
      const stages = rest as Array<(prev: unknown, item: unknown, index: number) => Promise<unknown>>
      return withConcurrency(items, options?.concurrencyLimit ?? (items.length || 1), async (item, index) => {
        let previous: unknown = item
        for (const stage of stages) {
          try {
            previous = await stage(previous, item, index)
          } catch {
            return null
          }
        }
        return previous
      })
    },
    agent: async (options: {
      prompt: string
      agent?: string
      model?: string
      variant?: string
      files?: string[]
      schema?: Record<string, unknown>
      onError?: "fail" | "null"
    }) => {
      try {
        const { SessionPrompt } = await import("@/session/prompt")
        const child = await run(
          sessions.create({
            parentID: input.sessionID,
            title: `${input.workflow.meta.name}: ${options.agent ?? "step"}`,
          }),
        )
        const result = await run(
          Effect.gen(function* () {
            const promptSvc = yield* SessionPrompt.Service
            const parts = yield* promptSvc.resolvePromptParts(options.prompt)
            const attachments =
              options.files?.map((file) => ({
                type: "file" as const,
                url: pathToFileURL(path.isAbsolute(file) ? file : path.join(ctx.directory, file)).href,
                filename: path.basename(file),
                mime: "text/plain",
              })) ?? []
            return yield* promptSvc.prompt({
              sessionID: child.id,
              agent: options.agent ?? (yield* agents.defaultAgent()),
              model: options.model ? Provider.parseModel(options.model) : undefined,
              variant: options.variant,
              format: options.schema
                ? new MessageV2.OutputFormatJsonSchema({ type: "json_schema", schema: options.schema })
                : undefined,
              parts: [...parts, ...attachments],
            })
          }),
        )
        const text = lastText(result)
        return { text, data: result.info.role === "assistant" ? result.info.structured ?? text : text }
      } catch (error) {
        if (options.onError === "null") return null
        throw error
      }
    },
    tool: (async (name: string, args?: Record<string, unknown>, options?: { onError?: "fail" | "null" }) => {
      try {
        const tool = (await run(registry.all())).find((item) => item.id === name)
        if (!tool) throw new Error(`Unknown tool: ${name}`)
        const messages = await run(sessions.messages({ sessionID: input.sessionID }))
        const result = await run(
          tool.execute(args ?? {}, {
            sessionID: input.sessionID,
            messageID: input.messageID,
            agent: input.agent,
            abort: new AbortController().signal,
            messages,
            ask: () => Effect.void,
            metadata: () => Effect.void,
          }),
        )
        return { output: result.output, metadata: result.metadata }
      } catch (error) {
        if (options?.onError === "null") return null
        throw error
      }
    }) as WorkflowContext["tool"],
    shell: async (command: string, options?: { timeout?: number; cwd?: string }) => {
      const shell = (await run(config.get())).shell
      const result = await Process.text([command], {
        shell: shell ?? true,
        cwd: options?.cwd ?? ctx.directory,
        timeout: options?.timeout,
        nothrow: true,
      })
      return { output: result.text, exitCode: result.code }
    },
    workflow: async (name: string, args?: Record<string, unknown>) => {
      if ((input.depth ?? 0) >= 1) throw new Error("Nested workflows are limited to depth 1")
      const workflow = await run(getByName(name))
      if (!workflow) throw new Error(`Workflow not found: ${name}`)
      const nested = await run(
        executeLoaded({
          workflow,
          args: args ?? {},
          sessionID: input.sessionID,
          messageID: input.messageID,
          agent: input.agent,
          depth: (input.depth ?? 0) + 1,
        }),
      )
      return nested.result
    },
    question: async (options: { question: string }) => {
      throw new Error(`Workflow questions not supported yet: ${options.question}`)
    },
  }
  const result = yield* Effect.promise(() => input.workflow.run(input.args, workflowCtx))
  return { logs, result }
})

const executeCommandRaw = Effect.fn("Workflow.executeCommand")(function* (input: {
  sessionID: SessionID
  messageID?: MessageID
  arguments: string
  agent?: string
  model?: string
  variant?: string
}) {
  const trimmed = input.arguments.trim()
  const user = yield* createUserMessage({
    sessionID: input.sessionID,
    messageID: input.messageID,
    command: `/workflow${trimmed ? ` ${trimmed}` : ""}`,
    agent: input.agent,
    model: input.model,
    variant: input.variant,
  })
  if (!trimmed) {
    return yield* createAssistantMessage({
      sessionID: input.sessionID,
      parent: user.info,
      text: renderList(yield* list()),
    })
  }
  const [name, ...rest] = trimmed.split(/\s+/)
  const workflow = yield* getByName(name)
  if (!workflow) {
    const available = (yield* list()).map((item) => item.name).join(", ")
    return yield* createAssistantMessage({
      sessionID: input.sessionID,
      parent: user.info,
      text: available ? `Workflow not found: ${name}\nAvailable: ${available}` : `Workflow not found: ${name}`,
    })
  }
  const info: Info = {
    name: workflow.meta.name,
    description: workflow.meta.description,
    whenToUse: workflow.meta.whenToUse,
    path: workflow.path,
    arguments: workflow.meta.arguments,
    phases: workflow.meta.phases,
  }
  const executed = yield* executeLoaded({
    workflow,
    args: parseArgs(rest.join(" "), info),
    sessionID: input.sessionID,
    messageID: user.info.id,
    agent: user.info.agent,
  })
  return yield* createAssistantMessage({
    sessionID: input.sessionID,
    parent: user.info,
    text: renderResult(workflow.meta.name, executed.logs, executed.result),
    structured: typeof executed.result === "object" ? executed.result : undefined,
  })
})

export const executeCommand = (input: {
  sessionID: SessionID
  messageID?: MessageID
  arguments: string
  agent?: string
  model?: string
  variant?: string
}) => executeCommandRaw(input).pipe(Effect.orDie)
