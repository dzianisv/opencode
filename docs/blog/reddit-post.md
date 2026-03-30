# [r/programming / r/LocalLLaMA / r/ChatGPTCoding]

**Title:** We run 8+ concurrent OpenCode sessions daily. The server kept dying. Here's what we fixed in our fork.

---

**Post:**

We use [OpenCode](https://github.com/anomalyco/opencode) (open-source AI coding agent with a client/server architecture) as our daily driver. We run `opencode serve` on a Mac Mini and connect from laptops, phones, and tablets via the web UI.

The problem: with 8+ sessions across multiple projects, the server would balloon past 2 GB RSS within an hour and eventually OOM. The web UI also had no way to see what's happening across projects -- each project has its own sidebar.

So we forked it: [github.com/dzianisv/opencode](https://github.com/dzianisv/opencode)

**What we changed:**

**Memory fixes:**

- Batch streaming token writes (50ms flush instead of per-token DB writes -- ~20x fewer writes)
- LRU eviction for project instance cache (default cap: 4, configurable)
- Idle GC that calls `Bun.gc(true)` when no sessions are active for 5 min
- Bounded shell output with `Buffer[]` chunking and byte cap
- Memory diagnostics endpoint (`GET /global/memory`) for monitoring

**Session orchestration:**

- "Recently Active" dashboard showing all sessions across all projects with search, diff stats, and parent/child tree view
- Pinned "Recent" sidebar tab for quick switching

**Voice for mobile:**

- Server-side Edge TTS (`POST /tts/edge`) so you can listen to responses on your phone
- Browser STT via Web Speech API -- mic button in prompt bar
- Per-message speaker icon

**Auto-review:**

- Optional "review and reflect" follow-up that the model runs after completing a task (toggle in settings)

**Auto-accept mode (cherry-picked from upstream PR):**

- `Shift+Tab` toggle in TUI for autonomous pipelines

All of this is motivated by running OpenCode as a persistent server for multiple concurrent users/sessions, which is what the client/server architecture promises but the implementation wasn't quite ready for at scale.

We stay close to upstream and would be happy to contribute any of this back.

Upstream memory issues for context: [#17908](https://github.com/anomalyco/opencode/issues/17908), [#17237](https://github.com/anomalyco/opencode/issues/17237), [#12687](https://github.com/anomalyco/opencode/issues/12687)

Happy to answer questions about the memory profiling or the architecture.
