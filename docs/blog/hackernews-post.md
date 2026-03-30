# Hacker News

**Title:** Show HN: We fixed OpenCode's memory leaks to run 8+ AI coding sessions concurrently

**URL:** https://github.com/dzianisv/opencode

---

**Comment (post as top-level after submission):**

OpenCode (https://github.com/anomalyco/opencode) is an open-source AI coding agent with a client/server architecture. We run it on a persistent server and connect from phones, tablets, and laptops via the web UI.

With 8+ concurrent sessions across multiple projects, we hit three scaling problems:

1. **Memory:** Per-token DB writes during streaming caused ~400 writes/sec across sessions. We batch to 50ms flushes (~20x reduction). Project instances were never evicted -- we added LRU with a cap of 4. Idle GC reclaims 200-400 MB between sessions.

2. **Orchestration:** No global view of sessions across projects. We added a cross-project "Recently Active" dashboard with search, diff stats, and parent/child session tree.

3. **Mobile UX:** The client/server split means you can code from a phone, but the UI had no voice support. We added server-backed Edge TTS and browser STT.

4. **Self-checking:** Auto-review mode queues a "review and reflect" follow-up after the model finishes a task.

The upstream issues that motivated the memory work: [#17908](https://github.com/anomalyco/opencode/issues/17908), [#17237](https://github.com/anomalyco/opencode/issues/17237), [#12687](https://github.com/anomalyco/opencode/issues/12687), [#15645](https://github.com/anomalyco/opencode/issues/15645).

We stay close to upstream main and cherry-pick relevant PRs. Happy to contribute any of this back if there's interest.
