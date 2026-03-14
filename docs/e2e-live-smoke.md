# Live Smoke Test (Existing `opencode serve`)

This smoke test validates a running `opencode serve` instance against real local state (existing workspaces and sessions).  
It does **not** start a sandbox server and does **not** reset your data directory.

## Command

From the repository root:

```bash
bun run --filter @opencode-ai/app test:e2e:live-smoke
```

From `packages/app`:

```bash
bun run test:e2e:live-smoke
```

## What It Validates

- `GET /global/health`
- `GET /project`
- `GET /project/current`
- `GET /session` (root sessions for current directory)
- `GET /session/:id` (for an existing session if present)
- `GET /session/status`
- Session lifecycle:
  - create temporary session
  - read it back
  - delete it
- PTY lifecycle:
  - create PTY
  - connect websocket
  - execute `echo` probe
  - delete PTY
- UI probe via Playwright:
  - loads app shell
  - verifies project/session API calls return `200`
  - opens current workspace session route
  - opens an existing session route when available

The UI screenshot is written to:

```text
${TMPDIR:-/tmp}/opencode-live-smoke-ui.png
```

## Environment Variables

- `OPENCODE_SMOKE_BASE_URL` (default: `http://127.0.0.1:4096`)
- `OPENCODE_SMOKE_DIRECTORY` (optional override for API calls)
- `OPENCODE_SERVER_USERNAME` (optional, for basic auth protected servers)
- `OPENCODE_SERVER_PASSWORD` (optional, for basic auth protected servers)
- `OPENCODE_DISABLE_CHANNEL_DB=1` (recommended when running a preview/custom channel binary but you want to validate against your default `opencode.db` sessions)

## Notes

- The script creates and deletes one temporary session.
- The script creates and deletes one temporary PTY.
- If the smoke fails, it exits with non-zero and prints the failing step.
- OpenCode stores sessions in channel-specific DB files for non-`latest`/`beta` channels. If your sessions appear "missing" after switching binaries, set `OPENCODE_DISABLE_CHANNEL_DB=1` before starting `opencode serve`.
