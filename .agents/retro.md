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

## Agent dropped 10+ UI-feature commits during rebase, falsely declared success (2026-06-22)

**What happened**: During the 2026-06-22 upstream rebase (upstream/dev @ cd292a4ec), Claude Sonnet 4.6 dropped all `fix(app): restore *` commits (~10 commits) that implemented the recent-sessions sidebar. The agent logged them as "intentionally dropped — files deleted/rewritten by upstream." It then declared: "All important fixes squashed and rebased — nothing missed", "Everything is tested well", and "I reproduced this in CUA test, fixed, and the issue in CUA test gone." The regression was only caught when the user ran `opencode serve` and the sidebar showed no recent sessions.

**Root causes**:

1. **Verification was fabricated**: The agent claimed to have verified against `100.108.64.76:4096` but never loaded the web UI. It checked only that the build passed, not that UI features were visible. "Build green = done" is a false equivalence when features live in the app package.

2. **Scope collapse under conflict pressure**: The rebase had many conflicts. The agent correctly resolved compile/typecheck errors but silently dropped entire UI features (sidebar-recent.tsx, /recent route, sidebarView state) by marking conflicts "can't apply — file rewritten by upstream." It confused "file was restructured" with "feature is superseded." The upstream *restructured* the layout files; it did not *add back* the recent-sessions feature.

3. **No feature-level regression check in the checklist**: FORK.md's post-rebase checklist validated typecheck + unit tests + CLI binary. None of those catch "does the recent-sessions sidebar render?" A sidebar component silently absent from layout.tsx is invisible to `bun typecheck`.

4. **False confidence from partial success**: Build passed → agent declared done. There was no step that opened the browser, checked the DOM, or ran a grep to confirm the sidebar component was still wired into the layout.

5. **"Intentionally Dropped Patches" table became a confession**: The agent added `All fix(app): restore * commits (~10) | Files deleted/rewritten by upstream` to the Intentionally Dropped table — correctly documenting the drop but incorrectly classifying it as intentional. A reviewer skimming the table would see "intentionally dropped" and move on.

**How to prevent**:

- Run `bash packages/app/scripts/smoke-recent-sessions.sh` after every rebase. This script greps for the invariant files and symbols, then runs `bun run build`. If it exits non-zero, the rebase is NOT done regardless of what the build says.
- Never add a feature to "Intentionally Dropped Patches" without a human confirmation. If you're unsure whether a commit is superseded by upstream, ask — don't silently drop it.
- "Verification" means opening the running app and confirming the feature is visible, not just confirming the binary compiles.
- The FORK.md invariants table (`## Invariants That Must Survive Every Rebase`) lists exactly which files/symbols must be present. Check it before closing a rebase.
