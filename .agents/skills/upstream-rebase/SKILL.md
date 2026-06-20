---
name: upstream-rebase
description: >-
  Safely rebase or sync our fork (dzianisv/opencode) on top of upstream (sst/opencode)
  without silently dropping fork patches. Use when asked to "rebase on upstream",
  "sync with upstream", "update fork from upstream/dev", "pull upstream changes",
  "merge upstream into our fork", or "rebase onto origin/dev or origin/production".
  Enforces the multi-branch enumeration that catches the path-allowlist squash failure mode.
  Not for routine commits, feature branches, or non-fork repos.
metadata:
  author: opencode-fork
  version: "1.0"
---

<role>
You are rebasing dzianisv/opencode fork patches on top of sst/opencode upstream.
Deliverable: upstream merged in, ALL fork patches present, typecheck green.
</role>

<why>
Real incident (2026-06-18): "squash and migrate to dev" used a file-path allowlist
(`git checkout <tip> -- <13 files>`), which structurally cannot include commits that don't
touch those paths. 8 fork commits on sibling branches (stabilize-smoke-gate,
fix/autopilot-model-interrupt, port-pr32425) were silently dropped. Only caught hours later
when `opencode --version` regressed.

Root cause: only one branch tip was treated as "the fork" — sibling branches were ignored.
The fix is to enumerate ALL fork branches before starting, verify ALL of them after.
</why>

<core_rules>
1. Fork work lives on multiple branches. List EVERY local branch not in upstream before touching anything.
2. Create a backup branch before any rebase/merge: `git branch backup/pre-upstream-sync-$(date +%Y%m%d)`.
3. After the rebase, prove nothing dropped: `git cherry -v <new-tip> <each-source-branch>`.
   Run against SOURCE branches, NOT the squashed/rebased branch — squash rewrites patch-ids,
   causing over-reporting. See references/cherry-caveats.md.
4. Never delete or abandon a source branch until cherry check shows 0 `+` lines for it.
5. Consult `FORK.md` before and after — it lists conflict-prone files and current patch inventory.
6. Gate on `bun typecheck` (tests included) before pushing. A dropped helper/type surfaces as
   a type error, not a merge conflict.
</core_rules>

<procedure>
Run `scripts/verify-fork.sh` at checkpoints 1 and 6 — it automates branch enumeration and cherry check.

1. **Enumerate ALL fork branches.**
   ```
   git fetch upstream
   git branch --no-merged upstream/<target>
   ```
   Every branch listed is potentially carrying fork patches. Treat them all as in-scope.

2. **Read FORK.md** — note the conflict-zone table. These files will almost certainly need
   manual resolution: `workflow/index.ts`, `command/index.ts`, `session/prompt.ts` (HIGH),
   plus any other rows marked HIGH.

3. **Back up current state.**
   ```
   git branch backup/pre-upstream-sync-YYYYMMDD
   ```
   Non-negotiable. Rebase is reversible only if you have this.

4. **List what each fork branch contributes.**
   For EACH fork branch:
   ```
   git cherry -v upstream/<target> <branch>
   ```
   Every `+` is a patch not yet in upstream. Decide include vs. intentionally-drop for each.
   Record any intentional drops in the commit message.

5. **Rebase (or merge, or cherry-pick onto upstream).**
   Resolve conflicts. For each conflict in FORK.md's HIGH-zone files, verify the fork's
   version survives — conflict resolution commonly reintroduces upstream's version silently.
   After resolving, diff against the backup:
   ```
   git diff HEAD..backup/pre-upstream-sync-YYYYMMDD -- <fork-feature-paths>
   ```
   Any fork-specific line that vanished from HEAD is a dropped patch.

6. **Verify all fork branches against the new tip.**
   ```
   scripts/verify-fork.sh <new-tip>
   ```
   Must show 0 `+` for every fork source branch. Re-cherry-pick anything that's `+`.

7. **Run typecheck.**
   ```
   cd packages/opencode && bun typecheck
   ```
   Fix all errors. Dropped service types / helper functions appear here.

8. **Re-read FORK.md conflict zones.** Spot-check that fork behaviors are still present
   (e.g. run `opencode --version` to confirm git-describe string appears, not `0.0.0-local`).

9. **Push and update FORK.md** with the new upstream merge point and any new conflict zones found.
</procedure>

<upstream_notes>
- Upstream remote: add if missing with `git remote add upstream <sst/opencode-url>`.
- `FORK.md` tracks the patch inventory and conflict zones — it is the authoritative list of
  "what are our fork patches." Update it any time a patch is added, removed, or its conflict
  status changes.
- After a successful upstream rebase, update the "last rebased" line in FORK.md with the
  upstream commit hash.
- The version string `dzianisv/opencode vX.Y.Z-N-ghash` comes from `cff7a2477` (cherry-picked
  as `4df4d015e` in our fork). If `opencode --version` regresses to `0.0.0-local-...`, this
  commit was dropped.
</upstream_notes>

<done_when>
- `scripts/verify-fork.sh <new-tip>` shows 0 `+` for every fork source branch.
- `bun typecheck` passes with 0 errors.
- `opencode --version` shows `dzianisv/opencode vX.Y.Z-N-ghash`.
- FORK.md updated with new upstream merge point.
- Backup branch kept until above confirmed; only then delete source branches.
- Any consciously-dropped patch named in the final commit message — never silently absent.
</done_when>
