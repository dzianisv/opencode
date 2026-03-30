# LinkedIn Post

---

**Running AI coding agents at scale requires engineering work most people skip.**

We use OpenCode -- an open-source AI coding agent with a client/server architecture -- as our primary development tool. The setup: a headless Mac Mini running `opencode serve`, accessed from laptops, tablets, and phones via the web UI.

The promise is compelling: write code from anywhere, including your phone. The reality with 8+ concurrent sessions: the server would OOM within an hour.

We forked OpenCode and spent time on the unglamorous infrastructure work:

- Batched streaming writes (50ms coalescing instead of per-token DB ops) cut I/O pressure ~20x
- LRU eviction for project instances keeps the cache bounded at 4 (was unbounded)
- Idle GC reclaims 200-400 MB between active sessions
- A memory diagnostics endpoint for production monitoring

Then we built the orchestration layer that multi-session workflows need:

- A cross-project "Recently Active" dashboard with search and diff stats
- Server-backed Edge TTS so you can hear responses on mobile
- Browser STT for voice-driven prompts
- Auto-review mode where the model self-checks after completing a task

The lesson: client/server AI agents are powerful in theory. Making them reliable at scale requires the same kind of operational work as any other production service -- bounded caches, write batching, GC tuning, observability endpoints.

Fork: github.com/dzianisv/opencode
Upstream: github.com/anomalyco/opencode

#OpenSource #AI #CodingAgent #DevTools #SoftwareEngineering
