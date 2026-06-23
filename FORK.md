# Fork: dzianisv/opencode

Minimal delta on top of [anomalyco/opencode](https://github.com/anomalyco/opencode) `dev` branch.

## Last Rebased

upstream/dev @ `cd292a4ec` (v1.17.9) — 2026-06-22

## Fork Patches (6 commits)

| # | Commit | Description |
|---|--------|-------------|
| 1 | `a302149dc` | `feat(fork)`: repo name + git describe in `--version` |
| 2 | `1de529c4f` | `feat(ci)`: fork-publish + smoke-test workflows |
| 3 | `44813226d` | `fix(memory)`: ScopedCache capacity 5, TTL 10min |
| 4 | `cae0c3eb2` | `feat(worktree)`: symlink node_modules/.venv from primary |
| 5 | `8c8761f07` | `docs`: add FORK.md with patch inventory and rebase checklist |
| 6 | `8580ebb56` | `feat(fork)`: add install:local script for local binary deployment |

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
| `packages/opencode/package.json` | HIGH | `install:local` script must survive — upstream rewrites `scripts` block |
| `packages/opencode/script/install-local.ts` | HIGH | Fork-only script — upstream will never add this; re-add if missing after rebase |

## Rebase Checklist

1. `git fetch upstream`
2. `git branch backup/pre-rebase-$(date +%Y%m%d)`
3. `git rebase upstream/dev`
4. Resolve conflicts (check conflict zones above)
4a. **Verify fork scripts survived**: `grep -q '"install:local"' packages/opencode/package.json || echo "MISSING install:local script — re-add it"` — if missing, add `"install:local": "bun run build && bun run script/install-local.ts"` back to `scripts` in `packages/opencode/package.json`
4b. **Verify install-local.ts exists**: `ls packages/opencode/script/install-local.ts || echo "MISSING — restore from backup branch"`
5. `cd packages/opencode && bun typecheck` (our changes shouldn't add new errors)
6. Verify `git describe --tags --always` runs without error
7. Update this file with new upstream commit hash
8. Bump version in `packages/opencode/package.json` (fork-publish skips if version already on npm)

## Post-Rebase Validation

Run ALL of these before declaring the rebase done:

```bash
# 1. Typecheck
cd packages/opencode && bun typecheck

# 2. Unit tests — opencode core (11 dirs that don't hang)
for dir in config effect tool mcp permission storage snapshot image ide background project; do
  timeout 30 bun test --timeout 10000 "test/$dir"
done

# 3. HttpApi integration tests
timeout 90 bun run script/httpapi-exercise.ts --mode coverage --fail-on-missing --fail-on-skip

# 4. App unit tests + build
cd ../app && bun run test && bun run build

# 5. Build CLI binary
cd ../opencode && bun run build

# 6. Install locally and run e2e smoke
bun run script/install-local.ts
~/.local/bin/opencode --version
~/.local/bin/opencode run -m github-copilot/claude-sonnet-4.6 "respond with just the word 'hello'"

# 7. Push to origin/dev → fork-publish CI → verify npm
git push origin dev --force-with-lease --no-verify
# Wait for CI, then:
npm view @vibetechnologies/opencode@<VERSION> version

# 8. Feature smoke test — verifies recent sessions sidebar wasn't dropped
bash packages/app/scripts/smoke-recent-sessions.sh
```

## Invariants That Must Survive Every Rebase

These features MUST be present after every rebase. If any are missing, the rebase is NOT done:

| Feature | Check file/component | Why it breaks |
|---------|---------------------|---------------|
| Recent sessions sidebar | `packages/app/src/pages/layout/sidebar-recent.tsx` | Upstream rewrites app layout; our additions get dropped |
| `/recent` route | `grep /recent packages/app/src/app.tsx` | Upstream router changes; our route registration gets dropped |
| sidebarView state | `grep sidebarView packages/app/src/pages/layout/layout.tsx` | State dropped when layout.tsx conflicts are resolved against upstream |
| `install:local` script | `grep '"install:local"' packages/opencode/package.json` | Upstream rewrites `scripts` block; this fork-only script gets silently dropped |
| `install-local.ts` build script | `ls packages/opencode/script/install-local.ts` | Fork-only file — upstream has no reason to add it; check it's present after every rebase |

**Validation script**: `bash packages/app/scripts/smoke-recent-sessions.sh`

**Never declare a rebase done without running this script.**

## Intentionally Dropped Patches

Patches from the pre-rebase branch that were reviewed and intentionally not ported:

| Patch | Reason |
|-------|--------|
| `fix(mcp): kill child processes` | Upstream Effect `addFinalizer` handles this |
| `fix(app): reconcile()` | App rewritten upstream |
| `fix(session): stale-busy reconciler #221` | Didn't work — sessions still showed stuck-busy |
| `feat(workflow): slash-command runner` | Deferred to #230 |
| `fix(config): fallback 0.0.0-- version` | No longer publish 0.0.0-* versions |
| All `fix(app): restore *` commits (~10) | Files deleted/rewritten by upstream |
| `fix: memory leak hardening (bus/queue)` | `bus/` deleted upstream; queue simplified |
