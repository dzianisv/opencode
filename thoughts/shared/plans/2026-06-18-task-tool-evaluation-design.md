# Task Tool Evaluation Design

Date: 2026-06-18
Scope: Automated evaluation of tool calls with a strict focus on correct `Task` tool subagent behavior in `spark.ts`.

<section name="problem">
We need an automated evaluation system that can verify and judge every tool call, confirm tools/functions actually work, and specifically guarantee that the `Task` tool correctly executes subagent loops (instead of silently skipping expected behavior).

Current risk profile:
- Real-model behavior is non-deterministic (especially small models like `qwen3:0.6b`), so integration-only validation is not sufficient for reliable regression detection.
- `Task` correctness currently depends on runtime behavior without structured lifecycle evidence (`task_id`, start/end status, per-turn trace), making failures hard to diagnose.
- Tool-call quality and correctness checks are not yet formalized as CI gates.
</section>

<section name="findings">
### Branch: Evaluation Architecture
Session finding: `Could not parse probe response`.

Fallback engineering finding:
- Use a **shadow evaluation harness** with layered checks as the baseline.
- Run deterministic assertions first (schema, dispatch, lifecycle, postconditions).
- Use model-judge only for explicitly ambiguous semantic cases.

### Branch: Task Tool Contract
Session finding: `Could not parse probe response`.

Fallback engineering finding:
- Adopt a **strict Task contract** with auditable lifecycle evidence.
- `Task` success must be provable from trace data, not inferred from a free-text final answer.

### Branch: Tool Oracles
Session finding: `Could not parse probe response`.

Fallback engineering finding:
- Use **layered oracles**:
  1) deterministic structural checks,
  2) deterministic behavioral checks,
  3) optional LLM rubric for nuanced semantic quality.

### Branch: CI Gating Rollout
Session finding: `Could not parse probe response`.

Fallback engineering finding:
- Use **staged gating**:
  - PR: required smoke + strict contract checks.
  - Nightly: deep replay matrix + semantic judge set.
  - Quarantine mechanism for newly flaky evals.
</section>

<section name="recommendation">
## Recommended approach (synthesized)

Implement a deterministic, trace-driven evaluation framework around tool execution, then layer semantic judging only where deterministic checks cannot fully capture quality.

### 1) Add structured trace capture (core prerequisite)
Instrument both main loop and `Task` loop to emit structured events:
- `tool_call_emitted` (assistant produced `tool_calls[]`)
- `tool_call_executed` (name, args, duration, result status)
- `tool_result_appended` (`tool_name`, `tool_call_id`)
- `task_started`, `task_turn`, `task_finished`, `task_timeout`

Minimum fields:
- `run_id`, `context` (`main` or `task:<task_id>`), `turn`, `call_id`, `tool_name`, `args_json`, `result_status`, `error`, `duration_ms`.

### 2) Tighten `Task` contract for subagent correctness
Define `Task` invariants to enforce and test:
1. Valid input contract (`description`, `prompt`; optionally `subagent_type` if adopted).
2. Subagent loop starts with isolated message stack (`system`, then task `user`).
3. Each subagent tool call must produce a corresponding `tool` message with `tool_name` and `tool_call_id`.
4. Unknown tools return explicit deterministic error.
5. Loop exits only via:
   - assistant response without tool calls, or
   - explicit max-turn timeout path.
6. Output includes task metadata (`task_id`/turn count/status) for auditability.

### 3) Build evaluation suites

#### A. Deterministic contract tests (blocking in PR)
- Validate tool-call/result correlation (`tool_call_id` + `tool_name`).
- Validate one-to-one mapping: every assistant tool call has exactly one appended tool result message.
- Validate `Task` lifecycle transitions and timeout handling.

#### B. Tool functional tests (blocking in PR)
- `ReadFile`: missing file, directory listing, line slicing/numbering.
- `WriteFile`: full write, unique patch, replace-all, missing oldString cases.
- `Bash`: success, non-zero exit, timeout kill path.
- `Eval`: output capture, thrown error formatting.
- `LoadSkill`: found/not found and content fetch behavior.

#### C. Replay behavior tests (nightly)
- Replay scripted assistant traces with expected tool-call plans.
- Assert execution transcript matches expected call order and outcomes.
- Include high-priority `Task` scenarios:
  - single-step subtask,
  - multi-tool subtask,
  - unknown-tool branch,
  - max-turn branch.

#### D. Optional semantic judge (nightly, non-blocking initially)
- Judge only when deterministic assertions pass but quality is ambiguous.
- Example rubric: “Did the chosen tool and arguments satisfy the user intent?”

### 4) CI rollout policy
- **PR required checks**:
  - deterministic contract tests,
  - tool functional tests,
  - `Task` critical-path replay tests.
- **Nightly checks**:
  - expanded replay corpus,
  - semantic judge runs,
  - trend report (pass rate, flake rate, regression diff).
- **Quarantine**:
  - auto-tag flaky tests,
  - keep them visible but non-blocking until stabilized.

### 5) Definition of done for this initiative
1. Every tool call in test runs is traceable from model emission to appended tool result.
2. `Task` subagent flows are provably correct through deterministic lifecycle assertions.
3. PR pipeline blocks regressions in tool-call contract and core tool behavior.
4. Nightly pipeline produces actionable quality metrics without creating excessive false failures.
</section>
