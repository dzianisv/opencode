# Fork-Specific Features (dzianisv/opencode)

This document tracks custom features added to this fork that are **not present upstream**.
Use this as a checklist after every rebase on `upstream/dev` to verify nothing was lost.

---

## ✅ Post-Rebase Stabilization Complete (2026-06-17)

Branch `origin/dev` is stable after full rebase onto `upstream/production` (2026-06-16).

**Verified green:**
- `bun turbo typecheck` — 23/23 packages, 0 errors (note: run `bun install` after every branch switch or rebase)
- Smoke test: `opencode run "create a simple helloworld.py app"` → `Hello, World!` ✅
- Binary: `opencode 0.0.0-local-202606171546` built via `bun run install:local`

**CI gate added:** `.github/workflows/smoke-test.yml` — runs on every PR to `dev`.
Builds binary with `--skip-embed-web-ui`, runs smoke test, verifies `Hello` in output.

**Branches cleaned up (deleted):**
- `backup/dev-*` (3 pre-rebase backups — no longer needed)
- `copilot/fix-http-copy-buttons-206`, `copilot/session-plugin-toggle-202`
- `fix/recent-models-and-labels` (merged to dev)
- `fix-post-rebase-build-errors` (PR #228 closed; `origin/dev` already passes clean)
- `pr-29789`, `pr-32167`, `rebase/upstream-sync`

**Remaining active branches (keep — unmerged work):**
- `feat/autopilot-mode`, `feat/cron-heartbeat-scheduler`, `feat/workflows-consolidated`
- `fix/computediff-and-serve-smoke`, `fix/issue-200-auto-review`, `fix/vcs-diff-sdk-missing`
- `pty-strip-server-creds`

---

## ✅ Recovered after rebase regression (2026-05-11)

Source refs:
- `dev-backup-20260509-031153`
- `7e2b59d82` (voice controls + Edge TTS integration)
- `b04367638` (recently active model/session UX baseline)

Recovered fixes:
- Restored browser STT controls in `packages/app/src/components/prompt-input.tsx` (mic capture + transcript insertion into prompt).
- Restored assistant TTS auto-play path in `packages/app/src/pages/session/message-timeline.tsx` using `/tts/edge` with browser speech-synthesis fallback.
- Restored required runtime guards in `packages/app/src/utils/runtime-adapters.ts` (media devices, permissions, speech synthesis).
- Restored model picker recent-group behavior/wiring in `packages/app/src/components/dialog-select-model.tsx` (recent ordering/grouping without duplicated entries).

## ✅ Recovered backend regressions (issue #193, 2026-05-11)

Source refs:
- `dev-backup-20260509-031153`
- `7aaa1cb90` (`feat(tools): add rename tool for AI-driven session naming`)
- `760b20fbd` (`fix: enforce PR naming rule in rename tool`)

Recovered fixes:
- Restored `packages/opencode/src/tool/rename.ts` in the Effect-based tool framework with tool id `rename` and session title updates via `Session.Service.setTitle`.
- Re-registered `rename` in `packages/opencode/src/tool/registry.ts` (init + built-in tool list).
- Restored concise session naming guidance in `packages/opencode/src/session/system.ts` so agents rename early once task scope is clear.

## ⚠️ Rebase Survival Checklist

After rebasing on `upstream/dev`, verify each feature still works:

### 1. Recently Used Models in Model Picker

**Files:** `packages/app/src/components/dialog-select-model.tsx`

- The model picker dialog shows a **"Recently Used"** group at the top
- Recent models are sourced from `model.recent?.()` in the models context
- Each model item has a `_group` ("recent" | "provider") and discriminated `_key` to avoid duplicate key conflicts
- The "Recently Used" group is always pinned first via `sortGroupsBy`

**How to verify:** Open model picker (Cmd+M or the model button) → you should see "Recently Used" group at the top with previously used models.

### 2. Project Labels in Recent Sessions Sidebar

**Files:**
- `packages/app/src/pages/layout/sidebar-items.tsx` — `SessionRow` renders `prefix` label under session title
- `packages/app/src/pages/layout/sidebar-recent.tsx` — passes `prefixes` from `organizeRecentSessions()` to `SessionItem`
- `packages/app/src/utils/recent-session.ts` — `organizeRecentSessions()` computes prefix map

**How to verify:** Open the recent sessions sidebar → sessions from different projects should show the project/workspace name as a small label under the session title.

### 3. Hide Orphan Child Sessions from Recent Roots

**Files:** `packages/app/src/utils/recent-session.ts` (line ~84)

- The `organizeRecentSessions()` roots filter MUST be `.filter((session) => !session.parentID)`
- Sessions with a `parentID` should NEVER appear as top-level roots, even if their parent is missing/archived
- This fix has been lost **3 times** during rebases — the incorrect version adds `|| !lookup.has(session.parentID)` which promotes orphans to roots

**How to verify:** If a child session's parent is archived or outside the fetch limit, it should NOT appear in the Recent tab at all.

**⚠️ REBASE DANGER:** Upstream or conflict resolution may re-introduce `|| !lookup.has(session.parentID)` — this is WRONG for our use case. Always check this line after rebase.

### 4. Collapsible Parent/Child Session Tree

**Files:**
- `packages/app/src/pages/layout/sidebar-items.tsx` — `SessionItem` renders child sessions recursively with depth-based indentation and collapse/expand chevron toggle
- `packages/app/src/pages/layout/sidebar-recent.tsx` — passes `children` map to `SessionItem`
- `packages/app/src/pages/layout/sidebar-project.tsx` — passes `children` map via `childMapByParent()`
- `packages/app/src/pages/layout/sidebar-workspace.tsx` — passes `children` map via `childMapByParent()`
- `packages/app/src/pages/layout/helpers.ts` — `childMapByParent()` builds parent→child ID map

**How to verify:** Sessions with subagents should show nested under their parent with a collapse chevron. Clicking the chevron folds/unfolds children.

### 4. Session Hover Preview (HoverCard with Messages)

**Files:**
- `packages/app/src/pages/layout/sidebar-items.tsx` — `SessionHoverPreview` component wraps `SessionRow` in a `HoverCard` showing user messages via `MessageNav`

**How to verify:** Hover over a session in the sidebar for ~1 second → a preview card should appear showing the session's user messages.

### 5. workspaceKey Helper (replaces pathKey)

**Files:**
- `packages/app/src/pages/layout/helpers.ts` — `workspaceKey()` normalizes workspace directory paths (handles Windows paths, trailing slashes, drive letters)
- Used in `sidebar-workspace.tsx` and `helpers.ts` instead of `pathKey` from `@/utils/path-key`

---

## Common Rebase Conflict Zones

These files are frequently modified by both upstream and this fork. Pay extra attention:

| File | Risk | What to watch for |
|------|------|-------------------|
| `recent-session.ts` | **HIGH** | Roots filter MUST be `!session.parentID` only — NO `\|\| !lookup.has(...)` |
| `sidebar-items.tsx` | **HIGH** | `SessionItemProps` type, `SessionRow`, `SessionItem`, `SessionHoverPreview` |
| `sidebar-recent.tsx` | **HIGH** | Props passed to `SessionItem` (children, lookup, prefixes, popover) |
| `sidebar-project.tsx` | MEDIUM | `childMapByParent` usage, `sessionProps` Omit type, `setHoverSession` |
| `sidebar-workspace.tsx` | MEDIUM | `childMapByParent` usage, `workspaceKey` import, removed `useIsFetching` |
| `helpers.ts` | MEDIUM | `childMapByParent()`, `workspaceKey()` functions |
| `dialog-select-model.tsx` | LOW | Recently used models grouping logic |

## Import Path Differences

Upstream uses `@opencode-ai/core/util/encode` and `@opencode-ai/core/util/path`.
If upstream ever renames these, update all sidebar files accordingly.

## API Path Note

The global session API is at `client.experimental.session` (upstream renamed from `client.global.session`).
If this changes upstream, update `sidebar-recent.tsx`.

---

## How to Rebase Safely

```bash
# 1. Create a backup branch BEFORE rebasing
git branch backup/dev-$(date +%Y%m%d%H%M%S)

# 2. Rebase
git rebase upstream/dev

# 3. After resolving conflicts, diff against backup to check for lost features
git diff HEAD..backup/dev-YYYYMMDDHHMMSS -- packages/app/src/pages/layout/

# 4. Walk through this checklist and verify each feature
# 5. Run typecheck
cd packages/app && bun typecheck
```
