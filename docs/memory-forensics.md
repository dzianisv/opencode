# Memory Forensics for `opencode serve`

This document explains how to capture actionable memory evidence before macOS runs out of swap or reboots.

## 1) One-shot diagnostic

From `packages/opencode`:

```bash
bun run src/index.ts debug memory --children
```

With snapshot artifacts:

```bash
bun run src/index.ts debug memory --children --snapshot
```

This writes process memory + instance/session state to stdout, and when `--snapshot` is used, writes artifacts under:

```text
~/.local/share/opencode/log/memory/<timestamp>/
```

Artifacts include:
- `sample.json` (opencode memory + instance/session/pty state)
- `meta.json` (reason and summary)
- `ps.txt` (full process table)
- `vmmap.txt` (macOS only)
- `sample.txt` (macOS only)
- `heap.heapsnapshot`

## 2) Continuous monitor in `serve`

Start `opencode serve` with memory monitor enabled:

```bash
OPENCODE_MEMORY_MONITOR=1 \
OPENCODE_MEMORY_MONITOR_CHILDREN=1 \
OPENCODE_MEMORY_MONITOR_INTERVAL_MS=10000 \
OPENCODE_MEMORY_MONITOR_THRESHOLD_MB=5120 \
opencode serve
```

This writes NDJSON samples to:

```text
~/.local/share/opencode/log/memory-serve-<timestamp>.ndjson
```

When threshold is breached, `opencode` automatically captures a snapshot directory under:

```text
~/.local/share/opencode/log/memory/<timestamp>/
```

## 3) API probe while server is running

Get current memory state via API:

```bash
curl -s "http://127.0.0.1:4096/global/memory?children=true" | jq
```

The response includes:
- process RSS / heap fields
- process-tree RSS (optional)
- instance cache size/entries
- session counts (total + active)
- active PTY count

## 4) Synthetic workload (sessions + prompts + shell churn)

Starting `serve` alone is not enough to expose most leaks. Use this profile runner to generate session/message/tool churn while sampling `/global/memory`:

From `packages/opencode`:

```bash
OPENCODE_BASE_URL="http://127.0.0.1:4096" \
OPENCODE_DIRECTORY="/absolute/path/to/project" \
OPENCODE_PROFILE_DURATION_MS=$((60 * 60 * 1000)) \
OPENCODE_PROFILE_BATCH=8 \
OPENCODE_PROFILE_MIN_SESSIONS=10 \
OPENCODE_PROFILE_MAX_SESSIONS=30 \
OPENCODE_PROFILE_STOP_TREE_MB=5120 \
bun run script/memory-profile.ts
```

Output:
- JSON report in `/tmp/opencode-memory-profile-<timestamp>.json`
- Summary with RSS/heap deltas and linear slope (`MB/min`) for full run and second half (stability check)

Notes:
- The runner uses `noReply: true` for `/session/:id/message` to avoid external model auth dependency.
- The runner also calls `/session/:id/shell` to exercise tool and message paths.
- The runner stops early if process-tree RSS crosses `OPENCODE_PROFILE_STOP_TREE_MB` (default `5120` MB).

## 5) Practical triage sequence

1. Reproduce under normal workload.
2. Keep monitor enabled with threshold.
3. Add synthetic workload if organic usage is too slow to trigger growth.
4. On growth, collect `/global/memory?children=true` snapshots periodically.
5. If threshold hits, inspect generated `memory/<timestamp>` artifact directory first.
6. Compare root process RSS vs process-tree RSS to distinguish:
   - root `opencode` heap growth
   - child-process fanout growth (MCP/browser/tool subprocesses)

## 6) Notes for macOS kernel panic reports

If macOS has already rebooted, inspect panic logs in:

```text
/Library/Logs/DiagnosticReports/panic-full-*.panic
```

`watchdog timeout` + `LOW swap space` indicates system-wide memory pressure at kernel level.
Use `processByPid` resident bytes in that panic file to attribute top memory consumers by process family and coalition.

## 7) Reference long-run profile (2026-03-14)

A 1-hour synthetic run (sessions + prompts + shell churn) produced:
- prompts: `24584`
- shell calls: `7990`
- session churn: `478` creates / `439` deletes
- rss: `287.19 MB -> 364.66 MB` (`+77.47 MB`)
- heap used: `178.31 MB -> 156.64 MB` (`-21.67 MB`)
- tree rss: `507.41 MB -> 533.61 MB` (`+26.2 MB`)
- tree max: `537.33 MB`
- threshold hit (`5120 MB`): `false`

Interpretation:
- No monotonic JS heap growth pattern was observed.
- RSS drift exists, but stayed far from multi-GB runaway behavior in this reproduction.
