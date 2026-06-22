# Fork: dzianisv/opencode

Minimal delta on top of [anomalyco/opencode](https://github.com/anomalyco/opencode) `dev` branch.

## Last Rebased

upstream/dev @ `cd292a4ec` (v1.17.9) — 2026-06-22

## Fork Patches (4 commits)

| # | Commit | Description |
|---|--------|-------------|
| 1 | `a302149dc` | `feat(fork)`: repo name + git describe in `--version` |
| 2 | `1de529c4f` | `feat(ci)`: fork-publish + smoke-test workflows |
| 3 | `44813226d` | `fix(memory)`: ScopedCache capacity 5, TTL 10min |
| 4 | `cae0c3eb2` | `feat(worktree)`: symlink node_modules/.venv from primary |

## CI Workflows (fork-only)

- `.github/workflows/fork-publish.yml` — builds linux binary, publishes `@vibetechnologies/opencode` to npm with OIDC provenance
- `.github/workflows/smoke-test.yml` — runs `opencode run` helloworld on PRs to dev

## Conflict Zones

| File | Risk | Notes |
|------|------|-------|
| `packages/script/src/index.ts` | LOW | Added `gitDescribe` + `repo` getters |
| `packages/core/src/installation/version.ts` | LOW | Added `OPENCODE_REPO`/`OPENCODE_GIT_DESCRIBE` globals |
| `packages/opencode/script/build.ts` | MEDIUM | Added 2 extra `define` entries |
| `packages/opencode/src/effect/instance-state.ts` | LOW | Changed `capacity`/`timeToLive` |
| `packages/opencode/src/worktree/index.ts` | MEDIUM | Added symlink block in `boot()` |

## Rebase Checklist

1. `git fetch upstream`
2. `git branch backup/pre-rebase-$(date +%Y%m%d)`
3. `git rebase upstream/dev`
4. Resolve conflicts (check conflict zones above)
5. `cd packages/opencode && bun typecheck` (our changes shouldn't add new errors)
6. Verify `git describe --tags --always` runs without error
7. Update this file with new upstream commit hash
