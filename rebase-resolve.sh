#!/bin/bash
set -euo pipefail

REPO="/Users/engineer/workspace/opencode-rebase"
cd "$REPO"

resolve_conflicts() {
  local conflicts
  conflicts=$(git diff --name-only --diff-filter=U 2>/dev/null || true)
  if [ -z "$conflicts" ]; then
    return 0
  fi

  echo "=== Conflicts to resolve ==="
  echo "$conflicts"
  echo "=========================="

  for f in $conflicts; do
    echo "Resolving: $f"
    # For generated SDK files, always take ours (they'll be regenerated)
    # For bun.lock, take theirs
    # For most files, take --theirs (our fork's version)
    git checkout --theirs "$f" 2>/dev/null || {
      echo "  checkout --theirs failed for $f, trying --ours"
      git checkout --ours "$f" 2>/dev/null || {
        echo "  both failed for $f, using git merge-file"
        # Accept all theirs using merge driver
        git show :3:"$f" > "$f" 2>/dev/null || git show :1:"$f" > "$f" 2>/dev/null || true
      }
    }
    git add "$f" || true
  done
}

MAX_ITERATIONS=200
iteration=0

while [ $iteration -lt $MAX_ITERATIONS ]; do
  iteration=$((iteration + 1))
  echo ""
  echo "=== Iteration $iteration ==="
  
  # Check if we're still rebasing
  if [ ! -d ".git/rebase-merge" ] && [ ! -d ".git/rebase-apply" ]; then
    echo "Rebase complete!"
    break
  fi

  # Check for conflicts
  conflicts=$(git diff --name-only --diff-filter=U 2>/dev/null || true)
  if [ -n "$conflicts" ]; then
    resolve_conflicts
  fi

  # Try to continue the rebase
  echo "Continuing rebase..."
  result=$(GIT_EDITOR=true git rebase --continue 2>&1) || true
  echo "$result"
  
  # Check if rebase is done
  if echo "$result" | grep -q "Successfully rebased"; then
    echo "Rebase completed successfully!"
    break
  fi
  
  # If no conflict but still rebasing, might need to skip
  if echo "$result" | grep -q "No changes"; then
    echo "No changes - skipping..."
    GIT_EDITOR=true git rebase --skip 2>&1 || true
  fi
  
  # Check for new conflicts
  new_conflicts=$(git diff --name-only --diff-filter=U 2>/dev/null || true)
  if [ -z "$new_conflicts" ] && [ ! -d ".git/rebase-merge" ] && [ ! -d ".git/rebase-apply" ]; then
    echo "Done!"
    break
  fi
done

echo ""
echo "Final status:"
git status --short | head -20
echo ""
echo "Commits ahead of upstream:"
git log --oneline upstram/dev..HEAD | wc -l
