import { describe, expect, test } from "bun:test"
import { Schema } from "effect"
import { toJsonSchema } from "@/util/effect-zod"

describe("interrupt tool schemas", () => {
  test("SteerParameters serializes to JSON schema", () => {
    const SteerParameters = Schema.Struct({
      task_id: Schema.String.annotate({ description: "task_id" }),
      reason: Schema.String.annotate({ description: "reason" }),
    })
    const json = toJsonSchema(SteerParameters)
    expect(json).toMatchObject({ type: "object" })
    expect(json).toHaveProperty("properties.task_id")
    expect(json).toHaveProperty("properties.reason")
  })

  test("AbortParameters with optional field serializes to JSON schema", () => {
    const AbortParameters = Schema.Struct({
      task_id: Schema.String.annotate({ description: "task_id" }),
      reason: Schema.optional(Schema.String).annotate({ description: "Optional reason" }),
    })
    const json = toJsonSchema(AbortParameters)
    expect(json).toMatchObject({ type: "object" })
    expect(json).toHaveProperty("properties.task_id")
    expect(json).toHaveProperty("properties.reason")
  })

  test("Empty Schema.Struct({}) serializes to JSON schema", () => {
    const EmptyParams = Schema.Struct({})
    const json = toJsonSchema(EmptyParams)
    expect(json).toMatchObject({ type: "object" })
  })

  test("Interrupt intent enum schema serializes", () => {
    const Intent = Schema.Literals(["steer", "cancel"])
    const s = Schema.Struct({ intent: Intent })
    const json = toJsonSchema(s)
    expect(json).toMatchObject({ type: "object" })
  })
})
