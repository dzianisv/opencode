# Handoff: Workflow Bare-Globals — research-market.workflow.js

**Branch:** `feat/workflow-bare-globals`  
**PR:** #232  
**Objective:** Make `opencode` run `/Users/engineer/workspace/backtest/.agents/workflows/research-market.workflow.js` successfully.

---

## Status: ~80% done — simple workflows work, research-market blocked on tool/prompt balance

### What Works ✅

- **Bare-globals shim** — Claude Code format (`agent()`, `phase()`, `parallel()`, `log()`, `args`) parsed and executed
- **Simple agent calls** — text, schema, and structured output all working:
  - `/workflow simple-test` → "4." ✅
  - `/workflow debug-test` → `{"answer": 4}` ✅
  - `/workflow full-test` → `{"ticker":"AAPL","direction":"up","confidence":0.6}` ✅
- **Unit tests pass** (4/4 in `test/workflow/`)
- **Model resolution** — bare `claude-sonnet-4` → `claude-sonnet-4.6`
- **System prompt override** — bypasses AGENTS.md pollution
- **Multiple reasoning_opaque crash** — fixed in copilot SDK

### What's Broken ❌

**research-market's first agent call returns empty / "Bad Request"**

The workflow's Phase 0 (Intake) asks the model to:
1. List `/Users/engineer/workspace/backtest/.agents/skills/` (67 directories)
2. Read each `SKILL.md` description
3. Return a structured research plan (PLAN_SCHEMA)

This requires **tool access** (read/glob), but:
- With ALL tools enabled → "Bad Request" (prompt too large — skill tool description alone lists 67 skills)
- With tools disabled → model can't read files → returns empty → "no plan from manager"

### Latest Uncommitted Fix (in working tree)

**Tool whitelist** — workflow agent calls only get `{read, glob, grep, shell}` tools instead of all 22+. This prevents the massive skill/task tool descriptions from bloating the prompt.

Also added **whitelist support to `resolveTools()`** in prompt.ts — when `tools` map has specific keys set to `true` (not `"*"`), only those tools are included.

**Test result:** Server accepted the request (no "Bad Request"), but response didn't come back within 6 minutes. Likely still running/hanging or timing out on the model side.

---

## Key Files

| File | What |
|------|------|
| `packages/opencode/src/workflow/index.ts` | Core workflow engine — shim, agent calls, model resolution, follow-up mechanism |
| `packages/opencode/src/session/prompt.ts` | Session prompt loop — tool filtering, system override, wildcard disable |
| `packages/opencode/src/provider/sdk/copilot/chat/openai-compatible-chat-language-model.ts` | reasoning_opaque fix (line ~470) |
| `/Users/engineer/workspace/backtest/.agents/workflows/research-market.workflow.js` | Target workflow (243 lines, 6 phases) |

---

## Architecture

### Bare-Globals Shim (`importBareGlobals()`)
```
new AsyncFunction('args', 'agent', 'parallel', 'phase', 'log', body)
```
- Strips `export const meta = {...}` and `export` keywords from source
- Injects runtime globals via function params
- `agentFn(prompt, opts)` bridges to `ctx.agent({prompt, ...opts})`

### Agent Call Flow (`ctx.agent()`)
1. Create child session (`sessions.create`)
2. Resolve model (bare name → versioned provider match)
3. Embed schema instruction in prompt text (avoids StructuredOutput tool conflict with thinking models)
4. Call `promptSvc.prompt()` with:
   - `system`: minimal override (bypasses AGENTS.md)
   - `tools`: whitelist `{read, glob, grep, shell}` (latest uncommitted)
   - `variant`: "low" (default)
5. If schema expected but text empty → follow-up prompt (tools disabled) asks for JSON
6. Parse JSON from response text

### Tool Resolution in `resolveTools()` (prompt.ts)
- `{"*": false}` → return empty tools (short-circuit)
- Whitelist (e.g., `{read: true, glob: true}`) → filter registry output to only those IDs
- Default → all tools

---

## Root Causes of Each Bug Fixed

1. **Tool schema crash** — `EffectZod.toJsonSchema()` throws on some tool params → try-catch + skip
2. **Silent errors** — `halt()` swallows, `ctx.agent()` didn't check → added error propagation
3. **System prompt pollution** — AGENTS.md (skills, env, persona) bled into child sessions → `firstUserSystem` override
4. **Wildcard disable broken** — `{"*": false}` was literal key, not wildcard → early-return in resolveTools
5. **Multiple reasoning_opaque** — copilot SDK threw on >1 thinking block → accept latest
6. **Explicit model breaks routing** — passing `model` param causes garbage from Copilot API → removed
7. **All tools = prompt too large** — 22 tools + massive descriptions → "Bad Request" → tool whitelist

---

## What Needs to Happen Next

### Option A: Tool Whitelist (current approach, partially tested)
The whitelist code is in the working tree. Test it:
```bash
cd /Users/engineer/workspace/backtest
bun run /Users/engineer/workspace/opencode/packages/opencode/src/index.ts serve --hostname 127.0.0.1 --port 4098
# In another terminal:
SESSION=$(curl -s -X POST http://127.0.0.1:4098/session -d '{}' -H "Content-Type: application/json" | jq -r .id)
curl -s -X POST "http://127.0.0.1:4098/session/$SESSION/command" -H "Content-Type: application/json" -d '{"command":"workflow","arguments":"research-market ticker=BTC"}'
```
**Potential issue:** Even with only 4 tools, the model may take too long making 67 read calls, or the session may hit token limits accumulating all 67 skill file contents.

### Option B: Pre-inject Skill Catalog (more reliable)
Instead of tools, pre-read the skill catalog in the workflow engine and inject it as prompt context:
1. Detect paths in the prompt text that reference directories (regex for paths ending in `/`)
2. List the directory, read each `SKILL.md` (first 5 lines), concatenate as context block
3. Prepend to prompt: `<context>\n<skills_catalog>\n...\n</skills_catalog>\n</context>`
4. Keep tools disabled → model has everything it needs to produce the plan

This is faster (no tool loop), more reliable (no "Bad Request"), and works for any workflow that references local files.

### Option C: Hybrid
- Tools enabled for read/glob only
- Timeout: if prompt takes >60s, kill and retry with pre-injected context
- More complex but handles edge cases

### After fixing research-market Phase 0:
- Phases 1-5 use `agent()` with different prompts — each may have similar issues
- Some phases use `parallel()` with multiple agent calls — test these
- Final output should be a structured investment report

---

## How to Run Tests

```bash
# Unit tests (should always pass)
cd /Users/engineer/workspace/opencode/packages/opencode
bun test test/workflow/

# Typecheck
bun run typecheck 2>&1 | grep "error TS" | grep -v "test/"

# E2E manual test (simple workflows — known working)
cd /Users/engineer/workspace/backtest
bun run /path/to/opencode/packages/opencode/src/index.ts serve --hostname 127.0.0.1 --port 4098
# Then POST /session + /session/:id/command as shown above
```

---

## Commits on Branch (chronological)

1. `187696495` — feat: support Claude Code bare-globals format (shim + discovery)
2. `d2c4fb228` — fix: guard against tool schema serialization crash
3. `67336e4d0` — fix: resolve bare model IDs across all providers
4. `281a049a0` — fix: make bare-globals agent calls work E2E (system override, wildcard disable, reasoning_opaque, follow-up mechanism)
5. **Uncommitted** — tool whitelist (4 tools only) + whitelist support in resolveTools

---

## Key Learnings

- **GitHub Copilot API rejects `claude-sonnet-4`** — must use `claude-sonnet-4.6`
- **Passing `model` param to `promptSvc.prompt()` breaks responses** — use default model (undefined)
- **`toolChoice: "required"` incompatible with thinking/reasoning models** — use prompt-based structured output instead
- **Prompt size is the #1 bottleneck** — skill tool description (67 skills) + task tool description (all sub-agents) = thousands of tokens just in tool definitions
- **research-market Phase 0 needs 67 file contents** — this is ~50-100k tokens of context. The model needs a large context window AND file access to produce the plan.
