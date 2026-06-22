import { describe, expect, test } from "bun:test"
import { toJsonSchema } from "@/util/effect-zod"
import { Parameters as TaskParams } from "@/tool/task"

describe("all tool schemas serialize without crash", () => {
  test("TaskParams serializes to valid JSON schema", () => {
    const s = toJsonSchema(TaskParams)
    expect(s).toBeDefined()
    expect((s as any).properties.prompt).toBeDefined()
    expect((s as any).properties.prompt.type).toBe("string")
  })
})
