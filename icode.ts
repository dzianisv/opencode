#!/usr/bin/env bun
// spark.ts — single-file AI coding agent using Ollama
// Zero external dependencies. Run: bun spark.ts

import { readdir, stat, readFile, writeFile, mkdir } from "node:fs/promises"
import { join, resolve, dirname, basename, relative } from "node:path"
import { homedir } from "node:os"
import { spawn } from "node:child_process"
import { createInterface } from "node:readline"

// ── Types ────────────────────────────────────────────────────────────────────

// Tool call ID correlation across providers:
//
// OpenAI Chat Completions API:
//   - Assistant response: tool_calls[].id (e.g. "call_12345xyz")
//   - Tool result message: { role: "tool", tool_call_id: "<id>", content: "..." }
//   - tool_call_id is REQUIRED for correlation
//
// Ollama native /api/chat:
//   - Assistant response: tool_calls[].id MAY be present
//   - Tool result message: { role: "tool", content: "...", tool_name: "func_name" }
//   - Ollama uses tool_name for correlation, tool_call_id is ignored
//
// Ollama OpenAI-compatible /v1/chat/completions:
//   - Follows OpenAI format, includes tool_calls[].id
//   - Tool result: { role: "tool", tool_call_id: "<id>", content: "..." }
//
// Vercel AI SDK (@ai-sdk/openai-compatible):
//   - Non-streaming: toolCall.id ?? generateId() (synthetic 16-char random if missing)
//   - Streaming: REQUIRES id on first delta chunk (throws InvalidResponseDataError if null)
//   - Sends results as: { role: "tool", tool_call_id: "<id>", content: "..." }
//
// Strategy: we send BOTH tool_name (for Ollama native) and tool_call_id (for OpenAI compat).
// Extra fields are ignored by each provider, so this is safe for both endpoints.
interface Message {
  role: "system" | "user" | "assistant" | "tool"
  content: string
  tool_calls?: ToolCall[]
  thinking?: string
  tool_name?: string
  tool_call_id?: string
}

interface ToolCall {
  id: string
  function: { name: string; arguments: Record<string, unknown> }
}

interface ToolDef {
  type: "function"
  function: {
    name: string
    description: string
    parameters: {
      type: "object"
      properties: Record<string, unknown>
      required: string[]
    }
  }
}

interface Tool {
  definition: ToolDef
  execute(args: Record<string, unknown>): Promise<string>
}

// ── Ollama Client ────────────────────────────────────────────────────────────

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434"

interface StreamCallbacks {
  onThinking?: (chunk: string) => void
  onContent?: (chunk: string) => void
}

async function ollamaChat(
  model: string,
  messages: Message[],
  tools: ToolDef[],
  callbacks?: StreamCallbacks,
): Promise<Message> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, tools, stream: true, think: true }),
  })
  if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`)

  const reader = res.body?.getReader()
  if (!reader) throw new Error("No response body")

  const decoder = new TextDecoder()
  let content = ""
  let thinking = ""
  let toolCalls: ToolCall[] = []
  let buf = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buf += decoder.decode(value, { stream: true })
    const lines = buf.split("\n")
    buf = lines.pop() ?? "" // keep incomplete last line

    for (const line of lines) {
      if (!line.trim()) continue
      let chunk: { message?: { content?: string; thinking?: string; tool_calls?: ToolCall[] }; done?: boolean }
      try { chunk = JSON.parse(line) } catch { continue }

      const msg = chunk.message
      if (!msg) continue

      if (msg.thinking) {
        thinking += msg.thinking
        callbacks?.onThinking?.(msg.thinking)
      }
      if (msg.content) {
        content += msg.content
        callbacks?.onContent?.(msg.content)
      }
      if (msg.tool_calls?.length) {
        toolCalls.push(...msg.tool_calls)
      }
    }
  }

  // parse leftover buffer
  if (buf.trim()) {
    try {
      const chunk = JSON.parse(buf) as { message?: { content?: string; thinking?: string; tool_calls?: ToolCall[] } }
      if (chunk.message?.thinking) {
        thinking += chunk.message.thinking
        callbacks?.onThinking?.(chunk.message.thinking)
      }
      if (chunk.message?.content) {
        content += chunk.message.content
        callbacks?.onContent?.(chunk.message.content)
      }
      if (chunk.message?.tool_calls?.length) {
        toolCalls.push(...chunk.message.tool_calls)
      }
    } catch {}
  }

  const result: Message = { role: "assistant", content }
  if (thinking) result.thinking = thinking
  if (toolCalls.length) result.tool_calls = toolCalls
  return result
}

async function ollamaModels(): Promise<string[]> {
  const res = await fetch(`${OLLAMA_URL}/api/tags`)
  if (!res.ok) return []
  const data = (await res.json()) as { models: { name: string }[] }
  return data.models.map((m) => m.name)
}

// Rank models by coding capability — higher score = better pick
function modelScore(name: string): number {
  const n = name.toLowerCase()
  // coding-specific models — best
  if (n.includes("codellama") || n.includes("deepseek-coder") || n.includes("codegemma") || n.includes("starcoder"))
    return 1000
  // strong general models known for good tool use / coding
  if (n.includes("qwen3") || n.includes("qwen2.5-coder") || n.includes("llama3") || n.includes("gemma2") || n.includes("mistral") || n.includes("command-r"))
    return 500
  if (n.includes("qwen"))
    return 400
  if (n.includes("phi") || n.includes("solar"))
    return 300
  // tiny models — last resort
  if (n.includes("smollm") || n.includes("tinyllama"))
    return 10
  // everything else — middle tier
  return 200
}

// Extract param size from model name (e.g. "qwen3:14b" → 14, "qwen3:0.6b" → 0.6)
function modelParamSize(name: string): number {
  const m = name.match(/:(\d+\.?\d*)b/i)
  if (m) return parseFloat(m[1])
  // Common suffixes like ":latest" — treat as unknown mid-size
  return 7
}

function pickBestModel(models: string[]): string {
  // Sort by: 1) model family score (desc), 2) param size (desc, bigger = smarter)
  return [...models].sort((a, b) => {
    const scoreDiff = modelScore(b) - modelScore(a)
    if (scoreDiff !== 0) return scoreDiff
    return modelParamSize(b) - modelParamSize(a)
  })[0]
}

// ── Tool Implementations ────────────────────────────────────────────────────

function makeReadFile(): Tool {
  return {
    definition: {
      type: "function",
      function: {
        name: "ReadFile",
        description:
          "Read a file from disk. Returns numbered lines. For directories, lists entries. Use offset/limit for large files.",
        parameters: {
          type: "object",
          properties: {
            filePath: { type: "string", description: "Absolute or relative path" },
            offset: { type: "number", description: "1-indexed line to start from (default: 1)" },
            limit: { type: "number", description: "Max lines to return (default: 2000)" },
          },
          required: ["filePath"],
        },
      },
    },
    async execute(args) {
      const filePath = resolve(String(args.filePath))
      const offset = Math.max(1, Number(args.offset ?? 1))
      const limit = Math.max(1, Number(args.limit ?? 2000))

      const s = await stat(filePath).catch(() => null)
      if (!s) return `Error: file not found: ${filePath}`

      if (s.isDirectory()) {
        const entries = await readdir(filePath)
        return entries
          .map((e) => e)
          .sort()
          .join("\n")
      }

      const content = await readFile(filePath, "utf-8")
      const lines = content.split("\n")
      const slice = lines.slice(offset - 1, offset - 1 + limit)
      const numbered = slice.map((line, i) => {
        const num = offset + i
        const truncated = line.length > 2000 ? line.slice(0, 2000) + "... (truncated)" : line
        return `${num}: ${truncated}`
      })

      const total = lines.length
      const shown = slice.length
      const header = shown < total ? `(Showing lines ${offset}-${offset + shown - 1} of ${total})` : ""
      return numbered.join("\n") + (header ? `\n${header}` : "")
    },
  }
}

function makeWriteFile(): Tool {
  return {
    definition: {
      type: "function",
      function: {
        name: "WriteFile",
        description: `Write or patch a file. Two modes:
1. Full write: provide 'content' to replace entire file.
2. Patch: provide 'oldString' and 'newString' to find-and-replace a section (like OpenCode's edit tool). The oldString must match exactly once unless replaceAll is true.`,
        parameters: {
          type: "object",
          properties: {
            filePath: { type: "string", description: "Absolute or relative path" },
            content: { type: "string", description: "Full file content (for full write mode)" },
            oldString: { type: "string", description: "Text to find (for patch mode)" },
            newString: { type: "string", description: "Replacement text (for patch mode)" },
            replaceAll: { type: "boolean", description: "Replace all occurrences (default: false)" },
          },
          required: ["filePath"],
        },
      },
    },
    async execute(args) {
      const filePath = resolve(String(args.filePath))
      await mkdir(dirname(filePath), { recursive: true })

      // Patch mode
      if (args.oldString !== undefined) {
        const oldStr = String(args.oldString)
        const newStr = String(args.newString ?? "")
        const existing = await readFile(filePath, "utf-8").catch(() => null)

        if (existing === null) {
          if (oldStr === "") {
            await writeFile(filePath, newStr, "utf-8")
            return `Created new file: ${filePath}`
          }
          return `Error: file not found for patching: ${filePath}`
        }

        if (args.replaceAll) {
          const result = existing.replaceAll(oldStr, newStr)
          await writeFile(filePath, result, "utf-8")
          const count = (existing.split(oldStr).length - 1)
          return `Replaced ${count} occurrence(s) in ${filePath}`
        }

        const firstIdx = existing.indexOf(oldStr)
        if (firstIdx === -1) return `Error: oldString not found in ${filePath}`
        const lastIdx = existing.lastIndexOf(oldStr)
        if (firstIdx !== lastIdx)
          return `Error: found multiple matches for oldString. Use replaceAll or provide more context to make it unique.`

        const result = existing.slice(0, firstIdx) + newStr + existing.slice(firstIdx + oldStr.length)
        await writeFile(filePath, result, "utf-8")

        // Generate simple diff info
        const oldLines = oldStr.split("\n").length
        const newLines = newStr.split("\n").length
        return `Patched ${filePath}: replaced ${oldLines} line(s) with ${newLines} line(s)`
      }

      // Full write mode
      const content = String(args.content ?? "")
      const existing = await readFile(filePath, "utf-8").catch(() => null)
      await writeFile(filePath, content, "utf-8")

      if (existing === null) return `Created new file: ${filePath} (${content.split("\n").length} lines)`
      return `Wrote ${filePath} (${content.split("\n").length} lines)`
    },
  }
}

function makeBash(): Tool {
  return {
    definition: {
      type: "function",
      function: {
        name: "Bash",
        description: "Execute a shell command and return stdout+stderr. Default timeout: 120s.",
        parameters: {
          type: "object",
          properties: {
            command: { type: "string", description: "Shell command to run" },
            workdir: { type: "string", description: "Working directory (optional)" },
            timeout: { type: "number", description: "Timeout in milliseconds (default: 120000)" },
          },
          required: ["command"],
        },
      },
    },
    async execute(args) {
      const command = String(args.command)
      const workdir = args.workdir ? resolve(String(args.workdir)) : process.cwd()
      const timeout = Number(args.timeout ?? 120_000)

      return new Promise<string>((done) => {
        const chunks: Buffer[] = []
        const proc = spawn("sh", ["-c", command], {
          cwd: workdir,
          stdio: ["ignore", "pipe", "pipe"],
          env: { ...process.env },
        })

        proc.stdout.on("data", (d: Buffer) => chunks.push(d))
        proc.stderr.on("data", (d: Buffer) => chunks.push(d))

        const timer = setTimeout(() => {
          proc.kill("SIGTERM")
          setTimeout(() => proc.kill("SIGKILL"), 3000)
        }, timeout)

        proc.on("close", (code) => {
          clearTimeout(timer)
          const output = Buffer.concat(chunks).toString("utf-8")
          const truncated = output.length > 50_000 ? output.slice(0, 50_000) + "\n...(truncated)" : output
          const prefix = code !== 0 ? `[exit code: ${code}]\n` : ""
          done(prefix + truncated)
        })

        proc.on("error", (err) => {
          clearTimeout(timer)
          done(`Error spawning process: ${err.message}`)
        })
      })
    },
  }
}

function makeEval(): Tool {
  return {
    definition: {
      type: "function",
      function: {
        name: "Eval",
        description:
          "Evaluate JavaScript or TypeScript code inside the agent process (Bun runtime). Returns the result of the last expression, or console output. Use for quick calculations, data transforms, or testing snippets.",
        parameters: {
          type: "object",
          properties: {
            code: { type: "string", description: "JS/TS code to evaluate" },
          },
          required: ["code"],
        },
      },
    },
    async execute(args) {
      const code = String(args.code)
      const logs: string[] = []
      const fakeConsole = {
        log: (...a: unknown[]) => logs.push(a.map(String).join(" ")),
        error: (...a: unknown[]) => logs.push("[stderr] " + a.map(String).join(" ")),
        warn: (...a: unknown[]) => logs.push("[warn] " + a.map(String).join(" ")),
        info: (...a: unknown[]) => logs.push(a.map(String).join(" ")),
      }
      try {
        const transpiler = new Bun.Transpiler({ loader: "ts" })
        const js = transpiler.transformSync(code)
        const fn = new Function("console", `return (async () => { ${js} })()`)
        const result = await fn(fakeConsole)
        const output = logs.length ? logs.join("\n") + "\n" : ""
        const resultStr = result !== undefined ? String(result) : ""
        return (output + resultStr).trim() || "(no output)"
      } catch (err: unknown) {
        const output = logs.length ? logs.join("\n") + "\n" : ""
        return output + `Error: ${err instanceof Error ? err.message : String(err)}`
      }
    },
  }
}

function makeLoadSkill(skillMap: Map<string, string>): Tool {
  return {
    definition: {
      type: "function",
      function: {
        name: "LoadSkill",
        description:
          "Load a skill by name. Returns the SKILL.md content which contains instructions for that skill. Available skills are listed in the system prompt.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Skill name to load" },
          },
          required: ["name"],
        },
      },
    },
    async execute(args) {
      const name = String(args.name)
      const path = skillMap.get(name)
      if (!path) {
        const available = [...skillMap.keys()].sort().join(", ")
        return `Error: skill '${name}' not found. Available: ${available}`
      }
      const content = await readFile(path, "utf-8").catch(() => `Error reading skill: ${path}`)
      return `# Skill: ${name}\n\n${content}`
    },
  }
}

function makeTask(
  model: string,
  systemPrompt: string,
  tools: Tool[],
): Tool {
  return {
    definition: {
      type: "function",
      function: {
        name: "Task",
        description:
          "Spawn a sub-agent to handle a task autonomously. The sub-agent gets its own conversation with the same tools and system prompt. Returns the final response.",
        parameters: {
          type: "object",
          properties: {
            description: { type: "string", description: "Short task description (3-5 words)" },
            prompt: { type: "string", description: "Detailed task instructions for the sub-agent" },
          },
          required: ["description", "prompt"],
        },
      },
    },
    async execute(args) {
      const prompt = String(args.prompt)
      const desc = String(args.description ?? "sub-task")
      process.stderr.write(`\x1b[90m[Task: ${desc}]\x1b[0m\n`)

      const subMessages: Message[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ]

      const toolDefs = tools.map((t) => t.definition)
      const toolMap = new Map(tools.map((t) => [t.definition.function.name, t]))
      const MAX_TURNS = 20

      for (let turn = 0; turn < MAX_TURNS; turn++) {
        const reply = await ollamaChat(model, subMessages, toolDefs)  // no streaming callbacks for sub-agents
        subMessages.push(reply)

        if (!reply.tool_calls?.length) {
          return `[Task: ${desc}]\n${reply.content}`
        }

        for (const call of reply.tool_calls) {
          const tool = toolMap.get(call.function.name)
          const result = tool
            ? await tool.execute(call.function.arguments)
            : `Error: unknown tool '${call.function.name}'`
          subMessages.push({ role: "tool", content: result, tool_name: call.function.name, tool_call_id: call.id })
        }
      }

      return `[Task: ${desc}] Reached max turns (${MAX_TURNS})`
    },
  }
}

// ── Skill Scanner ────────────────────────────────────────────────────────────

async function scanSkills(): Promise<Map<string, string>> {
  const skills = new Map<string, string>()
  const dirs = [join(homedir(), ".agents", "skills"), join(process.cwd(), ".agents", "skills")]

  for (const dir of dirs) {
    const entries = await readdir(dir).catch(() => [] as string[])
    for (const entry of entries) {
      const skillPath = join(dir, entry, "SKILL.md")
      const s = await stat(skillPath).catch(() => null)
      if (s?.isFile()) {
        // Extract description from frontmatter if present
        skills.set(entry, skillPath)
      }
    }
  }

  return skills
}

async function getSkillDescriptions(skillMap: Map<string, string>): Promise<string> {
  const lines: string[] = []
  for (const [name, path] of skillMap) {
    const content = await readFile(path, "utf-8").catch(() => "")
    // Try to extract description from YAML frontmatter
    const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/)
    let desc = ""
    if (fmMatch) {
      const descMatch = fmMatch[1].match(/description:\s*(.+)/)
      if (descMatch) desc = descMatch[1].trim()
    }
    if (!desc) {
      // Fallback: first non-heading, non-empty line
      const bodyLines = content.split("\n").filter((l) => l.trim() && !l.startsWith("#") && !l.startsWith("---"))
      desc = bodyLines[0]?.trim().slice(0, 100) ?? ""
    }
    lines.push(`- ${name}: ${desc}`)
  }
  return lines.join("\n")
}

// ── Agent Instructions Loader ────────────────────────────────────────────────

async function loadAgentInstructions(): Promise<string> {
  const paths = [join(homedir(), ".agents", "agents.md"), join(process.cwd(), "agents.md")]
  const parts: string[] = []

  for (const p of paths) {
    const content = await readFile(p, "utf-8").catch(() => null)
    if (content) parts.push(`# Instructions from: ${p}\n\n${content}`)
  }

  return parts.join("\n\n---\n\n")
}

// ── System Prompt Builder ────────────────────────────────────────────────────

function buildSystemPrompt(agentInstructions: string, skillList: string, model: string): string {
  const cwd = process.cwd()
  const today = new Date().toLocaleDateString("en-CA") // YYYY-MM-DD
  const platform = process.platform

  return `You are spark, an interactive CLI coding agent. You solve coding tasks by reading, writing, and running code directly.

<env>
  Model: ${model}
  Working directory: ${cwd}
  Platform: ${platform}
  Today: ${today}
</env>

## Behavior
- Be concise and direct. No preamble, no filler.
- When referring to code, use \`file_path:line_number\` references.
- Prefer editing existing files over creating new ones.
- If a task requires multiple independent tool calls, make them all at once.
- Verify your work — run the code, check the output, confirm it works.

## Available Skills
Use LoadSkill to read a skill's full instructions when a task matches.
${skillList || "(none)"}
${agentInstructions ? `\n## Agent Instructions\n${agentInstructions}` : ""}
`
}

// ── REPL ─────────────────────────────────────────────────────────────────────

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[90m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
}

function printHeader(model: string, skillCount: number) {
  console.log(`${COLORS.cyan}${COLORS.bold}spark${COLORS.reset} ${COLORS.dim}— AI coding agent${COLORS.reset}`)
  console.log(`${COLORS.dim}Model:${COLORS.reset} ${model}  ${COLORS.dim}Skills:${COLORS.reset} ${skillCount}  ${COLORS.dim}Dir:${COLORS.reset} ${process.cwd()}`)
  console.log(`${COLORS.dim}Commands: /models /clear /quit${COLORS.reset}`)
  console.log()
}

const MODEL_FILE = join(".agents", "spark", "model")

async function saveModel(model: string): Promise<void> {
  const dir = dirname(MODEL_FILE)
  await mkdir(dir, { recursive: true }).catch(() => {})
  await writeFile(MODEL_FILE, model, "utf-8")
}

async function loadSavedModel(): Promise<string | null> {
  try {
    const saved = (await readFile(MODEL_FILE, "utf-8")).trim()
    return saved || null
  } catch {
    return null
  }
}

async function selectModel(models: string[], current: string, rl: ReturnType<typeof createInterface>): Promise<string> {
  console.log(`\n${COLORS.cyan}Available models:${COLORS.reset}`)
  models.forEach((m, i) => {
    const marker = m === current ? ` ${COLORS.green}(current)${COLORS.reset}` : ""
    console.log(`  ${COLORS.dim}${i + 1}.${COLORS.reset} ${m}${marker}`)
  })

  const answer = await new Promise<string>((res) => {
    rl.question(`${COLORS.yellow}Select model (1-${models.length}): ${COLORS.reset}`, res)
  })

  const idx = parseInt(answer, 10) - 1
  if (idx >= 0 && idx < models.length) {
    const picked = models[idx]
    await saveModel(picked)
    console.log(`${COLORS.green}Switched to ${picked}${COLORS.reset}`)
    return picked
  }
  console.log(`${COLORS.dim}Keeping ${current}${COLORS.reset}`)
  return current
}

async function main() {
  // 1. Check Ollama
  const models = await ollamaModels()
  if (models.length === 0) {
    console.error(`${COLORS.red}Error: No Ollama models found. Is Ollama running?${COLORS.reset}`)
    console.error(`${COLORS.dim}Start it with: ollama serve${COLORS.reset}`)
    process.exit(1)
  }

  // Try saved model first, fall back to auto-pick
  const savedModel = await loadSavedModel()
  let currentModel: string
  if (savedModel && models.includes(savedModel)) {
    currentModel = savedModel
    console.log(`${COLORS.dim}Restored saved model: ${savedModel}${COLORS.reset}`)
  } else {
    currentModel = pickBestModel(models)
  }

  // 2. Load skills
  const skillMap = await scanSkills()
  const skillList = await getSkillDescriptions(skillMap)

  // 3. Load agent instructions
  const agentInstructions = await loadAgentInstructions()

  // 4. Build tools (core tools first, then system prompt, then Task uses lazy ref)
  const readFileTool = makeReadFile()
  const writeFileTool = makeWriteFile()
  const bashTool = makeBash()
  const evalTool = makeEval()
  const loadSkillTool = makeLoadSkill(skillMap)
  const coreTools = [readFileTool, writeFileTool, bashTool, evalTool, loadSkillTool]

  // 5. Build system prompt from core tool defs (Task added manually to description)
  const allToolDefs = [
    ...coreTools.map((t) => t.definition),
    makeTask("", "", []).definition, // just for the schema/description
  ]
  const systemPrompt = buildSystemPrompt(agentInstructions, skillList, currentModel)

  // 6. Build full tool set with Task having a lazy systemPrompt reference
  const buildTools = () => {
    const taskTool = makeTask(currentModel, systemPrompt, coreTools)
    return [...coreTools, taskTool]
  }

  // 6. Init conversation
  const messages: Message[] = [{ role: "system", content: systemPrompt }]

  printHeader(currentModel, skillMap.size)

  // 7. REPL loop
  const rl = createInterface({ input: process.stdin, output: process.stdout })

  const prompt = () =>
    new Promise<string>((res) => {
      rl.question(`${COLORS.green}> ${COLORS.reset}`, res)
    })

  while (true) {
    const input = await prompt()
    const trimmed = input.trim()
    if (!trimmed) continue

    // Handle commands
    if (trimmed === "/quit" || trimmed === "/exit") {
      console.log(`${COLORS.dim}Bye!${COLORS.reset}`)
      rl.close()
      process.exit(0)
    }

    if (trimmed === "/clear") {
      messages.length = 1 // keep system prompt
      console.log(`${COLORS.dim}Conversation cleared.${COLORS.reset}\n`)
      continue
    }

    if (trimmed === "/models") {
      const freshModels = await ollamaModels()
      currentModel = await selectModel(freshModels, currentModel, rl)
      continue
    }

    // Add user message
    messages.push({ role: "user", content: trimmed })

    // Agent loop: call model, handle tool calls, repeat until text response
    const tools = buildTools()
    const toolDefsForCall = tools.map((t) => t.definition)
    const toolMap = new Map(tools.map((t) => [t.definition.function.name, t]))
    const MAX_TOOL_ROUNDS = 30

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      try {
        let thinkingStarted = false
        let contentStarted = false

        const reply = await ollamaChat(currentModel, messages, toolDefsForCall, {
          onThinking(chunk) {
            if (!thinkingStarted) {
              process.stdout.write(`${COLORS.dim}`)
              thinkingStarted = true
            }
            process.stdout.write(chunk)
          },
          onContent(chunk) {
            if (thinkingStarted && !contentStarted) {
              process.stdout.write(`${COLORS.reset}\n\n`)
            }
            if (!contentStarted) contentStarted = true
            process.stdout.write(chunk)
          },
        })

        if (thinkingStarted && !contentStarted) process.stdout.write(`${COLORS.reset}`)

        messages.push(reply)

        // No tool calls → finalize streamed response
        if (!reply.tool_calls?.length) {
          if (contentStarted || thinkingStarted) process.stdout.write("\n\n")
          break
        }

        // If there were tool calls, close any open styling
        if (thinkingStarted || contentStarted) process.stdout.write(`${COLORS.reset}\n`)

        // Execute tool calls
        for (const call of reply.tool_calls) {
          const toolName = call.function.name
          const toolArgs = call.function.arguments
          const tool = toolMap.get(toolName)

          console.log(`${COLORS.magenta}[${toolName}]${COLORS.reset} ${COLORS.dim}${formatToolArgs(toolArgs)}${COLORS.reset}`)

          let result: string
          if (!tool) {
            result = `Error: unknown tool '${toolName}'`
          } else {
            try {
              result = await tool.execute(toolArgs)
            } catch (err: unknown) {
              result = `Error: ${err instanceof Error ? err.message : String(err)}`
            }
          }

          // Show truncated result
          const preview = result.length > 500 ? result.slice(0, 500) + `\n${COLORS.dim}...(${result.length} chars total)${COLORS.reset}` : result
          console.log(`${COLORS.dim}${preview}${COLORS.reset}`)

          messages.push({ role: "tool", content: result, tool_name: toolName, tool_call_id: call.id })
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`${COLORS.red}Error: ${msg}${COLORS.reset}`)
        // Push error as assistant message so conversation doesn't break
        messages.push({ role: "assistant", content: `I encountered an error: ${msg}` })
        break
      }
    }
  }
}

function formatToolArgs(args: Record<string, unknown>): string {
  const parts: string[] = []
  for (const [k, v] of Object.entries(args)) {
    const val = typeof v === "string" ? (v.length > 80 ? v.slice(0, 80) + "..." : v) : JSON.stringify(v)
    parts.push(`${k}=${val}`)
  }
  return parts.join(" ")
}

// ── Entry ────────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error(`${COLORS.red}Fatal: ${err.message}${COLORS.reset}`)
  process.exit(1)
})
