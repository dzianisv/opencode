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

## 4) Practical triage sequence

1. Reproduce under normal workload.
2. Keep monitor enabled with threshold.
3. On growth, collect `/global/memory?children=true` snapshots periodically.
4. If threshold hits, inspect generated `memory/<timestamp>` artifact directory first.
5. Compare root process RSS vs process-tree RSS to distinguish:
   - root `opencode` heap growth
   - child-process fanout growth (MCP/browser/tool subprocesses)

## 5) Notes for macOS kernel panic reports

If macOS has already rebooted, inspect panic logs in:

```text
/Library/Logs/DiagnosticReports/panic-full-*.panic
```

`watchdog timeout` + `LOW swap space` indicates system-wide memory pressure at kernel level.
Use `processByPid` resident bytes in that panic file to attribute top memory consumers by process family and coalition.
