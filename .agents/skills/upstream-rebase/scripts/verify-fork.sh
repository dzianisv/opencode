#!/usr/bin/env bash
# Verify that all fork branches are represented in a target branch.
# Usage: verify-fork.sh <target-branch> [source-branch ...]
#   No source branches -> auto-discover all local branches not merged into target.
# Exit non-zero if any source branch has unmerged (+) commits vs target.
set -euo pipefail

TARGET="${1:-}"
if [ -z "$TARGET" ]; then
  echo "usage: verify-fork.sh <target-branch> [source-branch ...]" >&2
  exit 2
fi
shift || true

git rev-parse --verify "$TARGET" >/dev/null 2>&1 || { echo "no such ref: $TARGET" >&2; exit 2; }

if [ "$#" -gt 0 ]; then
  SOURCES=("$@")
else
  mapfile -t SOURCES < <(git branch --no-merged "$TARGET" --format='%(refname:short)' | grep -vx "$TARGET" | grep -v '^backup/' || true)
fi

if [ "${#SOURCES[@]}" -eq 0 ]; then
  echo "No fork branches with unmerged work vs $TARGET."
  exit 0
fi

echo "Checking ${#SOURCES[@]} branch(es) against $TARGET ..."
echo

fail=0
for b in "${SOURCES[@]}"; do
  git rev-parse --verify "$b" >/dev/null 2>&1 || { echo "  SKIP (no such branch): $b"; continue; }
  plus="$(git cherry -v "$TARGET" "$b" 2>/dev/null | grep -c '^+' || true)"
  if [ "$plus" -gt 0 ]; then
    echo "  DROPPED RISK: $b has $plus commit(s) NOT in $TARGET:"
    git cherry -v "$TARGET" "$b" | grep '^+' | sed 's/^/      /'
    fail=1
  else
    echo "  OK: $b — 0 unmerged commits (all represented in $TARGET)."
  fi
done

echo
if [ "$fail" -ne 0 ]; then
  echo "ACTION REQUIRED: review each '+' commit above."
  echo "  Include it in the rebase, or explicitly decide to drop it (name it in the commit msg)."
  echo "  Do NOT delete these source branches yet."
  exit 1
fi

echo "All fork branches verified. Safe to push and clean up."
