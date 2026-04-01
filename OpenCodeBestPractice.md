# OpenCode Best Practices: Why We Forked and How We Work

Last year, I kept hitting the same wall: long coding sessions slowed down, context disappeared after restarts, and my model quota vanished faster than actual PRs landed. This fork is the result of fixing those problems in production, not in theory.

> **TL;DR** — We forked [opencode](https://github.com/dzianisv/opencode) to fix real-world pain points and built a multi-agent workflow with cheap specialist models doing the heavy lifting and an expensive coordinator keeping them on track. The result: dramatically better throughput without burning quota.

---

## Why We Forked

Upstream [opencode](https://opencode.ai) is a brilliant foundation — a terminal-native AI coding assistant with a clean architecture. But day-to-day use surfaced friction that made it hard to rely on for long sessions or multi-context work.

### 1. Memory Leaks

Long-running opencode sessions accumulated memory over time. Terminal multiplexer sessions left alive overnight would return to a sluggish or unresponsive process. We profiled, identified leaks in session and tool-output retention, and patched them so opencode is genuinely long-lived.

### 2. Web Console — Active Tabs, Session Load, Auto-Resume, Git Worktrees

The browser-based console was missing several features that matter for real development workflows:

- **Recent active tabs** — the console had no concept of "what was I just working on?" Switching contexts meant manually hunting for the right session.
- **Session load** — restoring a previous session from disk was cumbersome. We made it a first-class action.
- **Session auto-resume after restart** — if opencode crashed or you rebooted, sessions were lost. Auto-resume replays the last active session state on startup.
- **Git worktree autoload** — we often run parallel branches in separate `git worktree` directories. The console now detects and loads the correct project context automatically based on the active worktree.

These four features together mean you can close your laptop, come back the next day, and be exactly where you left off — across multiple branches simultaneously.

### 3. Multi-Fallback Model Support for Subagents

Upstream opencode routes each subagent to a single model. When that model is rate-limited or unavailable, the agent fails. We added a fallback list:

```yaml
model: ["opencode/minimax-m2.5-free", "github-copilot/grok-code-fast-1"]
```

The agent tries each model in order until one succeeds. This is particularly useful for the QA role, where we combine a free high-capacity model (minimax) with a fast fallback (grok). Zero agent failures due to quota exhaustion.

---

## Configuration: The `~/.config/opencode` Setup

All of this comes together in `~/.config/opencode/`. The key files:

```
~/.config/opencode/
├── AGENTS.md               ← system prompt for the coordinator (Staff Engineer)
├── opencode.json           ← provider keys, model registry, permissions
└── agents/
    ├── BackendDeveloper.md
    ├── FrontendDeveloper.md
    ├── DevOpsEngineer.md
    ├── QAEngineer.md
    └── SEOEngineer.md
```

### `AGENTS.md` — The Coordinator's System Prompt

This file defines the **Staff Software Engineer** role — the main session that the user talks to directly. It never writes code itself. Its job is to:

1. Create a GitHub issue
2. Decompose the task
3. Spawn and orchestrate subagents in parallel
4. Review results and create PRs

```markdown
## Role
You are a Staff Software Engineer. Design, delegate, and review — never implement directly.

## Workflow
1. Create a GitHub issue
2. Decompose tasks and delegate to subagents
3. Run independent subagents in parallel when possible
4. Review, create PR, watch CI
5. Never implement changes yourself
```

The coordinator runs on **Claude Opus** — the most capable (and expensive) model. But it sends far fewer tokens than an implementation agent; it mostly reasons and orchestrates.

### `agents/` — Specialist Subagents

Each file in `agents/` defines a role with its own model, temperature, and permissions:

| Agent | Model(s) | Scope |
|---|---|---|
| `BackendDeveloper` | `gpt-5.3-codex` | APIs, databases, server-side logic |
| `FrontendDeveloper` | `gemini-3.1-pro-preview` | UI, styling, client-side |
| `QAEngineer` | `minimax-m2.5-free` → `grok-code-fast-1` | Tests, edge cases, validation |
| `DevOpsEngineer` | `claude-sonnet-4-6` → anthropic fallbacks → qwen | CI/CD, infra, deployments |
| `SEOEngineer` | `gemini-3.1-pro-preview` | Release notes, blog posts, SEO |

The key insight: **subagents do most of the token work on cheaper models**. Codex, Gemini, and Minimax are significantly cheaper per token than Opus. The coordinator's expensive reasoning is used sparingly — only for decomposition, review, and decisions.

#### Example: `BackendDeveloper.md`

```yaml
---
description: Backend engineer focused on implementing already-designed tasks
mode: subagent
model: github-copilot/gpt-5.3-codex
temperature: 0.3
tools:
  write: true
  edit: true
  bash: true
permission:
  edit: allow
  bash: allow
---

You are a backend software engineer. Your focus is implementing software tasks
that have already been designed and specified...
```

#### Example: `QAEngineer.md` (with fallback)

```yaml
---
description: QA engineer that writes and runs tests, finds edge cases
mode: subagent
model: ["opencode/minimax-m2.5-free", "github-copilot/grok-code-fast-1"]
temperature: 0.2
---
```

---

## The Workflow in Practice

Here's what a typical task looks like end-to-end:

```
User: "Add rate limiting to the API"
  │
  ▼
[Coordinator — Opus]
  Creates GitHub issue #42
  Decomposes: backend middleware + frontend error display + QA tests
  │
  ├──► [BackendDeveloper — Codex]     writes rate-limit middleware
  ├──► [FrontendDeveloper — Gemini]   updates error handling UI
  └──► [QAEngineer — Minimax/Grok]   writes integration tests
         │
         ▼
[Coordinator — Opus]
  Reviews diffs from all three agents
  Creates PR, comments on issue
  Watches CI — done
```

The three subagents run **in parallel**. The coordinator only touches the expensive model at the start (decomposition) and the end (review). Everything in the middle uses cheap fast models.

---

## How I Stopped Hitting Quota

Most AI coding tools burn quota uniformly — every token, regardless of the task, goes through the same expensive frontier model. Our approach:

- **Coordinator (Opus)**: ~5–10% of total tokens — used only for reasoning, decomposition, and review
- **Subagents (Codex, Gemini, Minimax)**: ~90–95% of total tokens — implementation work at fraction of the cost

In practice this means we can run **5–10× more parallel workstreams** before hitting rate limits compared to running everything through a single frontier model.

The fallback model list (`["minimax-m2.5-free", "grok-code-fast-1"]`) adds another layer: if the preferred model is rate-limited, work continues uninterrupted on the fallback.

---

## Before vs After

| Workflow pain | Before | After |
|---|---|---|
| Long-running sessions | Memory growth and sluggishness over time | Leak fixes keep sessions stable for long runs |
| Restart resilience | Context often lost after crash/reboot | Auto-resume restores active session state |
| Multi-branch work | Manual context switching between worktrees | Worktree autoload restores correct repo context |
| Model availability | Single-model subagents fail on rate limit | Fallback model chains keep agents running |
| Cost efficiency | Expensive model used for everything | Opus coordinates; cheaper specialists implement |

---

## Remote Development: Codebox + Tailscale

Running multi-agent sessions locally is fine for light tasks, but parallel subagents doing real implementation work are CPU and memory hungry. The solution: spin up a cloud VM and use it as the execution host.

### The Stack

- **[codebox](https://github.com/dzianisv/codebox)** — a CLI tool that provisions a remote dev environment, rsyncs your local workspace and opencode configuration to it, and keeps a tunnel alive so you can use the remote opencode instance from your browser
- **[Tailscale](https://tailscale.com)** — a zero-config mesh VPN that gives every VM a stable private hostname regardless of cloud provider or NAT

### How It Works

```
Local machine                          Cloud VM (Azure / GCP / etc.)
─────────────────                      ──────────────────────────────
~/.config/opencode/  ──rsync──►        ~/.config/opencode/
~/workspace/myrepo   ──rsync──►        ~/workspace/myrepo
                                       opencode running on :5551
                                            │
localhost:5551       ◄──ssh tunnel──────────┘
```

1. **Provision a VM** — any cloud VM works; Tailscale is installed during bootstrap
2. **Run codebox** — it rsyncs your repo, opencode config, API keys, and `~/.ssh`:

```sh
# First sync: installs devbox, opencode fork, and your agents config
codebox --remote azureuser@dev-1

# Push a specific opencode branch to the VM
codebox --remote azureuser@dev-1 --opencode-ref dev

# Or push your local opencode checkout directly
codebox --remote azureuser@dev-1 --opencode-src ~/workspace/opencode
```

3. **Access via Tailscale** — the VM joins your Tailscale network during setup; SSH to it by hostname from any device, no port forwarding or firewall rules needed
4. **Use the tunnel** — codebox automatically creates a local SSH tunnel so your browser hits `localhost:5551` and talks to the remote opencode:

```sh
# Start/reuse the background tunnel
codebox tunnel

# List active tunnels
codebox tunnel --list

# SSH directly into the repo directory on remote
codebox ssh azureuser@dev-1
```

### What Gets Synced

codebox rsyncs by default:
- The current repo (including `.git`, so the remote is a real git clone)
- `~/.config/opencode/` — your entire agent configuration follows the VM
- `~/.local/share/opencode/auth.json` — GitHub Copilot auth so remote sessions work
- Environment variables: `GITHUB_TOKEN`, `OPENAI_*`, `AZURE_OPENAI_*`, `OPENCODE_*`, and any `*_TOKEN`

Excluded by default: `node_modules`, `dist`, `.venv`, `codex-rs/target*`.

### Why This Setup Wins

- **Laptop stays cool** — all agent compute runs on the VM
- **Session survives laptop close** — opencode runs as a `systemd` user service; sessions persist even when you disconnect
- **Tailscale hostname is stable** — `ssh dev-1` works from home, coffee shop, or phone hotspot without touching firewall rules
- **One command to resume** — `codebox tunnel` reconnects the local port and you're back in the session

---

## Getting Started

1. **Clone the fork**: `git clone https://github.com/dzianisv/opencode`
2. **Install codebox**: `npm install -g @dzianisv/codebox`
3. **Install Tailscale** on your VM and local machine
4. **Create `~/.config/opencode/AGENTS.md`** with the Staff Engineer prompt
5. **Create `~/.config/opencode/agents/`** with your specialist agent files
6. **Add your providers** to `~/.config/opencode/opencode.json`
7. **Sync to VM**: `codebox --remote user@your-vm`
8. **Open the tunnel**: `codebox tunnel` — then open `http://localhost:5551`

---

## Copy This Setup in 5 Minutes

If you only copy three things, copy these:

1. `~/.config/opencode/AGENTS.md` (your coordinator behavior)
2. `~/.config/opencode/agents/*.md` (your specialist roles + model routing)
3. `~/.config/opencode/opencode.json` (providers, permissions, model config)

That gives you the same coordinator + specialist architecture immediately, and you can tune models later.

---

## Summary

| Problem | Solution |
|---|---|
| Memory leaks in long sessions | Patched retention logic in our fork |
| Lost context between sessions | Session auto-resume + active tab memory |
| Working across parallel branches | Git worktree autoload |
| Single model quota exhaustion | Multi-fallback model list per agent |
| Expensive frontier model for all work | Role-specific cheaper models for subagents |
| Agent orchestration overhead | Coordinator pattern: one Opus brain, many cheap hands |
| Laptop overheating / sessions lost on sleep | Remote VM via codebox — opencode runs as a systemd service |
| VPN/firewall friction for remote access | Tailscale mesh — stable hostname from any network |

The combination of engineering fixes (leaks, resume, worktrees) and workflow design (coordinator + specialists) turned opencode from a capable prototype into a reliable daily driver that scales with complex multi-agent work without burning budget.
