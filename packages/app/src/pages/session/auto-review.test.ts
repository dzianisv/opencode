import { describe, expect, test } from "bun:test"
import { reviewDone, reviewPick, reviewPrompt, reviewPromptCheck } from "./auto-review"

const model = (providerID: string, modelID: string, variant = false) => ({
  id: modelID,
  provider: { id: providerID },
  variants: variant ? { xhigh: true } : undefined,
})

describe("reviewPrompt", () => {
  test("includes required auto-review checks and completion token", () => {
    const text = reviewPrompt("openai/gpt-5")
    expect(text).toContain("1/ What was the task?")
    expect(text).toContain("2/ Did you complete it?")
    expect(text).toContain("3/ If no, why did you stop?")
    expect(text).toContain("4/ If you have next steps to do, go and do them now.")
    expect(text).toContain('5/ If everything is good, print exactly: "Task completed."')
  })
})

describe("reviewPromptCheck", () => {
  test("matches auto-review prompts by prefix", () => {
    expect(reviewPromptCheck(reviewPrompt("openai/gpt-5"))).toBe(true)
    expect(reviewPromptCheck("hello")).toBe(false)
  })
})

describe("reviewDone", () => {
  test("requires exact completion output", () => {
    expect(reviewDone("Task completed.")).toBe(true)
    expect(reviewDone(" Task completed. ")).toBe(true)
    expect(reviewDone("Task completed.\nMore")).toBe(false)
    expect(reviewDone("task completed.")).toBe(false)
  })
})

describe("reviewPick", () => {
  test("uses review model when it differs from the reviewed model", () => {
    const picked = reviewPick({
      list: [model("openai", "gpt-5"), model("anthropic", "claude-sonnet-4")],
      used: { providerID: "openai", modelID: "gpt-5" },
      review: { providerID: "anthropic", modelID: "claude-sonnet-4" },
    })

    expect(picked).toMatchObject({
      model: { providerID: "anthropic", modelID: "claude-sonnet-4" },
    })
  })

  test("falls back to default model when review model matches the reviewed model", () => {
    const picked = reviewPick({
      list: [model("openai", "gpt-5"), model("anthropic", "claude-sonnet-4", true)],
      used: { providerID: "openai", modelID: "gpt-5" },
      review: { providerID: "openai", modelID: "gpt-5" },
      base: { providerID: "anthropic", modelID: "claude-sonnet-4" },
    })

    expect(picked).toMatchObject({
      model: { providerID: "anthropic", modelID: "claude-sonnet-4" },
      variant: "xhigh",
    })
  })

  test("picks a different visible model when configured models are unavailable", () => {
    const picked = reviewPick({
      list: [model("openai", "gpt-5"), model("anthropic", "claude-sonnet-4")],
      used: { providerID: "openai", modelID: "gpt-5" },
      review: { providerID: "foo", modelID: "bar" },
      base: { providerID: "baz", modelID: "qux" },
    })

    expect(picked).toMatchObject({
      model: { providerID: "anthropic", modelID: "claude-sonnet-4" },
    })
  })

  test("returns undefined when only the same model is available", () => {
    const picked = reviewPick({
      list: [model("openai", "gpt-5")],
      used: { providerID: "openai", modelID: "gpt-5" },
      review: { providerID: "openai", modelID: "gpt-5" },
      base: { providerID: "openai", modelID: "gpt-5" },
      now: { providerID: "openai", modelID: "gpt-5" },
    })

    expect(picked).toBeUndefined()
  })
})
