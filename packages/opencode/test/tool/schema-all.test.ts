import { describe, expect, test } from "bun:test"
import { toJsonSchema } from "@/util/effect-zod"
import { Parameters as TaskParams } from "@/tool/task"
import { Parameters as AutopilotParams } from "@/tool/autopilot"

// Import task-interrupt schemas (not exported by name, so import the whole module)
// We need to test schema serialization doesn't crash

describe("all tool schemas serialize without crash", () => {
  test("TaskParams (with optional directory field)", () => {
    const s = toJsonSchema(TaskParams)
    expect(s).toBeDefined()
    expect((s as any).properties.directory).toBeDefined()
    expect((s as any).properties.directory.type).toBe("string")
  })

  test("AutopilotParams empty struct", () => {
    const s = toJsonSchema(AutopilotParams)
    expect(s).toBeDefined()
    expect((s as any).type).toBe("object")
  })
})
