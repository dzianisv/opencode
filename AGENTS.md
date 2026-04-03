- To regenerate the JavaScript SDK, run `./packages/sdk/js/script/build.ts`.
- ALWAYS USE PARALLEL TOOLS WHEN APPLICABLE.
- The default branch in this repo is `dev`.
- Local `main` ref may not exist; use `dev` or `origin/dev` for diffs.
- Prefer automation: execute requested actions without confirmation unless blocked by missing info or safety/irreversibility.
- App e2e note: `bun test:e2e` expects a backend at `127.0.0.1:4096`; use `bun test:e2e:local -- -- <spec>` when running tests in isolation.

## Devx

- If a task has an upstream issue (for example in `anomalyco/opencode`), keep that issue updated while working.
- When any commit/PR/merge relates to an upstream issue, add an upstream issue comment with:
  - what changed
  - commit SHA and PR link
  - current status (in progress, merged, or blocked)
- Do not wait until the end of the task; post updates as soon as relevant commits or merges happen.

## Style Guide

### General Principles

- Keep things in one function unless composable or reusable
- Avoid `try`/`catch` where possible
- Avoid using the `any` type
- Prefer single word variable names where possible
- Use Bun APIs when possible, like `Bun.file()`
- Rely on type inference when possible; avoid explicit type annotations or interfaces unless necessary for exports or clarity
- Prefer functional array methods (flatMap, filter, map) over for loops; use type guards on filter to maintain type inference downstream

### Naming

Prefer single word names for variables and functions. Only use multiple words if necessary.

### Naming Enforcement (Read This)

THIS RULE IS MANDATORY FOR AGENT WRITTEN CODE.

- Use single word names by default for new locals, params, and helper functions.
- Multi-word names are allowed only when a single word would be unclear or ambiguous.
- Do not introduce new camelCase compounds when a short single-word alternative is clear.
- Before finishing edits, review touched lines and shorten newly introduced identifiers where possible.
- Good short names to prefer: `pid`, `cfg`, `err`, `opts`, `dir`, `root`, `child`, `state`, `timeout`.
- Examples to avoid unless truly required: `inputPID`, `existingClient`, `connectTimeout`, `workerPath`.

```ts
// Good
const foo = 1
function journal(dir: string) {}

// Bad
const fooBar = 1
function prepareJournal(dir: string) {}
```

Reduce total variable count by inlining when a value is only used once.

```ts
// Good
const journal = await Bun.file(path.join(dir, "journal.json")).json()

// Bad
const journalPath = path.join(dir, "journal.json")
const journal = await Bun.file(journalPath).json()
```

### Destructuring

Avoid unnecessary destructuring. Use dot notation to preserve context.

```ts
// Good
obj.a
obj.b

// Bad
const { a, b } = obj
```

### Variables

Prefer `const` over `let`. Use ternaries or early returns instead of reassignment.

```ts
// Good
const foo = condition ? 1 : 2

// Bad
let foo
if (condition) foo = 1
else foo = 2
```

### Control Flow

Avoid `else` statements. Prefer early returns.

```ts
// Good
function foo() {
  if (condition) return 1
  return 2
}

// Bad
function foo() {
  if (condition) return 1
  else return 2
}
```

### Schema Definitions (Drizzle)

Use snake_case for field names so column names don't need to be redefined as strings.

```ts
// Good
const table = sqliteTable("session", {
  id: text().primaryKey(),
  project_id: text().notNull(),
  created_at: integer().notNull(),
})

// Bad
const table = sqliteTable("session", {
  id: text("id").primaryKey(),
  projectID: text("project_id").notNull(),
  createdAt: integer("created_at").notNull(),
})
```

## Testing

- Avoid mocks as much as possible
- Test actual implementation, do not duplicate logic into tests
- Tests cannot run from repo root (guard: `do-not-run-tests-from-root`); run from package dirs like `packages/opencode`.

## Memory Panic Triage

If the user reports a panic, OOM, runaway RSS, or unexplained restarts, analyze memory artifacts before guessing.

1. Capture the current state.
   Run the relevant package-scoped checks first, such as `bun run --cwd packages/opencode profile:memory:wait` for a waiting server or `bun run --cwd packages/opencode profile:memory:workload` for a synthetic reproduction.
2. Inspect the durable artifacts under `~/.local/share/opencode/log`.
   Start with `dev.log`, the newest `memory-*.ndjson`, and the newest directories in `~/.local/share/opencode/log/memory/`.
3. Read the snapshot files in order.
   `sample.json` shows RSS, heap, PTY count, session counts, and instance-cache pressure.
   `meta.json` shows why the snapshot was taken and the threshold or trigger state.
   `ps.txt` shows child-process footprint.
   On macOS, also inspect `vmmap.txt` and `sample.txt`.
4. Open `heap.heapsnapshot` only after you know the spike is heap-related.
   Use Chrome DevTools Memory tooling to inspect retained objects and dominators.
5. Check disk pressure alongside memory pressure.
   Inspect `~/.local/share/opencode/worktree`, `~/.local/share/opencode/tool-output`, and `~/.local/share/opencode/log` so you do not misdiagnose a disk-exhaustion crash as a heap leak.
6. Preserve evidence in the issue or PR.
   Record exact sizes, timestamps, active session counts, and the snapshot trigger reason.

Do not generate repeated snapshots blindly. Retention keeps only the newest `2` heap snapshot directories, so if an older capture matters, attach or summarize it before reproducing again.

## Type Checking

- Always run `bun typecheck` from package directories (e.g., `packages/opencode`), never `tsc` directly.

## Pre-Push Verification (mandatory)

Before considering any task complete and before pushing code, you **must** verify all of the following pass:

1. **Typecheck**: `cd packages/opencode && bun typecheck` — must report 0 errors
2. **App build**: `cd packages/app && bun run build` — must succeed
3. **Local install**: `bun run install:local` (from repo root) — must succeed end-to-end
4. **Tests**: `cd packages/opencode && bun test` — must pass

If any step fails, fix the issue before pushing. Do not push broken code.
