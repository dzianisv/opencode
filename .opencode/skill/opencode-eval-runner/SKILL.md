---
name: opencode-eval-runner
description: Run and evaluate the repo's promptfoo-based OpenCode hello-world eval, including setup, execution, and interpreting pass/fail output. Use when asked to verify or demonstrate the agent evaluation flow, especially the `eval:hello` test in `packages/opencode`.
---

# OpenCode Eval Runner

## Workflow

1. Build and install the local OpenCode CLI.

```bash
./scripts/install-local.sh
```

2. Run the eval from `packages/opencode`.

```bash
cd packages/opencode
bun run eval:hello
```

3. Interpret results.

- Success: output includes `Eval passed: 1 checks` and exits `0`.
- Failure: output includes `Eval failed: …` and exits non-zero.

## Environment

- Ensure `~/.env.d/codex.env` exists with Azure credentials. The eval runner loads this file automatically.
- The eval uses `azure:responses` with `apiVersion=preview` by default. If an API version error occurs, keep `apiVersion=preview` or set `AZURE_OPENAI_API_VERSION=preview`.

## Troubleshooting

- If the eval hangs after printing “Eval passed…”, ensure the runner calls `process.exit(0)` (already present in `packages/opencode/evals/hello_world_eval.ts`).
- If OpenCode CLI is not found, re-run `./scripts/install-local.sh` to install the local build to `~/.opencode/bin/opencode`.
