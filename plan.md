# Memory Leak Fix - Round 3

## Problem

After fixing O(n²) string concatenation in processor.ts, pty/index.ts, bash.ts, and prompt.ts shell(), opencode still consumes 100GB virtual memory.

## Completed Fixes (Rounds 1-2)

- [x] `processor.ts` — LLM streaming text-delta/reasoning-delta: throttled flush with chunks array
- [x] `pty/index.ts` — PTY buffer: chunks array instead of `buffer += data`
- [x] `bash.ts` — Tool output streaming
- [x] `prompt.ts` — shell() output streaming
- [x] SSE serialization reduced indirectly by 50ms PartUpdated flushes (no direct SSE changes)

## Round 3: Remaining Memory Issues

### HIGH SEVERITY — O(n²) String Concatenation on Hot Paths

#### Fix 1: ripgrep.ts buffer concatenation

- **File**: `packages/opencode/src/file/ripgrep.ts:259`
- **Pattern**: `buffer += decoder.decode(value, { stream: true })`
- **Impact**: On large repos with thousands of files, ripgrep output is processed via streaming `buffer +=`. Each chunk appended copies the entire accumulated buffer. For repos with 50K+ files, this can create GB-scale transient allocations.
- **Fix**: Use `chunks: string[]` pattern, split on newlines from joined chunks only when needed.
- [x] Fixed

#### Fix 2: Copilot streaming tool arguments concatenation

- **File**: `packages/opencode/src/provider/sdk/copilot/chat/openai-compatible-chat-language-model.ts:592`
- **Pattern**: `toolCall.function!.arguments += toolCallDelta.function?.arguments ?? ""`
- **Impact**: Tool call arguments accumulate token-by-token via `+=`. For large tool inputs (e.g., file writes with multi-KB content), this is O(n²). Each token delta copies the entire accumulated arguments string.
- **Fix**: Use `chunks: string[]` pattern, join when checking `isParsableJson`.
- [x] Fixed

#### Fix 3: Copilot assistant message text concatenation

- **File**: `packages/opencode/src/provider/sdk/copilot/chat/convert-to-openai-compatible-chat-messages.ts:94`
- **Pattern**: `text += part.text`
- **Impact**: Assistant message text accumulated via `+=` in a loop over content parts. Less hot than streaming but still O(n²) for messages with many text parts.
- **Fix**: Use array + join pattern.
- [x] Fixed

#### Fix 4: webfetch.ts HTML text extraction

- **File**: `packages/opencode/src/tool/webfetch.ts:190`
- **Pattern**: `text += input.text`
- **Impact**: HTMLRewriter `text()` callback fires per text node. For large HTML pages (up to 5MB), this creates O(n²) string growth. A 5MB page could cause ~12GB of transient allocations.
- **Fix**: Use array + join pattern.
- [x] Fixed

### MEDIUM SEVERITY — Repeated Full Message Loading

#### Fix 5: prompt.ts repeated message loading and deep cloning

- **File**: `packages/opencode/src/session/prompt.ts:302, 627, 664`
- **Pattern**: Every prompt loop iteration:
  1. Line 302: `MessageV2.filterCompacted(MessageV2.stream(sessionID))` — reloads ALL messages + ALL parts from storage
  2. Line 627: Deep clones all messages and all parts via `.map(msg => ({...msg, parts: msg.parts.map(part => ({...part}))}))`
  3. Line 664: `MessageV2.toModelMessages(sessionMessages, model)` — creates another full copy as model messages
- **Impact**: For a session with 50 tool calls and growing message history, each iteration loads, clones, and converts everything from scratch. This is O(n²) in total work across iterations.
- **Fix**: Cache messages across loop iterations, only reload new messages since last iteration.
- [ ] Deferred — requires architectural change, lower risk/reward ratio for Round 3

### LOW SEVERITY — Unbounded Caches/Maps

These are bounded in practice but worth noting:

- `project/state.ts:10` — `recordsByKey` Map grows with instances, cleaned by `dispose()`
- `provider/provider.ts:720-724` — `languages` and `sdk` Maps cache per model/provider
- `session/instruction.ts:47` — `claims` Map grows per message ID
- `share/share-next.ts:115` — queue Map with timeouts

## Verification

- [ ] `bun run typecheck` passes
- [ ] `bun test` passes
- [ ] PR created and CI passes
