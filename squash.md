# Squash plan/log for `dev` on top of `upstram/dev`

## Goal

Reduce the post-rebase fork stack by grouping tightly related commits while preserving functional changes.

Current stack: **29 commits** (`upstram/dev..dev`)

## Proposed grouping

1. Keep `18b96c87d` as-is (`fix(memory)`).
2. Group serve/session lifecycle commits into `c66160927`:
   - `7b0baab41`
   - `d8eba1fdb`
   - `b3d102ec1`
3. Keep `04b12c3d6` as-is (Recently Active/dashboard).
4. Group voice/provider/review wiring into `f2e4a26a3`:
   - `a339eeab9`
   - `003f6e35a`
   - `455974a42`
5. Keep `ab0c14bf2` as-is (`feat(tools): rename`).
6. Keep `f1d4d1388` as-is (`feat(github)`).
7. Keep `168731fe6` as-is (`fix(release)`).
8. Keep `d1ea5408c` as-is (idle spinner).
9. Group docs into `8f1fdd445`:
   - `7a4761767`
   - `f2715e775`
   - `f87fcc312`
10. Group integration/restoration churn into `b2c768361`:
    - `3855cc744`
    - `adc30e3e2`
    - `c8dfca86b`
    - `4a0cdb5f3`
11. Keep `e5ec25b09` as-is (`feat: snapshot large-file exclusion, ACP closeSession, display version`).
12. Group disposal/instance regression fixes + test into `fdd0bc3bb`:
    - `22474041a`
    - `b957445bb`
    - `2e16aa127`
    - `e6543b103`

Estimated result: **12 commits**.

## Execution log

- [x] Reviewed stack `upstram/dev..dev` (29 commits).
- [x] Created backup branch before rewrite: `backup/dev-pre-squash-20260405-100737`.
- [x] Ran interactive rebase with `fixup` grouping above.
- [x] Verified result:
  - stack reduced to **12 commits** (`upstram/dev..dev`)
  - `git diff --stat backup/dev-pre-squash-20260405-100737..dev` is empty (content preserved)
- [x] Force-push rewritten `dev` to `origin/dev`.

## Resulting top-of-upstream stack (after squash)

1. `18b96c87d` fix(memory): reduce memory pressure — spool bash output, cap logs and runtime artifacts
2. `2a2e588b4` fix(session): improve serve instance lifecycle, recover orphaned messages on restart
3. `2958c7ff9` feat(app): add Recently Active dashboard, session tree view, and worktree visibility
4. `ae8c3a447` feat(app): add browser voice controls and server-backed Edge TTS
5. `f0a05d169` feat(tools): add rename tool for AI-driven session naming
6. `42e72f041` feat(github): auto-build issue prompts and require upstream issue updates
7. `ab896bbc3` fix(release): support scoped npm publish with platform package path fixes
8. `ff0142303` fix(app): prevent stale Thinking spinner on idle sessions
9. `b7817f7ed` docs: document fork enhancements and add community announcement kit
10. `058864732` chore: backend glue, TUI updates, and console provider fixes
11. `58e4257e1` feat: snapshot large-file exclusion, ACP closeSession, display version (#137)
12. `fcc0c57a5` fix(app): suppress disposal rebootstrap for inactive directories
