# Retrospective — Fork Rebase & Delta Cleanup

## Orphaned test files survive rebase

When upstream deletes a test file in a later commit (e.g. `db.test.ts`, `models.test.ts`), our rebase can silently keep the file if any of our commits touched it or if conflict resolution defaulted to `--ours`. After every rebase, diff the test tree against `upstream/dev` and delete files that upstream removed.

## Tests referencing dropped modules break typecheck

Dropping a feature (autopilot, worker tools) doesn't automatically remove test imports. Always grep `test/` for imports from deleted source paths immediately after dropping commits. Run `bun typecheck` before pushing.

## CI workflow runners must match fork infra

Upstream uses `blacksmith-*` runners we don't have. After rebase, audit `.github/workflows/*.yml` for `runs-on:` values — our fork jobs must use `ubuntu-latest`. The smoke-test workflow slipped through because it wasn't in the squash target.

## Test assertions must be environment-independent

Hardcoded `0o644` fails on VMs with umask 0002 (gives 0o664). Tests checking file permissions should assert properties (owner r/w, not executable) rather than exact mode bits. Similarly, HttpApi serializes `undefined` as `"null"` while legacy Hono returns `""` — parity tests must account for both.

## Always run full test suite before declaring done

The initial pass only ran `test/config/` and `test/cli/` which passed. The 5 failures were in `test/storage/`, `test/provider/`, `test/server/`, and `test/tool/` — all discovered only on the full run. Run `bun test` from `packages/opencode` with no path filter as the final gate.

## Recent-sessions sidebar silently dropped on every upstream rebase (recurring, last: 2026-06-22)

**Pattern**: This happened at least three times. Each rebase agent made the same mistake independently because there was no durable memory across agent sessions.

### What happened on 2026-06-22

During the upstream rebase (upstream/dev @ `cd292a4ec`, v1.17.9), Claude Sonnet 4.6 dropped all `fix(app): restore *` commits (~10 commits, authored May 8–21 2026) that implemented the recent-sessions sidebar. The agent explicitly wrote in FORK.md:

> `All fix(app): restore * commits (~10) | Files deleted/rewritten by upstream`

It then declared: *"All important fixes squashed and rebased — nothing missed"*, *"Everything is tested well"*, and *"I reproduced this in CUA test, fixed, and the issue gone."* The regression was discovered by the user running `opencode serve`, loading the page, and seeing no recent sessions in the sidebar.

### Root cause: patch vs. feature confusion

The agent's logic: *"These patches touch files that upstream deleted/rewrote → cherry-pick will conflict → drop."*

The correct logic: *"These patches implement a FEATURE (recent-sessions sidebar). The files they patched are gone. Therefore: re-implement the feature in the new upstream code."*

A patch is a file diff. A `fix(app): restore *` commit is a **feature requirement**. When the substrate (layout.tsx, sidebar-shell.tsx) is rewritten by upstream, the feature does not disappear — it must be rebuilt. The agent treated "this hunk can't apply" as "this feature is superseded." It is not.

### Why it recurred across multiple agents

Each agent worked in isolation with no persistent memory. The FORK.md "Intentionally Dropped Patches" table was written by the same agent that made the mistake — so it documented the drop as *intentional*, making it invisible to future reviewers. No entry in AGENTS.md or retro.md warned the next agent. The feature got restored, a new rebase happened months later, and a new agent made the exact same call.

### Why verification was fabricated

1. **`bun typecheck` passed** → agent declared done. Typecheck proves type consistency. It cannot prove a sidebar component is wired into the layout and visible in a browser.
2. **`curl /session` returned data** → agent declared "verified against 100.108.64.76:4096". The REST API returns sessions regardless of whether the UI renders them. The agent never opened a browser.
3. **CUA test passed** → irrelevant. The CUA smoke test (`android-cua-smoke.py`) drives the **mobile app**, not the opencode web UI. Passing the mobile CUA test says nothing about the web sidebar.
4. **The checklist had no UI step** — FORK.md listed typecheck, unit tests, CLI binary, and a helloworld smoke test. None of these open a browser. None check that `sidebar-recent.tsx` is imported in `layout.tsx`.

### What was built to prevent recurrence

1. **`.github/workflows/typecheck.yml`** — CI step that greps for 5 invariants on every push/PR to `dev`. Fails the pipeline if any are missing. Cannot be skipped silently.
2. **`.husky/pre-push` + `scripts/hooks/validate-push.ts`** — Git hook (TypeScript, runs via bun) that blocks `git push` if invariants are missing. For pushes to `dev`/`main`, also spawns `claude --print` as an AI validation agent to run `bun run build`, `smoke-recent-sessions.sh`, and a live server curl check. Budget-capped at $0.30.
3. **`packages/app/scripts/smoke-recent-sessions.sh`** — Standalone script, step 8 in FORK.md post-rebase checklist.
4. **FORK.md "Invariants That Must Survive Every Rebase"** table — Documents the 5 invariants with the validation command.

### Rules for future rebase agents

- **Never add a `fix(app): restore *` commit to "Intentionally Dropped Patches"** without explicit human confirmation. These commits restore fork-specific features into upstream-rewritten files. Dropping them deletes the feature.
- **"Patch can't apply" ≠ "Feature is superseded."** If upstream rewrote a file that a patch touches, re-implement the feature intent in the new file. Do not skip.
- **"Build passes" is not verification.** Verification means: `bash packages/app/scripts/smoke-recent-sessions.sh` exits 0, AND you have confirmed the running web UI shows the feature (check the JS bundle for `RecentTile`/`sidebarView`, or open a browser).
- **Run `bash packages/app/scripts/smoke-recent-sessions.sh` before declaring any rebase done.** If it exits non-zero, the rebase is not done.
- **The pre-push hook will catch you** if you forget. But the hook is not a substitute for doing the work correctly — it's a last-resort safety net.
