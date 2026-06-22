#!/usr/bin/env bash
# Post-rebase smoke test: verify recent sessions feature is present in the app build.
# Run after every upstream rebase. Fails fast if feature was dropped.
# Usage: bash packages/app/scripts/smoke-recent-sessions.sh
set -euo pipefail

LAYOUT_DIR="packages/app/src/pages/layout"
APP_DIR="packages/app/src"
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

echo "=== Recent Sessions Feature Smoke Test ==="
echo ""

# 1. sidebar-recent.tsx must exist (it's the recent sessions sidebar component)
check "sidebar-recent.tsx exists" test -f "$LAYOUT_DIR/sidebar-recent.tsx"

# 2. layout.tsx must import RecentTile and RecentSidebarPanel
check "layout.tsx imports RecentTile" grep -q "RecentTile" "$LAYOUT_DIR/../layout.tsx"
check "layout.tsx imports RecentSidebarPanel" grep -q "RecentSidebarPanel" "$LAYOUT_DIR/../layout.tsx"

# 3. sidebarView state must exist (tracks recent vs project view)
check "layout.tsx has sidebarView state" grep -q "sidebarView" "$LAYOUT_DIR/../layout.tsx"

# 4. /recent route must be registered in router
check "/recent route in app.tsx" grep -q '"/recent"' "$APP_DIR/app.tsx"

# 5. Build must pass (catches TypeScript errors)
echo ""
echo "  [BUILD] Running bun run build in packages/app..."
cd packages/app && bun run build 2>&1 | tail -5
cd - >/dev/null

echo ""
if [ "$ERRORS" -gt 0 ]; then
  echo "=== FAILED: $ERRORS check(s) failed ==="
  echo "Recent sessions feature is missing or broken. Do NOT declare the rebase done."
  exit 1
else
  echo "=== PASSED: all recent-sessions checks green ==="
fi
