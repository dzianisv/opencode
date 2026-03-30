import { Hono } from "hono"
import { Octokit } from "@octokit/rest"
import type {
  IssuesEvent,
  IssueCommentEvent,
  PullRequestReviewCommentEvent,
} from "@octokit/webhooks-types"
import crypto from "node:crypto"
import path from "node:path"
import { mkdir } from "node:fs/promises"
import { Log } from "../../util/log"
import { lazy } from "../../util/lazy"
import { bootstrap } from "../../cli/bootstrap"
import { Session } from "../../session"
import { SessionPrompt } from "../../session/prompt"
import { buildIssuePrompt, extractResponseText } from "../../cli/cmd/github"

const log = Log.create({ service: "github-webhook" })

// ---------------------------------------------------------------------------
// Config — all from env vars
// ---------------------------------------------------------------------------

interface GitHubWebhookConfig {
  appId: number
  privateKey: string
  /** Webhook secret — if empty, signature verification is skipped (useful for local dev) */
  webhookSecret: string | undefined
  installationId: number
  /** Base directory for repo worktrees (default: ~/.opencode/github-workspaces) */
  workspacesDir: string
}

function loadConfig(): GitHubWebhookConfig | null {
  const appId = process.env["GITHUB_APP_ID"]
  const privateKey = process.env["GITHUB_APP_PRIVATE_KEY"]
  const installationId = process.env["GITHUB_APP_INSTALLATION_ID"]

  if (!appId || !privateKey || !installationId) {
    return null
  }

  return {
    appId: parseInt(appId, 10),
    privateKey: formatPrivateKey(privateKey),
    webhookSecret: process.env["GITHUB_WEBHOOK_SECRET"] || undefined,
    installationId: parseInt(installationId, 10),
    workspacesDir:
      process.env["GITHUB_WORKSPACES_DIR"] ??
      path.join(process.env["HOME"] ?? "/tmp", ".opencode", "github-workspaces"),
  }
}

// ---------------------------------------------------------------------------
// GitHub App JWT auth (manual RS256 — no @octokit/app dependency)
// ---------------------------------------------------------------------------

function formatPrivateKey(input: string): string {
  if (input.includes("BEGIN RSA PRIVATE KEY") || input.includes("BEGIN PRIVATE KEY")) {
    return input.replace(/\\n/g, "\n")
  }
  const decoded = Buffer.from(input, "base64").toString("utf8")
  if (decoded.includes("BEGIN RSA PRIVATE KEY") || decoded.includes("BEGIN PRIVATE KEY")) {
    return decoded
  }
  return input.replace(/\\n/g, "\n")
}

function base64url(data: Buffer | string): string {
  const buf = typeof data === "string" ? Buffer.from(data) : data
  return buf.toString("base64url")
}

function createAppJwt(appId: number, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  const payload = base64url(
    JSON.stringify({
      iat: now - 60, // issued 60s ago to account for clock drift
      exp: now + 10 * 60, // 10 min expiry (max allowed)
      iss: appId,
    }),
  )
  const unsigned = `${header}.${payload}`
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), privateKey)
  return `${unsigned}.${base64url(signature)}`
}

/** Token cache: { token, expiresAt } */
let tokenCache: { token: string; expiresAt: number } | null = null

async function getInstallationToken(config: GitHubWebhookConfig): Promise<string> {
  // Return cached token if still valid (with 5-min buffer)
  if (tokenCache && Date.now() < tokenCache.expiresAt - 5 * 60 * 1000) {
    return tokenCache.token
  }

  const jwt = createAppJwt(config.appId, config.privateKey)
  const response = await fetch(
    `https://api.github.com/app/installations/${config.installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Failed to get installation token: ${response.status} ${body}`)
  }

  const data = (await response.json()) as { token: string; expires_at: string }
  tokenCache = {
    token: data.token,
    expiresAt: new Date(data.expires_at).getTime(),
  }
  log.info("installation token refreshed", { expiresAt: data.expires_at })
  return data.token
}

function createOctokit(token: string): Octokit {
  return new Octokit({ auth: token })
}

// ---------------------------------------------------------------------------
// Webhook signature verification
// ---------------------------------------------------------------------------

function verifyWebhookSignature(secret: string, payload: string, signature: string | undefined): boolean {
  if (!signature) return false
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex")
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Git operations
// ---------------------------------------------------------------------------

async function execGit(args: string[], cwd: string): Promise<string> {
  const proc = Bun.spawn(["git", ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  })
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited
  if (exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed (exit ${exitCode}): ${stderr}`)
  }
  return stdout.trim()
}

async function ensureRepo(workspacesDir: string, owner: string, repo: string, token: string): Promise<string> {
  const repoDir = path.join(workspacesDir, `${owner}__${repo}`)
  const remoteUrl = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`

  try {
    // Check if repo dir exists and is a git repo
    await execGit(["rev-parse", "--git-dir"], repoDir)
    // Update remote URL (token may have changed)
    await execGit(["remote", "set-url", "origin", remoteUrl], repoDir)
    await execGit(["fetch", "origin"], repoDir)
    log.info("repo fetched", { owner, repo })
  } catch {
    // Clone fresh
    await mkdir(workspacesDir, { recursive: true })
    await execGit(["clone", remoteUrl, `${owner}__${repo}`], workspacesDir)
    log.info("repo cloned", { owner, repo })
  }

  return repoDir
}

async function getDefaultBranch(repoDir: string): Promise<string> {
  try {
    const ref = await execGit(["symbolic-ref", "refs/remotes/origin/HEAD"], repoDir)
    const parts = ref.split("/")
    return parts[parts.length - 1] ?? "main"
  } catch {
    return "main"
  }
}

function generateRunId(): string {
  return crypto.randomBytes(4).toString("hex")
}

async function createWorktree(
  repoDir: string,
  workspacesDir: string,
  owner: string,
  repo: string,
  branchName: string,
  baseBranch: string,
): Promise<string> {
  const worktreeDir = path.join(workspacesDir, `${owner}__${repo}`, ".worktrees", branchName)

  // Clean up if exists
  try {
    await execGit(["worktree", "remove", "--force", worktreeDir], repoDir)
  } catch {
    // doesn't exist, fine
  }

  await mkdir(path.dirname(worktreeDir), { recursive: true })
  await execGit(["worktree", "add", "-B", branchName, worktreeDir, `origin/${baseBranch}`], repoDir)
  log.info("worktree created", { branchName, worktreeDir })
  return worktreeDir
}

async function commitAll(cwd: string, message: string): Promise<boolean> {
  await execGit(["add", "-A"], cwd)
  try {
    // Check if there are staged changes
    await execGit(["diff", "--cached", "--quiet"], cwd)
    // If no error, there's nothing to commit
    return false
  } catch {
    // There are staged changes, commit them
    await execGit(["commit", "-m", message], cwd)
    return true
  }
}

async function pushBranch(cwd: string, token: string, owner: string, repo: string, branch: string): Promise<void> {
  const remoteUrl = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`
  await execGit(["push", "--force", remoteUrl, `HEAD:${branch}`], cwd)
  log.info("branch pushed", { owner, repo, branch })
}

async function cleanupWorktree(repoDir: string, worktreeDir: string): Promise<void> {
  try {
    await execGit(["worktree", "remove", "--force", worktreeDir], repoDir)
    log.info("worktree cleaned up", { worktreeDir })
  } catch (err) {
    log.warn("worktree cleanup failed", { worktreeDir, error: String(err) })
  }
}

// ---------------------------------------------------------------------------
// Response contract — instructs the agent NOT to push/PR/use gh CLI
// ---------------------------------------------------------------------------

function buildResponseContract(): string {
  return [
    "",
    "Response contract:",
    "- Do NOT use gh CLI, GitHub MCP tools, or GitHub APIs to create/update issues or pull requests.",
    "- Do NOT run `git push` to publish branches to GitHub.",
    "- Do NOT run `git init` or create nested git repositories.",
    "- OpenCode will handle branch publication, PR creation, and posting your response.",
    "- Write your final answer so it can be posted to GitHub as-is.",
    "- Local file edits and local git commits are fine.",
    "- If code changes are ready for review, describe the changes made.",
    "- If you ran important commands or tests, include results with pass/fail status.",
  ].join("\n")
}

// ---------------------------------------------------------------------------
// Agent execution
// ---------------------------------------------------------------------------

async function runAgent(
  worktreeDir: string,
  prompt: string,
  title: string,
): Promise<{ responseText: string | null }> {
  log.info("running agent", { worktreeDir, title, promptLength: prompt.length })

  let responseText: string | null = null

  await bootstrap(worktreeDir, async () => {
    const session = await Session.create({
      title,
    })

    const result = await SessionPrompt.prompt({
      sessionID: session.id,
      parts: [
        {
          type: "text",
          text: prompt + buildResponseContract(),
        },
      ],
    })

    responseText = extractResponseText(result.parts)
    log.info("agent completed", {
      sessionID: session.id,
      hasText: responseText !== null,
      partsCount: result.parts.length,
    })
  })

  return { responseText }
}

// ---------------------------------------------------------------------------
// PR creation & GitHub commenting
// ---------------------------------------------------------------------------

async function findExistingPR(
  octokit: Octokit,
  owner: string,
  repo: string,
  headBranch: string,
): Promise<{ number: number; html_url: string } | null> {
  const { data } = await octokit.pulls.list({
    owner,
    repo,
    state: "open",
    head: `${owner}:${headBranch}`,
    per_page: 1,
  })
  const pr = data[0]
  if (!pr) return null
  return { number: pr.number, html_url: pr.html_url }
}

async function createPR(
  octokit: Octokit,
  owner: string,
  repo: string,
  head: string,
  base: string,
  title: string,
  body: string,
  issueNumber?: number,
): Promise<{ number: number; html_url: string }> {
  const { data } = await octokit.pulls.create({
    owner,
    repo,
    head,
    base,
    title,
    body,
  })
  return { number: data.number, html_url: data.html_url }
}

async function postComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
): Promise<void> {
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  })
}

async function addReaction(
  octokit: Octokit,
  owner: string,
  repo: string,
  commentId: number,
  reaction: "+1" | "eyes" | "rocket",
): Promise<void> {
  try {
    await octokit.reactions.createForIssueComment({
      owner,
      repo,
      comment_id: commentId,
      content: reaction,
    })
  } catch {
    // non-critical
  }
}

async function addIssueReaction(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number,
  reaction: "+1" | "eyes" | "rocket",
): Promise<void> {
  try {
    await octokit.reactions.createForIssue({
      owner,
      repo,
      issue_number: issueNumber,
      content: reaction,
    })
  } catch {
    // non-critical
  }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

const AGENT_USERNAME =
  process.env.GITHUB_AGENT_USERNAME || "opencode-agent[bot]"
const COMMAND_PREFIXES = ["/oc ", "/opencode "]

function isAgentUser(login: string): boolean {
  // When GITHUB_AGENT_USERNAME is set to "*", accept any assignee
  if (AGENT_USERNAME === "*") return true
  return login === AGENT_USERNAME || login.endsWith("[bot]")
}

function extractCommand(body: string): string | null {
  const trimmed = body.trim()
  for (const prefix of COMMAND_PREFIXES) {
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length).trim()
    }
  }
  // If entire body is a command without prefix, it's treated as a direct issue prompt
  return null
}

async function handleIssueAssigned(
  event: IssuesEvent,
  config: GitHubWebhookConfig,
): Promise<void> {
  const { issue, repository } = event
  const owner = repository.owner.login
  const repo = repository.name

  // Only handle assignment to the bot
  if (event.action !== "assigned") return
  const assignee = (event as any).assignee?.login
  if (assignee && !isAgentUser(assignee)) {
    log.info("issue assigned to non-agent user, skipping", { assignee })
    return
  }

  log.info("handling issue assignment", { owner, repo, issue: issue.number })

  const token = await getInstallationToken(config)
  const octokit = createOctokit(token)

  // React to signal we're working on it
  await addIssueReaction(octokit, owner, repo, issue.number, "eyes")

  const prompt = buildIssuePrompt(issue)
  const runId = generateRunId()
  const branchName = `opencode/${issue.number}-${runId}`

  // Prepare repo + worktree
  const repoDir = await ensureRepo(config.workspacesDir, owner, repo, token)
  const baseBranch = await getDefaultBranch(repoDir)
  const worktreeDir = await createWorktree(repoDir, config.workspacesDir, owner, repo, branchName, baseBranch)

  try {
    // Run agent
    const { responseText } = await runAgent(
      worktreeDir,
      prompt,
      `${owner}/${repo}#${issue.number}`,
    )

    // Commit, push, create PR
    const hasCommit = await commitAll(worktreeDir, `opencode: issue #${issue.number}`)

    if (hasCommit) {
      await pushBranch(worktreeDir, token, owner, repo, branchName)

      const existing = await findExistingPR(octokit, owner, repo, branchName)
      if (!existing) {
        const prBody = [
          `Closes #${issue.number}`,
          "",
          responseText ?? "Changes applied by OpenCode agent.",
        ].join("\n")

        const pr = await createPR(
          octokit,
          owner,
          repo,
          branchName,
          baseBranch,
          `opencode: ${issue.title}`,
          prBody,
          issue.number,
        )

        await postComment(
          octokit,
          owner,
          repo,
          issue.number,
          `Pull request created: ${pr.html_url}`,
        )
        log.info("PR created", { pr: pr.html_url })
      } else {
        log.info("PR already exists", { pr: existing.html_url })
      }
    } else {
      // No code changes — just post the response as a comment
      const comment = responseText ?? "No code changes were needed."
      await postComment(octokit, owner, repo, issue.number, comment)
      log.info("no code changes, posted comment")
    }
  } catch (err) {
    log.error("issue handler failed", { error: err })
    try {
      await postComment(
        octokit,
        owner,
        repo,
        issue.number,
        `OpenCode agent encountered an error:\n\`\`\`\n${err instanceof Error ? err.message : String(err)}\n\`\`\``,
      )
    } catch {
      // best effort
    }
  } finally {
    await cleanupWorktree(repoDir, worktreeDir)
  }
}

async function handleIssueComment(
  event: IssueCommentEvent,
  config: GitHubWebhookConfig,
): Promise<void> {
  if (event.action !== "created") return

  const { comment, issue, repository } = event
  const owner = repository.owner.login
  const repo = repository.name

  // Ignore bot's own comments
  if (isAgentUser(comment.user.login)) return

  // Check for command prefix
  const command = extractCommand(comment.body)
  if (!command) {
    log.info("comment without command prefix, skipping", {
      owner,
      repo,
      issue: issue.number,
    })
    return
  }

  log.info("handling issue comment command", {
    owner,
    repo,
    issue: issue.number,
    command: command.slice(0, 100),
  })

  const token = await getInstallationToken(config)
  const octokit = createOctokit(token)

  // React to acknowledge
  await addReaction(octokit, owner, repo, comment.id, "eyes")

  // Build prompt: issue context + command
  const issuePrompt = buildIssuePrompt(issue)
  const fullPrompt = `${issuePrompt}\n\n---\n\nUser command: ${command}`

  const runId = generateRunId()
  const branchName = `opencode/${issue.number}-${runId}`

  const repoDir = await ensureRepo(config.workspacesDir, owner, repo, token)
  const baseBranch = await getDefaultBranch(repoDir)
  const worktreeDir = await createWorktree(repoDir, config.workspacesDir, owner, repo, branchName, baseBranch)

  try {
    const { responseText } = await runAgent(
      worktreeDir,
      fullPrompt,
      `${owner}/${repo}#${issue.number} (comment)`,
    )

    const hasCommit = await commitAll(worktreeDir, `opencode: issue #${issue.number}`)

    if (hasCommit) {
      await pushBranch(worktreeDir, token, owner, repo, branchName)

      const existing = await findExistingPR(octokit, owner, repo, branchName)
      if (!existing) {
        const prBody = [
          `Related to #${issue.number}`,
          "",
          responseText ?? "Changes applied by OpenCode agent.",
        ].join("\n")

        const pr = await createPR(
          octokit,
          owner,
          repo,
          branchName,
          baseBranch,
          `opencode: ${issue.title}`,
          prBody,
          issue.number,
        )

        await postComment(
          octokit,
          owner,
          repo,
          issue.number,
          `Pull request created: ${pr.html_url}`,
        )
        log.info("PR created from comment", { pr: pr.html_url })
      }
    } else {
      const response = responseText ?? "No code changes were needed."
      await postComment(octokit, owner, repo, issue.number, response)
      log.info("no code changes from comment, posted response")
    }

    // Add completion reaction
    await addReaction(octokit, owner, repo, comment.id, "rocket")
  } catch (err) {
    log.error("comment handler failed", { error: err })
    try {
      await postComment(
        octokit,
        owner,
        repo,
        issue.number,
        `OpenCode agent encountered an error:\n\`\`\`\n${err instanceof Error ? err.message : String(err)}\n\`\`\``,
      )
    } catch {
      // best effort
    }
  } finally {
    await cleanupWorktree(repoDir, worktreeDir)
  }
}

// ---------------------------------------------------------------------------
// Active runs tracking (prevent duplicate processing)
// ---------------------------------------------------------------------------

const activeRuns = new Set<string>()

function runKey(owner: string, repo: string, issueNumber: number, action: string): string {
  return `${owner}/${repo}#${issueNumber}:${action}`
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export const GitHubWebhookRoutes = lazy(
  () =>
    new Hono().post("/webhook", async (c) => {
      const config = loadConfig()
      if (!config) {
        return c.json({ error: "GitHub webhook not configured" }, 503)
      }

      // Verify signature (if secret configured)
      const body = await c.req.text()
      if (config.webhookSecret) {
        const signature = c.req.header("x-hub-signature-256")
        if (!verifyWebhookSignature(config.webhookSecret, body, signature)) {
          log.warn("webhook signature verification failed")
          return c.json({ error: "Invalid signature" }, 401)
        }
      }

      const event = c.req.header("x-github-event")
      const delivery = c.req.header("x-github-delivery")
      log.info("webhook received", { event, delivery })

      const payload = JSON.parse(body)

      // Deduplication
      const owner = payload.repository?.owner?.login
      const repo = payload.repository?.name
      const issueNumber = payload.issue?.number
      if (owner && repo && issueNumber) {
        const key = runKey(owner, repo, issueNumber, event ?? "unknown")
        if (activeRuns.has(key)) {
          log.info("duplicate run, skipping", { key })
          return c.json({ status: "skipped", reason: "already processing" })
        }
        activeRuns.add(key)

        // Process async — return 200 immediately
        void (async () => {
          try {
            if (event === "issues") {
              await handleIssueAssigned(payload as IssuesEvent, config)
            } else if (event === "issue_comment") {
              await handleIssueComment(payload as IssueCommentEvent, config)
            }
          } catch (err) {
            log.error("webhook handler error", { event, error: err })
          } finally {
            activeRuns.delete(key)
          }
        })()
      }

      return c.json({ status: "accepted", event, delivery })
    }),
)
