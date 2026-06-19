import { describe, expect, test } from "bun:test"
import { z } from "zod"
import * as EffectZod from "@/util/effect-zod"
import { Schema } from "effect"

const { ZodOverride } = EffectZod

// Simulate what registry.ts does for plugin tools
function fromPluginArgs(args: Record<string, z.ZodTypeAny>): Schema.Schema<unknown> {
  const zodParams = z.object(args)
  return Schema.declare<unknown>((u): u is unknown => zodParams.safeParse(u).success).annotate({
    [ZodOverride as symbol]: zodParams,
  })
}

describe("plugin tool schema serialization", () => {
  test("string-only args serialize", () => {
    const schema = fromPluginArgs({
      prompt: z.string().describe("prompt"),
      agent: z.string().describe("agent"),
    })
    const json = EffectZod.toJsonSchema(schema)
    expect(json).toBeDefined()
    expect((json as any).properties.prompt.type).toBe("string")
  })

  test("optional number and boolean args serialize", () => {
    // This matches opencode-drawer-workflows workflow_status tool
    const schema = fromPluginArgs({
      run_id: z.string().describe("run id"),
      wait_ms: z.number().optional().describe("wait ms"),
      full: z.boolean().optional().describe("full output"),
    })
    const json = EffectZod.toJsonSchema(schema)
    expect(json).toBeDefined()
    expect((json as any).properties.run_id.type).toBe("string")
  })

  test("empty args serialize", () => {
    const schema = fromPluginArgs({})
    const json = EffectZod.toJsonSchema(schema)
    expect(json).toBeDefined()
    expect((json as any).type).toBe("object")
  })

  test("enum args serialize", () => {
    // Simulates micode plugin tools
    const schema = fromPluginArgs({
      session_id: z.string(),
      type: z.enum(["pick_one", "pick_many", "confirm"]),
    })
    const json = EffectZod.toJsonSchema(schema)
    expect(json).toBeDefined()
  })
})
