# Project Overview

## What This Repo Is

`opencode` is open-source AI coding agent with terminal-first UX, provider-agnostic model support, optional desktop app, and client/server architecture.

Primary upstream positioning from `README.md`:

- terminal-first coding agent
- provider-agnostic model access
- built-in agent model (`build`, `plan`, `general`)
- local/server split so multiple clients can drive same backend

This fork keeps upstream product shape but carries operator-specific deltas tracked in `FORK.md`.

## Fork Stance

- Base branch: `dev`
- Upstream posture: stay close to upstream and rebase regularly
- Fork rule: keep only changes that are operationally important, not yet upstream, or needed for self-hosted workflow

## Current Fork Themes

- workflow runner support and agent orchestration work
- session naming / rename behavior
- recent sessions/sidebar UX fixes
- voice support (`STT` / `TTS`)
- auto-resume and serve ergonomics
- memory/process hardening
- local install and fork publish flow

## Repo Shape

- `packages/opencode`: main CLI/server package, current version `1.14.42`
- `packages/app`: web app used by binary/web UI
- `packages/plugin`: plugin-facing workflow wiring
- `.github/workflows/`: CI, release, docs, triage, deploy automation
- `FORK.md`: canonical fork delta + rebase checklist doc

## Important Commands

- `cd packages/opencode && bun typecheck`
- `cd packages/opencode && bun test`
- `cd packages/opencode && bun run test:httpapi`
- `cd packages/opencode && bun run install:local`

## Current Signals From Open Issues

- workflow engine stack still being ported/stabilized
- manager/worker delegation model still forming
- post-rebase breakages remain live risk
- memory pressure / orphaned MCP processes still matter
- some web UX regressions remain open

## Source Files To Check First

- `README.md`
- `FORK.md`
- `packages/opencode/package.json`
- `.github/workflows/test.yml`
- `.github/workflows/typecheck.yml`
- `.github/workflows/smoke-test.yml`
- `.github/workflows/fork-publish.yml`

## Working Rules

- Treat `FORK.md` as fork survival map.
- Assume upstream may touch same files often.
- Add narrow tests/smokes for any fork-only behavior that has been lost before.
- Prefer upstream-compatible seams over broad divergence.
