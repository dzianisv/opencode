import { expect, test } from "bun:test"
import fs from "fs"
import path from "path"
import os from "os"

// Inline the bare-globals logic to test independently of the Effect runtime
function importBareGlobals(source: string) {
  if (!source.includes("export const meta")) return undefined
  const metaMatch = source.match(/export\s+const\s+meta\s*=\s*\{/)
  if (!metaMatch || metaMatch.index === undefined) return undefined
  const braceOpen = metaMatch.index + metaMatch[0].length - 1
  let depth = 0
  let metaEnd = -1
  for (let i = braceOpen; i < source.length; i++) {
    if (source[i] === "{") depth++
    else if (source[i] === "}") { depth--; if (depth === 0) { metaEnd = i + 1; break } }
  }
  if (metaEnd === -1) return undefined
  const metaSource = source.slice(braceOpen, metaEnd)
  let meta: any
  try { meta = new Function("return " + metaSource)() } catch { return undefined }
  if (!meta?.name) return undefined
  const body = (source.slice(0, metaMatch.index) + source.slice(metaEnd)).replace(/^export\s+/gm, "").trim()
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as typeof Function
  const fn = new AsyncFunction("args", "agent", "parallel", "phase", "log", body)
  return { meta, fn }
}

test("parses and runs a bare-globals workflow", async () => {
  const source = `
export const meta = {
  name: 'test-bare',
  description: 'A test',
  phases: [{ title: 'P1' }, { title: 'P2' }],
}

phase('P1')
log('starting')
const result = await agent('do something', { model: 'test/model' })
phase('P2')
const items = await parallel([
  () => agent('task 1', { model: 'test/model' }),
  () => agent('task 2', { model: 'test/model' }),
])
log('done')
return { result, items }
`
  const parsed = importBareGlobals(source)
  expect(parsed).not.toBeUndefined()
  expect(parsed!.meta.name).toBe("test-bare")
  expect(parsed!.meta.phases).toHaveLength(2)

  const phases: string[] = []
  const logs: string[] = []
  const agentCalls: any[] = []
  const mockAgent = async (prompt: string, opts?: any) => {
    agentCalls.push({ prompt, opts })
    return { answer: "mocked-" + agentCalls.length }
  }
  const mockParallel = async (tasks: any[]) => Promise.all(tasks.map((t: any) => t()))
  const mockPhase = (name: string) => phases.push(name)
  const mockLog = (msg: string) => logs.push(msg)

  const result = await parsed!.fn({}, mockAgent, mockParallel, mockPhase, mockLog)
  expect(phases).toEqual(["P1", "P2"])
  expect(logs).toEqual(["starting", "done"])
  expect(agentCalls).toHaveLength(3)
  expect(result.result).toEqual({ answer: "mocked-1" })
  expect(result.items).toHaveLength(2)
})

test("parses research-market.workflow.js", async () => {
  const file = "/Users/engineer/workspace/backtest/.agents/workflows/research-market.workflow.js"
  if (!fs.existsSync(file)) return // skip if not present
  const source = fs.readFileSync(file, "utf8")
  const parsed = importBareGlobals(source)
  expect(parsed).not.toBeUndefined()
  expect(parsed!.meta.name).toBe("research-market")
  expect(parsed!.meta.phases!.length).toBeGreaterThan(0)

  // Run with mocks to verify it completes all phases
  const phases: string[] = []
  const logs: string[] = []
  let callCount = 0
  const mockAgent = async () => {
    callCount++
    // Return shape varies by phase: intake returns plan, gather returns data, panel returns verdict, etc.
    return { asset_class: "crypto", assets: ["BTC"], gather_skills: ["s1"], panel_skills: ["p1"], desk_skill: "d1", chair_skill: "c1", portfolio_provided: false, portfolio_summary: "", side: "long", findings: [], summary: "mock", seat: "s1", read: "mock read", verdict: "HOLD", confidence: "medium", answer: "hold", decision: "hold", tranche_plan: "none", agreement: [], disagreement: [], key_risks: [], invalidation: "n/a", buy_side: "n/a", sell_side: "n/a", verdict_tally: "1/1" }
  }
  const mockParallel = async (tasks: any[]) => {
    const results = []
    for (const t of tasks) { results.push(await t()) }
    return results
  }
  const mockPhase = (name: string) => phases.push(name)
  const mockLog = (msg: string) => logs.push(msg)

  const result: any = await parsed!.fn({ question: "test?", date: "2026-06-17" }, mockAgent, mockParallel, mockPhase, mockLog)
  expect(phases).toContain("Intake")
  expect(phases).toContain("Gather")
  expect(phases).toContain("Decide")
  expect(result.asset_class).toBe("crypto")
})

test("returns undefined for standard workflow format", () => {
  const source = `
import { workflow } from "@opencode-ai/plugin"
export default workflow({
  name: "standard",
  run(args, ctx) { return {} }
})
`
  expect(importBareGlobals(source)).toBeUndefined()
})
