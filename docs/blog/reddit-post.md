# [r/programming / r/LocalLLaMA / r/ChatGPTCoding]

**Title:** OpenCode fork: memory and orchestration fixes for 8+ concurrent sessions

---

**Post:**

We run [OpenCode](https://github.com/anomalyco/opencode) in server mode (`opencode serve`) on a Mac Mini and connect from browser clients.

At 8+ concurrent sessions across multiple projects, we hit two concrete problems:

- RSS growth past 2 GB with eventual OOM.
- No global view across projects (only per-project sidebars).

We addressed this in our fork: [github.com/dzianisv/opencode](https://github.com/dzianisv/opencode)

**Changes**

**Memory path**

- Batch streaming token deltas at 50ms instead of per-token DB writes (~20x fewer write ops).
- Add LRU eviction for project instance cache (default cap: 4, configurable).
- Trigger idle GC with `Bun.gc(true)` after 5 minutes with no active sessions.
- Bound shell output retention with chunked `Buffer[]` plus byte caps.
- Add diagnostics endpoint: `GET /global/memory`.

**Session orchestration**

- Add cross-project "Recently Active" dashboard with search, diff stats, and parent/child tree view.
- Add pinned "Recent" tab for faster context switching.

**Mobile interaction**

- Add server-side Edge TTS via `POST /tts/edge`.
- Add browser STT via Web Speech API in the prompt bar.
- Add per-message playback control.

**Autonomous quality check**

- Add optional "review and reflect" follow-up turn after completion.

**Operator control**

- Add `Shift+Tab` auto-accept toggle in TUI (cherry-picked from upstream PR).

**Value**

- Stable long-lived server behavior under parallel session load.
- Better visibility across active workstreams.
- Lower manual review overhead in autonomous pipelines.

Upstream memory issues for context: [#17908](https://github.com/anomalyco/opencode/issues/17908), [#17237](https://github.com/anomalyco/opencode/issues/17237), [#12687](https://github.com/anomalyco/opencode/issues/12687), [#15645](https://github.com/anomalyco/opencode/issues/15645)
