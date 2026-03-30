# Hacker News

**Title:** Show HN: OpenCode fork for stable 8+ concurrent coding sessions

**URL:** https://github.com/dzianisv/opencode

---

**Comment (post as top-level after submission):**

We run OpenCode (https://github.com/anomalyco/opencode) in server mode on a shared Mac Mini and connect from web clients on laptops and phones.

Under a workload of 8+ concurrent sessions across multiple projects, we saw three failure modes:

1. **Memory pressure and churn**

- Per-token `updatePartDelta` writes generated ~400 tiny DB writes/sec.
- We now batch deltas and flush every 50ms (~20x fewer writes).
- Project `Instance` objects are now LRU-bounded (default cap: 4) instead of unbounded.
- Idle GC runs after 5 minutes with no active sessions and typically reclaims 200-400 MB.
- Added `GET /global/memory` for RSS/heap/cache/process diagnostics.

2. **Missing cross-project orchestration**

- Added a global "Recently Active" view backed by `Session.listGlobal()`.
- Includes search, diff stats, and parent/child session tree.
- Added a pinned "Recent" tab for fast context switching.

3. **Mobile interaction bottlenecks**

- Added server-backed Edge TTS (`POST /tts/edge`) for consistent playback.
- Added browser STT via Web Speech API and per-message playback controls.

4. **Quality control in autonomous runs**

- Added optional auto-review that queues a follow-up "review and reflect" turn after task completion.

Operational value:

- Bounded memory behavior for long-lived `opencode serve` processes.
- Better multi-project observability for session operators.
- Lower manual QA cost in parallel autonomous sessions.

Upstream issues that motivated the memory work: [#17908](https://github.com/anomalyco/opencode/issues/17908), [#17237](https://github.com/anomalyco/opencode/issues/17237), [#12687](https://github.com/anomalyco/opencode/issues/12687), [#15645](https://github.com/anomalyco/opencode/issues/15645).

Fork tracks upstream and cherry-picks selectively.
