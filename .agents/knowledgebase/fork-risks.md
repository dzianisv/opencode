# Fork Risks

## Main Risk Pattern

Fork risk here is not one giant rewrite. Risk comes from many small, useful deltas living in files upstream also changes often.

## Highest-Risk Areas

### Rebase Conflict Hotspots

- `packages/opencode/src/session/prompt.ts`
- `packages/opencode/src/tool/registry.ts`
- `packages/opencode/src/cli/cmd/serve.ts`
- `packages/opencode/src/workflow/index.ts`
- `packages/app/src/pages/layout/sidebar-items.tsx`
- `packages/app/src/pages/layout/sidebar-recent.tsx`
- `packages/app/src/utils/recent-session.ts`
- `packages/app/src/pages/session/message-timeline.tsx`
- `packages/app/src/components/prompt-input.tsx`

These are explicitly called out by `FORK.md` as repeated loss points.

### Release Asymmetry

- Upstream release path is broad and multi-platform.
- Fork release path is simpler and Linux x64-focused.
- Result: fork can look healthy while packaging/signing/install behavior on other targets is unproven.

### Deploy Drift

- GitHub `deploy.yml` handles SST/cloud deploy.
- Self-hosted binary deploy in `FORK.md` uses manual rebuild, binary copy, and service restart.
- Result: CI green does not prove deployed self-hosted service is current.

### Runtime Stability

- Open issues still point at memory pressure, orphaned MCP/browser child processes, and session eviction behavior.
- These failures show up under long-running real use more than unit tests.

### Product Drift

- Fork-only features can accumulate faster than maintenance capacity.
- Features not upstreamed or well-isolated raise future rebase tax every cycle.

## Mitigations

1. Keep `FORK.md` current after every rebase.
2. Add focused tests/smokes for every feature lost more than once.
3. Prefer additive seams over invasive rewrites.
4. Upstream generic fixes whenever possible.
5. Re-check local install, smoke flow, and self-hosted serve path after runtime changes.

## Rebase Checklist Summary

- rebase onto upstream `dev`
- review conflict hotspots named in `FORK.md`
- verify fork-only features still wired
- run `cd packages/opencode && bun typecheck`
- run targeted tests for touched areas
- run smoke path for `opencode run`
- update `FORK.md` if any fork delta changed

## Decision Rule

If feature is high-maintenance and not strategically important, remove it or upstream it. Do not keep large fork tax for cosmetic wins.
