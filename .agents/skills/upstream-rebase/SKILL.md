---
name: upstream-rebase
description: >-
  Safely rebase or sync our fork (dzianisv/opencode) on top of upstream
  (anomalyco/opencode) without silently dropping fork patches. Use when asked to
  "rebase on upstream", "sync with upstream", "update fork from upstream/dev",
  "pull upstream changes", or "merge upstream into our fork". Enforces
  multi-branch enumeration, full post-rebase validation, and npm publish
  verification. Not for routine commits, feature branches, or non-fork repos.
metadata:
  author: opencode-fork
  version: "2.0"
---

<role>
You are rebasing dzianisv/opencode fork patches on top of anomalyco/opencode upstream.
Deliverable: upstream merged in, ALL fork patches present, full test suite green, npm published.
</role>

<why>
Real incident (2026-06-18): a file-path allowlist squash silently dropped 8 fork commits
across sibling branches. Only caught hours later when `opencode --version` regressed.

Real incident (2026-06-22): rebase declared "done" after typecheck + smoke test, but no one
ran app unit tests, httpapi exerciser, or verified the npm publish. Full validation now mandatory.
</why>

<core_rules>
1. Fork work lives on multiple branches. List EVERY local branch not in upstream before touching anything.
2. Create a backup branch before any rebase: `git branch backup/pre-rebase-$(date +%Y%m%d)`.
3. After the rebase, prove nothing dropped: `git cherry -v <new-tip> <each-source-branch>`.
4. Never delete a source branch until cherry check shows 0 `+` lines for it.
5. Consult `FORK.md` before and after — it lists conflict-prone files and current patch inventory.
6. Gate on FULL validation (see below), not just typecheck.
7. Bump version in `packages/opencode/package.json` — fork-publish skips if version already on npm.
8. Don't blindly re-port old patches. Review each one: does it still apply? Did upstream fix it differently? Did it even work?
</core_rules>

<procedure>
## Phase 1: Prepare

1. **Enumerate ALL fork branches.**
   ```
   git fetch upstream
   git branch --no-merged upstream/<target>
   ```

2. **Read FORK.md** — note conflict zones and intentionally-dropped patches table.

3. **Back up current state.**
   ```
   git branch backup/pre-rebase-$(date +%Y%m%d)
   git tag archive/dev-pre-vX.Y-rebase  # push tag to origin
   ```

4. **List what each fork branch contributes.**
   ```
   git cherry -v upstream/<target> <branch>
   ```
   Every `+` is a patch not yet in upstream. Decide include vs. drop. Record drops.

## Phase 2: Rebase

5. **Rebase or start fresh from upstream.**
   If conflicts are massive (upstream refactored files), start fresh from `upstream/dev`
   and port logic manually rather than cherry-picking. This is faster and less error-prone
   when upstream is 1000+ commits ahead.

6. **For each old commit, classify:**
   - **Port**: logic still needed, target files exist → cherry-pick or rewrite
   - **Drop (upstream absorbed)**: upstream fixed it → skip
   - **Drop (dead target)**: file deleted/rewritten upstream → skip
   - **Drop (broken)**: patch didn't work well → skip (e.g., session reconciler #221)
   - **Defer**: blocked on upstream work → track in issue (e.g., workflow engine #230)

7. **Resolve conflicts.** For FORK.md HIGH-zone files, verify fork's version survives.

## Phase 3: Validate (ALL steps mandatory)

8. **Typecheck** (our changes shouldn't add new errors):
   ```
   cd packages/opencode && bun typecheck
   ```

9. **Unit tests — opencode core** (11 dirs that reliably pass):
   ```
   for dir in config effect tool mcp permission storage snapshot image ide background project; do
     timeout 30 bun test --timeout 10000 "test/$dir"
   done
   ```
   Known: `tool.write > file permissions` is a preexisting upstream failure.
   Known: `test/session`, `test/cli`, `test/v2` hang (need mock LLM — upstream issue).

10. **HttpApi integration tests:**
    ```
    timeout 90 bun run script/httpapi-exercise.ts --mode coverage --fail-on-missing --fail-on-skip
    ```
    Expect 196 pass, 0 fail. SSE disconnect timeout at end is harmless.

11. **App unit tests + build:**
    ```
    cd packages/app && bun run test && bun run build
    ```
    Expect 407+ pass, 0 fail. Build must succeed clean.

12. **Build CLI binary:**
    ```
    cd packages/opencode && bun run build
    ```

13. **Install locally + e2e smoke:**
    ```
    bun run script/install-local.ts
    ~/.local/bin/opencode --version  # must show dzianisv/opencode ...
    ~/.local/bin/opencode run -m github-copilot/claude-sonnet-4.6 "respond with just the word 'hello'"
    ```

## Phase 4: Publish

14. **Bump version** in `packages/opencode/package.json` if needed.
    fork-publish.yml checks npm registry and skips if version exists.

15. **Push to origin/dev:**
    ```
    git push origin dev --force-with-lease --no-verify
    ```

16. **Watch CI** — `fork publish` workflow must pass:
    ```
    gh run list --repo dzianisv/opencode --branch dev --limit 3
    ```

17. **Verify npm package:**
    ```
    npm view @vibetechnologies/opencode@<VERSION> version
    cd /tmp && mkdir test && cd test && npm init -y && npm install @vibetechnologies/opencode@<VERSION>
    ./node_modules/.bin/opencode --version
    ```

## Phase 5: Finalize

18. **Update FORK.md** with new upstream commit hash, patch table, and any new dropped patches.

19. **Commit FORK.md update** and push.

20. **Review old vs new** — compare old backup commits against new tip.
    For each old commit, confirm it's ported, intentionally dropped, or deferred with an issue.
</procedure>

<lessons_learned>
- When upstream is 1000+ commits ahead, starting fresh and porting logic is faster than cherry-picking.
- Don't re-port patches that didn't work. Session reconciler (#221) was ported but sessions still showed stuck-busy. Better to fix properly or skip.
- Model names change between upstream versions (e.g., `claude-sonnet-4` → `claude-sonnet-4.6` in v1.17).
- `bus/index.ts` and `util/queue.ts` were heavily refactored upstream — memory hardening patches became dead code.
- App (`packages/app/`) is rewritten frequently upstream. App-specific patches have very short shelf life.
- The `install:local` script needs `rm -f` before `cp` on Linux to handle "Text file busy" when replacing the running binary.
- `bun test` without `--only-failures` on the full suite hangs in session/cli/v2 dirs due to mock LLM dependencies.
- fork-publish.yml triggers on `packages/opencode/package.json` changes to `dev` branch.
</lessons_learned>

<done_when>
- ALL Phase 3 validation steps pass
- npm package published and installable
- FORK.md updated with new upstream hash + patch inventory + dropped patches table
- Backup branch/tag preserved
- Every old commit accounted for (ported / dropped with reason / deferred with issue)
</done_when>
