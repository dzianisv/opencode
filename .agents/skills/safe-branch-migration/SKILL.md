---
name: safe-branch-migration
description: >-
  Safely squash, migrate, merge, or rebase work across multiple git branches (including onto
  upstream) without silently dropping commits. Use when asked to "squash and migrate to dev",
  "merge this into dev/main", "rebase on upstream", "consolidate branches", "move my work to
  <branch>", or "clean up branches". Enforces the verification that catches the path-allowlist
  squash failure mode. Not for routine single-branch commits or simple `git pull`.
metadata:
  author: opencode-fork
  version: "1.0"
---

<role>
You are migrating git work between branches. The deliverable is the target branch containing
ALL intended work and NO unintended junk, proven by `git cherry`, not assumed.
</role>

<why>
A real incident: a "squash and migrate to dev" was done by file-path allowlist
(`git checkout <tip> -- <13 files>`), which structurally excludes any commit that doesn't touch
those paths. 8 useful commits living on sibling branches were silently dropped and only caught
hours later by a human noticing `--version` regressed. Path-allowlist squashes are correct for
excluding junk but guarantee invisible loss of out-of-path work. The signal to catch it
(`git cherry`) existed and was simply never run.
</why>

<core_rules>
1. Feature work is rarely on one branch. Enumerate EVERY branch with unmerged work before
   migrating — never trust a single "feature tip".
2. After building the migration result, prove nothing real is left behind with
   `git cherry -v <target> <each-source-branch>` — every `+` is unmerged work you must
   consciously include or explicitly decide to drop.
3. NEVER delete or abandon a source branch until `git cherry -v <target> <branch>` shows 0 `+`
   lines. Branch deletion is the only step that makes loss unrecoverable.
4. Run the target's full gates (typecheck INCLUDING tests, test suite) before pushing — a
   missing-code drop often surfaces as a type/runtime error, not a merge conflict.
</core_rules>

<procedure>
Run `scripts/verify-migration.sh <target-branch>` at the checkpoints below; it automates steps
1, 4, and 6. Do the judgment steps yourself.

1. **Enumerate sources.** List all candidate branches:
   `git branch --no-merged origin/<target>` and, for any file you care about,
   `git branch --contains <commit>`. Treat sibling branches that forked from the same base as
   in-scope until proven otherwise.

2. **List unmerged work per source.** For EACH source branch:
   `git cherry -v origin/<target> <branch>`
   Every `+` line is a commit not yet in target. Decide include vs. drop for each, out loud.

3. **If using a path allowlist (squash to exclude junk), audit it against ALL sources:**
   `git diff --name-only origin/<target> <branch>`
   Confirm no out-of-allowlist file is real work. Excluding logs/build-artifacts/scratch dirs is
   fine; excluding source / CI / security changes is a dropped commit.

4. **Build the migration** (rebase, merge, or squash-via-allowlist as appropriate).

5. **Verify completeness against the SOURCE branches, not the squashed branch.**
   `git cherry -v <new-target-tip> <each-source-branch>` MUST show 0 `+` lines.
   Caveat: `git cherry` run against the squashed branch itself ALWAYS over-reports — squashing
   rewrites patch-ids, so it can't match the originals. Only the per-source-branch check is
   trustworthy. (See references/cherry-caveats.md.)

6. **Gate before push.** Run the project's typecheck (tests included) and test suite. Fix
   failures — a dropped helper/type is a common symptom. Only then push.

7. **Cleanup last.** Delete source branches only after step 5 shows 0 `+` for each.
</procedure>

<upstream_notes>
- Before `git rebase upstream/<branch>` (or merge), create a backup: `git branch backup/$(...)`.
- After resolving conflicts, diff against the backup to confirm no fork feature was lost:
  `git diff HEAD..backup/<name> -- <fork-feature-paths>`.
- Conflict resolution can silently re-introduce upstream's version of a fork fix — re-verify
  fork-specific behavior, not just that it compiles.
- This repo tracks fork features and rebase-conflict zones in `FORK.md` — consult it before and
  after an upstream rebase.
</upstream_notes>

<done_when>
- `git cherry -v <target> <branch>` returns 0 `+` lines for every source branch.
- Target's typecheck (including tests) and test suite pass.
- Source branches deleted only after the above. Any consciously-dropped commit is named in the
  final summary, not silently absent.
</done_when>
