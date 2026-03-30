# LinkedIn Post

---

**Running AI coding agents at concurrency requires production-style controls.**

We run OpenCode (`opencode serve`) on a headless Mac Mini and connect from web clients on laptops, tablets, and phones.

At 8+ concurrent sessions, the server crossed 2 GB RSS and eventually OOMed. We also lacked cross-project visibility in the web UI.

We implemented four technical changes in our fork:

1. Memory path

- Batched streaming writes (50ms coalescing) instead of per-token DB ops (~20x fewer writes).
- Added LRU eviction for project instances (default cap: 4).
- Added idle GC reclaim after 5 minutes without active sessions (typically 200-400 MB).
- Added `GET /global/memory` diagnostics for RSS/heap/cache/process state.

2. Session orchestration

- Added cross-project "Recently Active" dashboard with search and diff stats.
- Added parent/child session tree and pinned "Recent" tab.

3. Mobile interaction

- Added server-backed Edge TTS (`POST /tts/edge`).
- Added browser STT via Web Speech API.

4. Autonomous quality control

- Added optional auto-review follow-up ("review and reflect") after task completion.

Result: bounded memory behavior, better multi-project visibility, and lower manual QA load for parallel autonomous sessions.

Fork: github.com/dzianisv/opencode
Upstream: github.com/anomalyco/opencode
