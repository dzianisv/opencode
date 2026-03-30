import { describe, expect, test } from "bun:test"
import { migrateRecent, pushRecent } from "./model-recent"

describe("model recents", () => {
  test("migrates legacy recents and keeps valid variants", () => {
    expect(
      migrateRecent([
        { providerID: "azure", modelID: "gpt-5.4-pro", variant: "high" },
        { providerID: "anthropic", modelID: "claude-opus-4-6" },
        { providerID: "", modelID: "missing" },
        null,
      ]),
    ).toEqual([
      { providerID: "azure", modelID: "gpt-5.4-pro", variant: "high" },
      { providerID: "anthropic", modelID: "claude-opus-4-6", variant: undefined },
    ])
  })

  test("keeps model variants as distinct recent choices", () => {
    const result = pushRecent(
      [{ providerID: "azure", modelID: "gpt-5.4-pro", variant: "high" }],
      { providerID: "azure", modelID: "gpt-5.4-pro", variant: "xhigh" },
    )

    expect(result).toEqual([
      { providerID: "azure", modelID: "gpt-5.4-pro", variant: "xhigh" },
      { providerID: "azure", modelID: "gpt-5.4-pro", variant: "high" },
    ])
  })

  test("dedupes identical recent choices and caps to five", () => {
    const result = pushRecent(
      [
        { providerID: "opencode", modelID: "minimax-2.5", variant: undefined },
        { providerID: "azure", modelID: "gpt-5.4-pro", variant: "high" },
        { providerID: "anthropic", modelID: "claude-opus-4-6", variant: undefined },
        { providerID: "google", modelID: "gemini-2.5-pro", variant: undefined },
        { providerID: "openai", modelID: "gpt-4.1", variant: undefined },
      ],
      { providerID: "azure", modelID: "gpt-5.4-pro", variant: "high" },
    )

    expect(result).toEqual([
      { providerID: "azure", modelID: "gpt-5.4-pro", variant: "high" },
      { providerID: "opencode", modelID: "minimax-2.5", variant: undefined },
      { providerID: "anthropic", modelID: "claude-opus-4-6", variant: undefined },
      { providerID: "google", modelID: "gemini-2.5-pro", variant: undefined },
      { providerID: "openai", modelID: "gpt-4.1", variant: undefined },
    ])
  })
})
