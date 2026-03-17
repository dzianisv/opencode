#!/bin/bash
# External memory watchdog for opencode serve.
# Runs independently via launchd/cron; survives opencode crashes.
# Logs process-tree RSS every interval so forensics data exists
# even when the in-process monitor dies.

LOG_DIR="${OPENCODE_WATCHDOG_LOG_DIR:-$HOME/.local/share/opencode/log}"
INTERVAL="${OPENCODE_WATCHDOG_INTERVAL:-30}"
LOG="$LOG_DIR/watchdog.ndjson"

mkdir -p "$LOG_DIR"

tree_rss() {
  local pid=$1
  local total=0
  local pids
  pids=$(pgrep -P "$pid" 2>/dev/null)
  for child in $pids; do
    total=$((total + $(tree_rss "$child")))
  done
  local rss
  rss=$(ps -o rss= -p "$pid" 2>/dev/null | tr -d ' ')
  if [ -n "$rss" ]; then
    total=$((total + rss))
  fi
  echo "$total"
}

while true; do
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  pid=$(pgrep -f 'index.ts serve' | head -1)
  if [ -z "$pid" ]; then
    pid=$(pgrep -f 'opencode serve' | head -1)
  fi
  if [ -z "$pid" ]; then
    printf '{"time":"%s","status":"not_running"}\n' "$ts" >> "$LOG"
  else
    root_rss=$(ps -o rss= -p "$pid" 2>/dev/null | tr -d ' ')
    total_rss=$(tree_rss "$pid")
    count=$(pgrep -P "$pid" 2>/dev/null | wc -l | tr -d ' ')
    root_mb=$(echo "scale=1; ${root_rss:-0} / 1024" | bc)
    total_mb=$(echo "scale=1; ${total_rss:-0} / 1024" | bc)
    printf '{"time":"%s","pid":%s,"root_rss_mb":%s,"tree_rss_mb":%s,"children":%s}\n' \
      "$ts" "$pid" "$root_mb" "$total_mb" "$count" >> "$LOG"
  fi
  sleep "$INTERVAL"
done
