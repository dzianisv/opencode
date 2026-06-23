#!/usr/bin/env bash
# Post-rebase smoke test: verify v2 layout is intact after upstream rebase.
# Run after every upstream rebase. Fails fast if core layout was dropped.
# Usage: bash packages/app/scripts/smoke-recent-sessions.sh
set -euo pipefail

ERRORS=0
check() {
  local desc="$1"; shift
  if "$@" &>/dev/null; then
    echo "  [OK] $desc"
  else
    echo "  [FAIL] $desc"
    ERRORS=$((ERRORS + 1))
  fi
}

echo "=== v2 Layout Smoke Test ==="
echo ""

# v2 design: recent sessions are native to sidebar-project.tsx
check "sidebar-project.tsx has recentSessions (v2 recent sessions)" \
  grep -q "recentSessions" packages/app/src/pages/layout/sidebar-project.tsx

check "layout.tsx imports SortableProject (v2 layout intact)" \
  grep -q "SortableProject" packages/app/src/pages/layout.tsx

check "sidebar-shell.tsx has SidebarContent (nav rail intact)" \
  grep -q "SidebarContent" packages/app/src/pages/layout/sidebar-shell.tsx

echo ""
if [ "$ERRORS" -gt 0 ]; then
  echo "=== FAILED: $ERRORS check(s) failed ==="
  echo "v2 layout is broken. Do NOT declare the rebase done."
  exit 1
else
  echo "=== PASSED: all v2 layout checks green ==="
fi
