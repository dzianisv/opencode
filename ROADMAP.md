# Roadmap

## Goal / Fork Stance

This fork keeps `opencode` usable as daily driver while carrying a small set of fork-only features that matter to this operator workflow.

- Stay close to upstream `dev` by default.
- Carry only deltas that are operationally required or not yet accepted upstream.
- Treat fork as productized working branch, not long-term rewrite.

## Current State

- Upstream base is active and moving quickly; this fork is on `dev` and already carries custom features tracked in `FORK.md`.
- Core fork deltas include workflow runner support, session/rename UX fixes, recent-session/sidebar behavior, voice support, auto-resume, local install fixes, and memory-leak hardening.
- CI baseline exists: `typecheck.yml`, `test.yml`, fork PR smoke coverage in `smoke-test.yml`, plus upstream/fork release workflows.
- Release path is split:
- Upstream `publish.yml` handles full multi-platform release for `anomalyco/opencode`.
- Fork `fork-publish.yml` publishes `@vibetechnologies/opencode` from `packages/opencode/package.json` changes, currently Linux x64-focused.
- Open issue set shows near-term pressure around workflow stack completion, manager/worker delegation model, post-rebase breakage, copy-button regressions, and memory/process pressure.

## Near-Term Priorities (Next 30 Days)

1. Stabilize fork-critical runtime paths.
- Close post-rebase/runtime regressions around `opencode run`, workflow engine porting, and recent sidebar/session behavior.
- Keep smoke coverage green on every PR.

2. Land coherent delegation/workflow story.
- Decide shape of manager primary agent, worker tool family, and worker/session identity split.
- Prefer minimal vertical slice over broad framework churn.

3. Reduce operational risk from long-running processes.
- Triage MCP/browser child-process accumulation, instance-cache eviction, and memory pressure issues.
- Add narrow tests around shutdown, resume, and worker lifecycle.

4. Tighten fork docs and runbooks.
- Keep `FORK.md` current after each rebase.
- Seed and maintain project knowledge base for CI, release, deploy, and rebase hotspots.

5. Clean up release posture.
- Confirm fork package naming/versioning policy.
- Decide whether fork release remains Linux-only package or grows to fuller artifact coverage.

## Medium-Term Priorities

- Upstream what can be upstreamed: small bug fixes, hardening, low-policy UX fixes.
- Isolate fork-only features behind clear command/config seams to shrink rebase conflicts.
- Add stronger automated checks for known rebase-loss zones called out in `FORK.md`.
- Simplify deployment and remote-access docs for self-hosted serve usage.
- Revisit fork-only features with high maintenance cost and weak leverage; remove if not paying rent.

## Explicit Risks

- Rebase drift in hot files: `session/prompt.ts`, sidebar files, tool registry, serve flow, workflow engine.
- Fork-only features live in upstream-active areas, so conflict frequency will stay high.
- CI and release paths are asymmetric between upstream and fork; green upstream does not guarantee fork release health.
- Current fork publish path is narrower than upstream release matrix, which can hide packaging problems on other targets.
- Manual deploy steps and local binary copy/signing make "works in repo" different from "works in service".
- Memory/process regressions can return after upstream merges because root causes span MCP, queueing, browser tooling, and session lifecycle.

## Operating Principles

1. Rebase first, rewrite last.
- Prefer rebasing on upstream `dev` and reconciling small deltas over carrying long-lived structural forks.

2. Keep fork changes easy to diff.
- Small commits.
- Small files touched.
- Clear fork-only notes in `FORK.md`.

3. Prefer additive seams.
- New command, config, or helper over deep rewrite of shared upstream paths when both solve problem.

4. Guard every fork-only behavior with verification.
- Add focused tests or smoke checks for any feature repeatedly lost in rebases.

5. Upstream low-friction fixes.
- If change is generic and maintainable upstream, upstream it to reduce fork burden.

6. Do not fork release machinery unless needed.
- Reuse upstream scripts/workflows where possible; document every intentional divergence.
