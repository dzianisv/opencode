#!/usr/bin/env bash
# Verify a branch migration dropped no commits.
# Usage: verify-migration.sh <target-branch> [source-branch ...]
#   No source branches given -> auto-discover all branches not merged into target.
# Exit non-zero if any source branch has unmerged (+) commits vs target.
set -euo pipefail

TARGET="${1:-}"
if [ -z "$TARGET" ]; then
  echo "usage: verify-migration.sh <target-branch> [source-branch ...]" >&2
  exit 2
fi
shift || true

git rev-parse --verify "$TARGET" >/dev/null 2>&1 || { echo "no such branch: $TARGET" >&2; exit 2; }

if [ "$#" -gt 0 ]; then
  SOURCES=("$@")
else
  # auto-discover: local branches with work not in target (exclude target itself)
  mapfile -t SOURCES < <(git branch --no-merged "$TARGET" --format='%(refname:short)' | grep -vx "$TARGET" || true)
fi

if [ "${#SOURCES[@]}" -eq 0 ]; then
  echo "No source branches with unmerged work vs $TARGET. Nothing to verify."
  exit 0
fi

fail=0
for b in "${SOURCES[@]}"; do
  git rev-parse --verify "$b" >/dev/null 2>&1 || { echo "skip (no such branch): $b"; continue; }
  # git cherry: '+' = patch not in target, '-' = equivalent already in target
  plus="$(git cherry -v "$TARGET" "$b" 2>/dev/null | grep -c '^+' || true)"
  if [ "$plus" -gt 0 ]; then
    echo "DROPPED RISK: $b has $plus commit(s) NOT in $TARGET:"
    git cherry -v "$TARGET" "$b" | grep '^+' | sed 's/^/    /'
    fail=1
  else
    echo "OK: $b fully represented in $TARGET (0 unmerged)."
  fi
done

if [ "$fail" -ne 0 ]; then
  echo
  echo "REVIEW each '+' commit: include it, or consciously decide to drop it (and say so)."
  echo "Do NOT delete these source branches yet."
  exit 1
fi
echo
echo "All source branches verified. Safe to proceed."
