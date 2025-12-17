# OpenCode Tasks

## 1. Rebase dev on upstream/dev

- **Status**: IN PROGRESS
- Fetched upstream (563 new commits)
- Rebase started, hit conflict on commit `3db37c51c` (Kilo Code provider)
- Conflicted files: `auth.ts` (deleted upstream), `provider.ts`, `sst.config.ts`
- Decision: resolve conflicts to keep Kilo Code integration
- **Next**: resolve conflicts, continue rebase through remaining ~30 commits

## 2. Review PR #16241 — LSP stderr memory leak fix

- **Status**: REVIEWED (pending comment)
- PR by dimaosipa: adds `stdio: ["pipe", "pipe", "ignore"]` to ~43 LSP spawn calls
- **Key finding**: The fix targets LSP child processes, but LSP only runs inside the TUI worker (via `InstanceBootstrap` -> `LSP.init()`). LSP servers are spawned lazily on first file open, not at startup.
- **Problem**: The PR premise (unbuffered stderr causing 15GB growth) is plausible for LSP-heavy sessions, BUT this does NOT explain 8GB vRAM growth for overnight idle sessions because:
  1. LSP stderr is only an issue if LSP servers are chatty AND running
  2. The main opencode process (Bun) has no heap limit at all
  3. The real issue is likely Bun's own heap growing unbounded (no `--smol` or heap cap)
- **Verdict**: The fix is correct but narrow — it prevents one leak vector but not the main one
- **Next**: Post comment on the PR with this analysis

## 3. Memory leak investigation

- **Status**: IN PROGRESS
- **Current optimizations in codebase** (our fork):
  - Ring buffers for bash/prompt output (10MB cap, 30KB preview)
  - Batched delta flushing (50ms throttle) to avoid O(n^2) string concat
  - LSP child processes capped at 512MB (`--max-old-space-size=512`)
  - Instance.dispose() / State.dispose() cleanup system
  - Signal handlers for graceful shutdown
  - WeakMap/WeakSet for GC-friendly caches
  - `using`/Symbol.dispose for scoped cleanup
  - Timer `.unref()` calls
- **Root cause hypothesis**: Bun itself has NO heap limit by default. Unlike Node.js which defaults to ~1.5GB, Bun will consume all available memory. For overnight sessions the heap grows unbounded.
- **Proposed solutions**:
  1. Set `BUN_JSC_forceRAMSize` or `BUN_JSC_gcMaxHeapSize` env var at launch (256MB)
  2. Use Bun's `--smol` flag to optimize for minimal memory footprint
  3. Periodic `Bun.gc(true)` in idle detection
  4. Investigate if `BUN_JSC_useJIT=0` reduces memory for long-running
- **Next**: Research Bun heap limit env vars, implement at launch
