#!/bin/bash
cd /Users/engineer/workspace/opencode-rebase

GIT_DIR_WORKTREE="/Users/engineer/workspace/opencode/.git/worktrees/opencode-rebase"

in_rebase() {
  [ -d "$GIT_DIR_WORKTREE/rebase-merge" ] || [ -d "$GIT_DIR_WORKTREE/rebase-apply" ]
}

resolve_and_continue() {
  local max=300
  local i=0
  
  while [ $i -lt $max ]; do
    i=$((i+1))
    
    if ! in_rebase; then
      echo "=== Rebase complete at iteration $i ==="
      return 0
    fi
    
    local conflicts
    conflicts=$(git diff --name-only --diff-filter=U 2>/dev/null || true)
    
    if [ -n "$conflicts" ]; then
      echo "--- Iteration $i: resolving $(echo "$conflicts" | wc -l | tr -d ' ') conflicts ---"
      for f in $conflicts; do
        git checkout --theirs "$f" 2>/dev/null || git checkout --ours "$f" 2>/dev/null || {
          # If both fail (e.g. deleted/modified conflict), try to use theirs via index
          git show :3:"$f" > "$f" 2>/dev/null || git show :2:"$f" > "$f" 2>/dev/null || true
        }
        git add "$f" 2>/dev/null || true
      done
    fi
    
    # Check if there are still unmerged files
    local still_unmerged
    still_unmerged=$(git diff --name-only --diff-filter=U 2>/dev/null || true)
    if [ -n "$still_unmerged" ]; then
      echo "Still unmerged: $still_unmerged"
      echo "Trying git add -A..."
      git add -A 2>/dev/null || true
    fi
    
    echo "--- Continuing rebase (iteration $i) ---"
    local out
    out=$(GIT_EDITOR=true git rebase --continue 2>&1) || true
    echo "$out" | tail -5
    
    if echo "$out" | grep -qE "Successfully rebased|rebase is complete"; then
      echo "=== Done! ==="
      return 0
    fi
    
    if echo "$out" | grep -q "No changes - did you forget to use"; then
      echo "--- Skipping empty commit ---"
      GIT_EDITOR=true git rebase --skip 2>&1 | tail -3 || true
    fi
    
    if ! in_rebase; then
      echo "=== Rebase complete ==="
      return 0
    fi
    
    sleep 0.1
  done
  
  echo "=== Max iterations reached ==="
  return 1
}

resolve_and_continue

echo ""
echo "=== Final git status ==="
git status --short | head -30
echo ""
echo "=== Commits ahead of upstream ==="
git log --oneline upstram/dev..HEAD | wc -l
echo ""
echo "=== Last 5 commits ==="
git log --oneline -5
