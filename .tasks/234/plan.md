## Approach Summary

Fix already implemented. Remaining work: verify fix correctness, review, create PR, CI, merge.

## Tradeoff: Speed vs Quality
- chosen: fast
- rationale: single-file change, purely additive logic. No behavioral change for unscoped packages.

## Tasks
| # | Title | Files | Depends on | Parallel group | Suggested model |
|---|-------|-------|------------|----------------|-----------------|
| 1 | Verify fix | postinstall.mjs | — | A | deepseek |
| 2 | Code review | postinstall.mjs | — | A | deepseek |
| 3 | Create PR + CI | — | 1, 2 | B | deepseek |
| 4 | Post-merge prod verify | — | 3 | B | deepseek |

## Done Criteria
1. `node postinstall.mjs` succeeds for both scoped and unscoped package names in a mock package
2. Review finds no issues
3. PR merged to `dev`
4. CI green

## Rollback Plan
`git revert` on the merge commit.
