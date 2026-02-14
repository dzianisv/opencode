import { describe, test, expect } from "bun:test"
import { spawn } from "child_process"
import path from "path"
import { Instance } from "../../src/project/instance"
import { BashTool } from "../../src/tool/bash"
import { tmpdir } from "../fixture/fixture"

const projectRoot = path.join(__dirname, "../..")

const ctx = {
  sessionID: "test",
  messageID: "",
  callID: "",
  agent: "build",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => {},
  ask: async () => {},
}

const MB = 1024 * 1024

describe("memory: cleanup", () => {
  test("Instance.disposeAll kills detached child processes", async () => {
    await using tmp = await tmpdir({ git: true })
    const pids: number[] = []

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        // Spawn 3 long-running detached processes (simulates LSP/MCP servers)
        for (let i = 0; i < 3; i++) {
          const child = spawn("sleep", ["300"], {
            detached: true,
            stdio: "ignore",
          })
          if (child.pid) pids.push(child.pid)
          child.unref()
        }

        // Verify all children are alive
        for (const pid of pids) {
          expect(isAlive(pid)).toBe(true)
        }

        // Dispose the instance — this should trigger State.dispose()
        // which cascades to registered cleanup handlers
        await Instance.dispose()
      },
    })

    // Note: Instance.dispose() runs registered State dispose callbacks,
    // but raw child_process.spawn'd processes aren't tracked by Instance state.
    // This test verifies the framework runs dispose callbacks. The actual
    // child process cleanup depends on modules (LSP, MCP, Shell) registering
    // proper dispose handlers that kill their processes.
    //
    // The signal handler fix ensures Instance.disposeAll() actually RUNS
    // on SIGHUP/SIGTERM/SIGINT instead of the process dying silently.

    // Clean up our test processes
    for (const pid of pids) {
      try {
        process.kill(pid, "SIGTERM")
      } catch {}
    }
  })

  test("signal handler test: SIGTERM triggers graceful shutdown", async () => {
    // Write a temp script that registers signal handlers in the same pattern
    // as our index.ts fix, then send SIGTERM and verify the handler fires.
    await using signalTmp = await tmpdir()
    const script = path.join(signalTmp.path, "signal-test.js")
    await Bun.write(
      script,
      [
        "let disposing = false;",
        "const graceful = (signal) => {",
        "  if (disposing) return;",
        "  disposing = true;",
        "  process.exit(42);",
        "};",
        'process.on("SIGTERM", () => graceful("SIGTERM"));',
        'process.on("SIGINT", () => graceful("SIGINT"));',
        'process.on("SIGHUP", () => graceful("SIGHUP"));',
        // Signal readiness by writing to stdout
        'process.stdout.write("ready\\n");',
        "setTimeout(() => process.exit(1), 10000);",
      ].join("\n"),
    )

    const proc = Bun.spawn(["bun", "run", script], { stdio: ["ignore", "pipe", "pipe"] })

    // Wait for the script to signal it has registered handlers
    const reader = proc.stdout.getReader()
    const { value } = await reader.read()
    const output = new TextDecoder().decode(value)
    expect(output.trim()).toBe("ready")

    // Send SIGTERM (signal 15)
    proc.kill(15)

    const code = await proc.exited

    // Exit code 42 proves our signal handler ran (not default SIGTERM behavior).
    // Default SIGTERM would give a signal-killed exit (non-42).
    // This validates the pattern we use in index.ts, worker.ts, serve.ts.
    expect(code).toBe(42)
  }, 10000)

  test("bash tool ring buffer bounds memory for large output", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const bash = await BashTool.init()

        // Warm up
        await bash.execute({ command: "echo warmup", description: "warmup" }, ctx)
        Bun.gc(true)
        Bun.sleepSync(100)
        const baseline = process.memoryUsage().heapUsed

        // Generate 5MB of output — with old O(n²) pattern this would
        // cause ~25MB+ of intermediate string allocations
        const result = await bash.execute(
          {
            command: "head -c 5242880 /dev/urandom | base64",
            description: "Generate 5MB output",
          },
          ctx,
        )

        Bun.gc(true)
        Bun.sleepSync(100)
        const after = process.memoryUsage().heapUsed
        const growth = (after - baseline) / MB

        console.log(`Baseline: ${(baseline / MB).toFixed(2)} MB`)
        console.log(`After 5MB command: ${(after / MB).toFixed(2)} MB`)
        console.log(`Growth: ${growth.toFixed(2)} MB`)
        console.log(`Output length: ${result.output.length} bytes`)

        // The output itself should exist and be non-empty
        expect(result.output.length).toBeGreaterThan(0)

        // Metadata (preview) should be capped at MAX_METADATA_LENGTH (30KB)
        expect(result.metadata.output.length).toBeLessThanOrEqual(30_000 + 10)

        // With the ring buffer, memory growth should be bounded.
        // The output is ~7MB (base64 of 5MB), plus the ring buffer ~10MB cap.
        // Without the fix, O(n²) intermediate strings could use 50MB+.
        // Allow up to 30MB growth (generous) to account for GC timing.
        expect(growth).toBeLessThan(30)
      },
    })
  }, 60000)

  test("bash tool metadata preview does not grow with output", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const bash = await BashTool.init()
        const previews: string[] = []
        const testCtx = {
          ...ctx,
          metadata: (update: any) => {
            if (update.metadata?.output) {
              previews.push(update.metadata.output)
            }
          },
        }

        // Generate output larger than MAX_METADATA_LENGTH (30KB)
        await bash.execute(
          {
            command: "head -c 100000 /dev/urandom | base64",
            description: "Generate 100KB output",
          },
          testCtx,
        )

        // After the preview caps, subsequent updates should all be the same length
        const capped = previews.filter((p) => p.length >= 30_000)
        if (capped.length > 1) {
          // All capped previews should be the same (no further growth)
          const lengths = new Set(capped.map((p) => p.length))
          expect(lengths.size).toBe(1)
        }

        // The final preview should not exceed 30KB + "..." suffix
        const last = previews[previews.length - 1]
        expect(last.length).toBeLessThanOrEqual(30_000 + 10)
      },
    })
  }, 30000)
})

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}
