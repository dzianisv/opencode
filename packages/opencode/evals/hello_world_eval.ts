import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import promptfoo, { type EvaluateTestSuite } from "promptfoo"

const envfile = Bun.file(path.join(os.homedir(), ".env.d", "codex.env"))
const envok = await envfile.exists()
if (!envok) {
  console.error("Missing ~/.env.d/codex.env for Azure evaluation credentials.")
  process.exit(1)
}

const envtext = await envfile.text()
envtext.split(/\r?\n/).forEach((raw) => {
  const line = raw.trim()
  if (!line) return
  if (line.startsWith("#")) return
  const index = line.indexOf("=")
  if (index <= 0) return
  const key = line.slice(0, index).trim()
  if (!key) return
  const value = line.slice(index + 1).trim()
  process.env[key] = value
})

const base = process.env.AZURE_OPENAI_BASE_URL
if (base) {
  const url = new URL(base)
  const host = `${url.protocol}//${url.host}`
  if (!process.env.AZURE_API_BASE_URL) process.env.AZURE_API_BASE_URL = host
  if (!process.env.AZURE_OPENAI_API_BASE_URL) process.env.AZURE_OPENAI_API_BASE_URL = host
}

if (process.env.AZURE_OPENAI_API_KEY && !process.env.AZURE_API_KEY) {
  process.env.AZURE_API_KEY = process.env.AZURE_OPENAI_API_KEY
}

const model = process.env.AZURE_EVAL_MODEL || process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4.1"
const version = process.env.AZURE_OPENAI_API_VERSION || process.env.AZURE_API_VERSION || "preview"

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "opencode-eval-"))

const prompt = `You are working in the current directory.\n\n1) Create hello.py that prints exactly: Hello, world!\n2) Create test_hello.py using Python's unittest. It must run hello.py, capture stdout, and assert the output equals "Hello, world!" plus a trailing newline.\n3) Run: python -m unittest -q\n4) In your final response, include the test command output and a brief confirmation.`

const check = `const child = process.mainModule.require('node:child_process');\nconst run = child.spawnSync('python', ['-m', 'unittest', '-q'], { cwd: ${JSON.stringify(dir)}, encoding: 'utf8' });\nif (run.error) return { pass: false, score: 0, reason: String(run.error) };\nconst out = (run.stdout || '') + (run.stderr || '');\nif (run.status === 0) return { pass: true, score: 1, reason: out.trim() || 'unittest passed' };\nreturn { pass: false, score: 0, reason: out.trim() || ('unittest failed with status ' + run.status) };`

const suite = {
  description: "opencode hello world eval",
  prompts: [prompt],
  providers: [
    {
      id: "opencode:sdk",
      label: "opencode",
      config: {
        provider_id: "github-copilot",
        model: "gpt-4.1",
        working_dir: dir,
        tools: {
          bash: true,
          edit: true,
          write: true,
          read: true,
          list: true,
          glob: true,
          grep: true
        }
      }
    }
  ],
  tests: [
    {
      description: "agent writes hello world and tests",
      assert: [
        {
          type: "javascript",
          value: check
        },
        {
          type: "llm-rubric",
          provider: {
            id: `azure:responses:${model}`,
            config: {
              apiVersion: version
            }
          },
          value: "Pass if the agent created hello.py and test_hello.py using unittest, ran python -m unittest -q, and reported the output. Fail otherwise."
        }
      ]
    }
  ],
  writeLatestResults: false
} satisfies EvaluateTestSuite

const result = await promptfoo.evaluate(suite)
const failed = result.results.filter((item) => !item.success)
if (failed.length) {
  console.error(`Eval failed: ${failed.length} of ${result.results.length} checks`)
  failed.forEach((item) => {
    console.error(item.error || item.failureReason || "unknown failure")
  })
  process.exit(1)
}

console.log(`Eval passed: ${result.results.length} checks`)
process.exit(0)
