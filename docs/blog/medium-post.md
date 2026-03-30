# We Run 8+ OpenCode Sessions All Day. Here's What We Had to Fix.

## The problem

[OpenCode](https://github.com/anomalyco/opencode) is a fantastic open-source AI coding agent with a client/server architecture that lets you drive it from a browser -- even your phone. We adopted it as our daily driver, running it on a headless Mac Mini that we SSH into from laptops, tablets, and phones.

Then reality set in.

With 8+ concurrent sessions across multiple projects the server would balloon past 2 GB RSS within an hour. The web UI had no way to see what was happening across projects without clicking into each sidebar individually. And when you're dictating code changes from a phone on the couch, you really want TTS/STT to just work -- not rely on a desktop TUI.

We forked OpenCode to fix these things. Here's what we changed and why.

---

## 1. Memory: making it survive 8 hours, not 8 minutes

The upstream memory issues are well-documented: [#17908](https://github.com/anomalyco/opencode/issues/17908), [#17237](https://github.com/anomalyco/opencode/issues/17237), [#12687](https://github.com/anomalyco/opencode/issues/12687), and several more. We traced them to three root causes in our workload:

### Per-token DB writes during streaming

Every time the LLM emits a token, the upstream code writes a `updatePartDelta` to the database. At ~50 tokens/second across 8 sessions, that's 400 DB writes/second of tiny string appends. The write pressure caused Bun's event loop to back up, retaining intermediate closures in memory.

**Fix:** We batch token deltas in memory and flush every 50 ms. The `SessionProcessor` now maintains a `pending` map per text part, accumulates deltas as strings in an array, and uses a single `setTimeout` to coalesce them. On flush, it joins the array, updates the part text once, and fires one `updatePartDelta` call. Result: ~20x fewer DB writes during streaming.

### Unbounded project instance cache

Every time you open a session in a different project directory, OpenCode boots a full `Instance` (LSP clients, file watchers, PTY pool). These were never evicted. After touching 10 projects, you had 10 full instances alive.

**Fix:** LRU eviction with a configurable cap (default 4). Each instance tracks a reference count and a last-seen timestamp. A periodic sweep evicts idle instances beyond the cap. Configurable via `OPENCODE_INSTANCE_MAX` and `OPENCODE_INSTANCE_IDLE_MS` environment variables.

### No idle garbage collection

Bun's GC is generational but conservative -- it won't aggressively collect unless pressured. Between sessions, large retained heaps from completed conversations just sat there.

**Fix:** A `GC` utility that tracks which sessions are actively processing. When no session has been active for 5 minutes, it calls `Bun.gc(true)` and logs the freed memory. On our workload this regularly reclaims 200-400 MB of retained conversation context.

We also added a `GET /global/memory` diagnostic endpoint that returns RSS, V8 heap stats, instance cache state, and the child-process tree -- useful for monitoring in production.

---

## 2. Recently Active sessions: the missing orchestration layer

When you're running sessions across 4-5 repos simultaneously, the per-project sidebar is not enough. You need a global view.

We built a **Recently Active dashboard** that queries `Session.listGlobal()` across all projects. It shows:

- Session title, project name, and last-updated time
- Diff stats (additions / deletions / files changed)
- A tree view that groups forked/child sessions under their parent
- Full-text search across all sessions

The sidebar also gets a pinned "Recent" tab so you can jump between active work without navigating to different project roots.

![Active Sessions + Auto Review](../images/active-sessions-auto-review.png)

---

## 3. Voice: TTS and STT for mobile-first workflows

OpenCode's client/server split means you can `opencode serve` on a beefy machine and drive it from a phone browser. But typing complex prompts on a phone is painful, and reading long assistant responses on a small screen is worse.

### Server-backed Edge TTS

We added a `POST /tts/edge` endpoint that uses Microsoft's Edge TTS (`node-edge-tts`) to synthesize MP3 audio on the server. The web app fetches audio from this endpoint and falls back to browser `speechSynthesis` on failure. Voice, rate, pitch, and volume are configurable in the opencode config under `voice.edge`.

Every assistant message now has a speaker icon you can tap to hear it read aloud.

### Browser STT (Speech-to-Text)

A microphone button in the prompt bar uses the Web Speech API for dictation. On desktop Electron builds, we preflight microphone permissions so the browser doesn't block the first request. On mobile Safari/Chrome, it just works with the standard permission flow.

---

## 4. Auto-review: the model checks its own work

After the assistant finishes a task, our fork can automatically queue a "review and reflect" follow-up prompt. This makes the model re-examine what it just did and catch mistakes before you even look at it. Controlled by a toggle in Settings > Models > Auto-review (off by default).

This is especially useful in autonomous pipelines where you're running multiple sessions and can't babysit each one.

---

## Who is this for?

- **Power users** running many concurrent sessions on a persistent server
- **Mobile-first workflows** where you drive OpenCode from a phone or tablet
- **Autonomous pipelines** where sessions need to self-check and you need a dashboard to monitor them
- Anyone hitting upstream memory issues on long-running instances

## Links

- **Fork:** [github.com/dzianisv/opencode](https://github.com/dzianisv/opencode)
- **Upstream:** [github.com/anomalyco/opencode](https://github.com/anomalyco/opencode)
- **Upstream memory issues:** [#17908](https://github.com/anomalyco/opencode/issues/17908), [#17237](https://github.com/anomalyco/opencode/issues/17237), [#12687](https://github.com/anomalyco/opencode/issues/12687), [#15645](https://github.com/anomalyco/opencode/issues/15645)

We stay close to upstream and cherry-pick relevant PRs. If any of this is useful to the upstream project, we'd be happy to contribute it back.
