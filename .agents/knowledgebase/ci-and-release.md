# CI And Release

## Core CI Workflows

### `typecheck.yml`

- Triggers on push to `dev`, PRs to `dev`, and manual dispatch.
- Runs `bun typecheck`.
- Fastest baseline gate for repo-wide type safety.

### `test.yml`

- Triggers on push to `dev`, all PRs, and manual dispatch.
- Runs unit matrix on Linux and Windows via `bun turbo test:ci`.
- Runs HttpApi exerciser gates on Linux in `packages/opencode`.
- Runs app e2e matrix on Linux and Windows with Playwright.
- Uploads junit and Playwright artifacts.

### `smoke-test.yml`

- Fork-specific PR gate on `dev`.
- Builds local binary with `--skip-embed-web-ui`.
- Installs local binary.
- Runs `~/.local/bin/opencode run "create a simple helloworld.py app"`.
- Verifies created file prints `Hello`.

## Release Workflows

### `publish.yml`

- Upstream-style full release pipeline.
- Triggered by pushes to `ci`, `dev`, `beta`, `snapshot-*`, or manual dispatch.
- Handles versioning, CLI build, Windows signing, desktop artifact build/sign/release, and publish steps.
- Guarded with `if: github.repository == 'anomalyco/opencode'`.
- Useful as reference, but not fork's active npm release path.

### `fork-publish.yml`

- Fork release path.
- Triggered on push to `dev` when `packages/opencode/package.json` changes, plus manual dispatch.
- Guarded with `if: github.repository == 'dzianisv/opencode'`.
- Reads version from `packages/opencode/package.json`.
- Publishes package as `@vibetechnologies/opencode`.
- Builds Linux x64 single binary, repackages minimal npm tarball, publishes if version not already on npm.
- Creates `v<version>` git tag after successful publish or if already published.

### `deploy.yml`

- Triggered on push to `dev` and `production`, plus manual dispatch.
- Runs `bun sst deploy --stage=${{ github.ref_name }}`.
- Infra/cloud deployment path, not same as local self-hosted binary deployment documented in `FORK.md`.

## Other Workflow Buckets

- docs/content: `docs-update.yml`, `docs-locale-sync.yml`, `generate.yml`
- community/ops: `triage.yml`, `duplicate-issues.yml`, `pr-management.yml`, `notify-discord.yml`
- packaging/integrations: `publish-vscode.yml`, `publish-github-action.yml`, `release-github-action.yml`, `containers.yml`, `sync-zed-extension.yml`

## Local Validation For Fork Work

- Minimum before merge:
- `cd packages/opencode && bun typecheck`
- `cd packages/opencode && bun test`
- targeted tests for touched area
- smoke flow when runtime/agent path changed

- When release/install path changed:
- `cd packages/opencode && bun run install:local`
- `~/.local/bin/opencode --version`
- run simple `opencode run` task

## CI Gaps To Remember

- Fork smoke test covers one happy path only.
- Fork publish path is narrower than upstream multi-platform release matrix.
- Self-hosted deploy steps in `FORK.md` are partly manual and are not validated by GitHub Actions.
- Rebase-loss risks in hot files need targeted tests, not only broad CI.
