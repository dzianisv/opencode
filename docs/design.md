# OpenCode GitHub Webhook Integration — Design

## Goal

When a GitHub issue is assigned to the bot (or a comment with `/oc` prefix is posted),
`opencode serve` receives the webhook, runs the AI agent locally, pushes a branch,
creates a PR, and comments on the issue — all without CI or GitHub Actions.

## Target Architecture

```
GitHub.com                          opencode serve :4096
    |                                      |
    |  webhook POST /github/webhook  ----->|
    |  (issues.assigned or                 |
    |   issue_comment.created)             |
    |                                      v
    |                               routes/github.ts
    |                               1. verify signature (optional)
    |                               2. parse event + dedup
    |                               3. get installation token
    |                                      |
    |                                      v
    |                               git clone / fetch repo
    |                               git worktree add (isolated branch)
    |                                      |
    |                                      v
    |                               bootstrap(worktreeDir, async () => {
    |                                 Session.create()
    |                                 SessionPrompt.prompt(issue prompt)
    |                               })
    |                                      |
    |                                      v
    |                               agent writes files in worktree
    |                                      |
    |                                      v
    |                               git add -A && git commit
    |                               git push branch
    |                                      |
    |  <--- octokit.pulls.create --------- |
    |  <--- octokit.issues.comment ------- |
    |                                      |
    |                               git worktree remove (cleanup)
```

## Webhook Delivery

GitHub needs to deliver webhooks to `opencode serve`. Options:

```
Option A: Direct (public IP / VM)
  GitHub.com ---HTTPS---> opencode serve :4096

Option B: Tunnel (local dev)
  GitHub.com ---HTTPS---> smee.io/cloudflared/ngrok
                               |
                               +---HTTP---> localhost:4096

Option C: Polling (no inbound needed)
  opencode serve polls GitHub API for new events
  (not implemented yet)
```

For the CodexEngineer app (webhook-less app, events: []),
webhook URL must be configured in GitHub Settings UI:
  github.com/settings/apps/codexengineer -> Webhook URL

## Events Handled

| Event                          | Action    | Trigger                              |
|--------------------------------|-----------|--------------------------------------|
| `issues`                       | assigned  | Issue assigned to bot user           |
| `issue_comment`                | created   | Comment starts with `/oc ` or `/opencode ` |
| `pull_request_review_comment`  | created   | (imported but not yet implemented)   |

## Auth Flow

```
App private key (env: GITHUB_APP_PRIVATE_KEY)
        |
        v
  JWT (RS256, 10min TTL)
        |
        v
  POST /app/installations/{id}/access_tokens
        |
        v
  Installation token (cached, 1hr TTL - 5min buffer)
        |
        +---> Octokit (issues, PRs, reactions, comments)
        +---> git push URL: https://x-access-token:{token}@github.com/...
```

## File Layout

```
packages/opencode/src/
  server/
    server.ts              # registers .route("/github", GitHubWebhookRoutes())
    routes/
      github.ts            # webhook handler (711 lines)
  cli/cmd/
    github.ts              # buildIssuePrompt(), extractResponseText() (reused)
  cli/
    bootstrap.ts           # bootstrap() for Instance context
```

## Configuration (env vars)

| Env Var                     | Required | Description                                  |
|-----------------------------|----------|----------------------------------------------|
| `GITHUB_APP_ID`             | yes      | GitHub App ID                                |
| `GITHUB_APP_PRIVATE_KEY`    | yes      | PEM or base64-encoded private key            |
| `GITHUB_APP_INSTALLATION_ID`| yes      | Installation ID for the target account       |
| `GITHUB_WEBHOOK_SECRET`     | no       | HMAC secret; skipped if unset                |
| `GITHUB_WORKSPACES_DIR`     | no       | Where to clone repos (default: ~/.opencode/github-workspaces) |
| `GITHUB_AGENT_USERNAME`     | no       | Bot login to filter assignments; `*` = any (default: opencode-agent[bot]) |
| `GITHUB_AGENT_MODEL`        | no       | Model to use, format `provider/model` (e.g. `anthropic/claude-sonnet-4`). Falls back to `MODEL` env var, then config default. |

## Current State vs Design

### What Works

- [x] Route registered at `/github/webhook` in `opencode serve`
- [x] GitHub App JWT auth (manual RS256)
- [x] Installation token caching
- [x] Webhook signature verification (optional)
- [x] Event parsing and deduplication
- [x] Repo clone/fetch with token auth
- [x] Git worktree isolation per run
- [x] Agent session via `bootstrap()` + `SessionPrompt.prompt()`
- [x] `commitAll()` + `pushBranch()` + `createPR()` code path
- [x] Comment posting via Octokit as app bot
- [x] Worktree cleanup
- [x] Error handling with GitHub comment on failure
- [x] Configurable agent username (`GITHUB_AGENT_USERNAME`)

### E2E Test Result (2026-03-30)

Tested with simulated webhook (curl to a 2nd serve instance on :4097):

- Webhook received and accepted: PASS
- App auth (JWT -> installation token): PASS
- Repo cloned: PASS
- Worktree created: PASS
- Agent session ran: PASS (session ses_2c34c8965ffec0T1fjy52rOvCH)
- Comment posted as codexengineer[bot]: PASS
- **Files written by agent: FAIL** (gpt-5-nano returned text, didn't use tools)
- Branch pushed: SKIPPED (no file changes)
- PR created: SKIPPED (no file changes)

### Gaps

1. **No real webhook delivery tested** — used `curl` with saved JSON payload
   to a 2nd serve instance, not a real GitHub webhook to the primary `:4096`.
   Need to configure webhook URL on GitHub App (via smee.io tunnel or public IP).

2. **Model doesn't write files** — gpt-5-nano described changes as text
   instead of using Write/Bash tools. Need to test with a capable model
   (e.g., `github-copilot/claude-sonnet-4`) or configure model selection
   for webhook-triggered sessions.

3. ~~**No model configuration**~~ — **FIXED**: `GITHUB_AGENT_MODEL` env var
   supported (format: `provider/model`), falls back to `MODEL`, then config default.

4. **PR review comments not implemented** — `PullRequestReviewCommentEvent`
   type is imported but no handler exists.

5. ~~**No unit tests for webhook route**~~ — **FIXED**: 33 tests in
   `test/server/github-webhook.test.ts` covering signature verification,
   JWT generation, command extraction, config loading, and route-level HTTP behavior.

6. **No `/oc` comment trigger tested** — only `issues.assigned` was tested.
   `issue_comment` handler exists but hasn't been exercised.

7. **Polling mode not implemented** — only webhook push delivery.
   CodexEngineer app was designed for polling (events: []).
