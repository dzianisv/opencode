import { test, expect, describe } from "bun:test"
import { extractResponseText, formatPromptTooLargeError, buildIssuePrompt } from "../../src/cli/cmd/github"
import type { MessageV2 } from "../../src/session/message-v2"
import { SessionID, MessageID, PartID } from "../../src/session/schema"

// Helper to create minimal valid parts
function createTextPart(text: string): MessageV2.Part {
  return {
    id: PartID.ascending(),
    sessionID: SessionID.make("s"),
    messageID: MessageID.make("m"),
    type: "text" as const,
    text,
  }
}

function createReasoningPart(text: string): MessageV2.Part {
  return {
    id: PartID.ascending(),
    sessionID: SessionID.make("s"),
    messageID: MessageID.make("m"),
    type: "reasoning" as const,
    text,
    time: { start: 0 },
  }
}

function createToolPart(tool: string, title: string, status: "completed" | "running" = "completed"): MessageV2.Part {
  if (status === "completed") {
    return {
      id: PartID.ascending(),
      sessionID: SessionID.make("s"),
      messageID: MessageID.make("m"),
      type: "tool" as const,
      callID: "c1",
      tool,
      state: {
        status: "completed",
        input: {},
        output: "",
        title,
        metadata: {},
        time: { start: 0, end: 1 },
      },
    }
  }
  return {
    id: PartID.ascending(),
    sessionID: SessionID.make("s"),
    messageID: MessageID.make("m"),
    type: "tool" as const,
    callID: "c1",
    tool,
    state: {
      status: "running",
      input: {},
      time: { start: 0 },
    },
  }
}

function createStepStartPart(): MessageV2.Part {
  return {
    id: PartID.ascending(),
    sessionID: SessionID.make("s"),
    messageID: MessageID.make("m"),
    type: "step-start" as const,
  }
}

function createStepFinishPart(): MessageV2.Part {
  return {
    id: PartID.ascending(),
    sessionID: SessionID.make("s"),
    messageID: MessageID.make("m"),
    type: "step-finish" as const,
    reason: "done",
    cost: 0,
    tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
  }
}

describe("extractResponseText", () => {
  test("returns text from text part", () => {
    const parts = [createTextPart("Hello world")]
    expect(extractResponseText(parts)).toBe("Hello world")
  })

  test("returns last text part when multiple exist", () => {
    const parts = [createTextPart("First"), createTextPart("Last")]
    expect(extractResponseText(parts)).toBe("Last")
  })

  test("returns text even when tool parts follow", () => {
    const parts = [createTextPart("I'll help with that."), createToolPart("todowrite", "3 todos")]
    expect(extractResponseText(parts)).toBe("I'll help with that.")
  })

  test("returns null for reasoning-only response (signals summary needed)", () => {
    const parts = [createReasoningPart("Let me think about this...")]
    expect(extractResponseText(parts)).toBeNull()
  })

  test("returns null for tool-only response (signals summary needed)", () => {
    // This is the exact scenario from the bug report - todowrite with no text
    const parts = [createToolPart("todowrite", "8 todos")]
    expect(extractResponseText(parts)).toBeNull()
  })

  test("returns null for multiple completed tools", () => {
    const parts = [
      createToolPart("read", "src/file.ts"),
      createToolPart("edit", "src/file.ts"),
      createToolPart("bash", "bun test"),
    ]
    expect(extractResponseText(parts)).toBeNull()
  })

  test("returns null for running tool parts (signals summary needed)", () => {
    const parts = [createToolPart("bash", "", "running")]
    expect(extractResponseText(parts)).toBeNull()
  })

  test("throws on empty array", () => {
    expect(() => extractResponseText([])).toThrow("no parts returned")
  })

  test("returns null for step-start only", () => {
    const parts = [createStepStartPart()]
    expect(extractResponseText(parts)).toBeNull()
  })

  test("returns null for step-finish only", () => {
    const parts = [createStepFinishPart()]
    expect(extractResponseText(parts)).toBeNull()
  })

  test("returns null for step-start and step-finish", () => {
    const parts = [createStepStartPart(), createStepFinishPart()]
    expect(extractResponseText(parts)).toBeNull()
  })

  test("returns text from multi-step response", () => {
    const parts = [
      createStepStartPart(),
      createToolPart("read", "src/file.ts"),
      createTextPart("Done"),
      createStepFinishPart(),
    ]
    expect(extractResponseText(parts)).toBe("Done")
  })

  test("prefers text over reasoning when both present", () => {
    const parts = [createReasoningPart("Internal thinking..."), createTextPart("Final answer")]
    expect(extractResponseText(parts)).toBe("Final answer")
  })

  test("prefers text over tools when both present", () => {
    const parts = [createToolPart("read", "src/file.ts"), createTextPart("Here's what I found")]
    expect(extractResponseText(parts)).toBe("Here's what I found")
  })
})

describe("formatPromptTooLargeError", () => {
  test("formats error without files", () => {
    const result = formatPromptTooLargeError([])
    expect(result).toBe("PROMPT_TOO_LARGE: The prompt exceeds the model's context limit.")
  })

  test("formats error with files (base64 content)", () => {
    // Base64 is ~33% larger than original, so we multiply by 0.75 to get original size
    // 400 KB base64 = 300 KB original, 200 KB base64 = 150 KB original
    const files = [
      { filename: "screenshot.png", content: "a".repeat(400 * 1024) },
      { filename: "diagram.png", content: "b".repeat(200 * 1024) },
    ]
    const result = formatPromptTooLargeError(files)

    expect(result).toStartWith("PROMPT_TOO_LARGE: The prompt exceeds the model's context limit.")
    expect(result).toInclude("Files in prompt:")
    expect(result).toInclude("screenshot.png (300 KB)")
    expect(result).toInclude("diagram.png (150 KB)")
  })

  test("lists all files when multiple present", () => {
    // Base64 sizes: 4KB -> 3KB, 8KB -> 6KB, 12KB -> 9KB
    const files = [
      { filename: "img1.png", content: "x".repeat(4 * 1024) },
      { filename: "img2.jpg", content: "y".repeat(8 * 1024) },
      { filename: "img3.gif", content: "z".repeat(12 * 1024) },
    ]
    const result = formatPromptTooLargeError(files)

    expect(result).toInclude("img1.png (3 KB)")
    expect(result).toInclude("img2.jpg (6 KB)")
    expect(result).toInclude("img3.gif (9 KB)")
  })
})

describe("buildIssuePrompt", () => {
  test("builds prompt with title and body", () => {
    const result = buildIssuePrompt({
      number: 42,
      title: "Fix login bug",
      body: "Users cannot log in with SSO.",
    })
    expect(result).toBe("Issue #42: Fix login bug\n\nUsers cannot log in with SSO.")
  })

  test("uses fallback when body is null", () => {
    const result = buildIssuePrompt({
      number: 1,
      title: "No body issue",
      body: null,
    })
    expect(result).toInclude("No description provided.")
    expect(result).toStartWith("Issue #1: No body issue")
  })

  test("uses fallback when body is undefined", () => {
    const result = buildIssuePrompt({
      number: 1,
      title: "No body issue",
    })
    expect(result).toInclude("No description provided.")
  })

  test("uses fallback when body is empty string", () => {
    const result = buildIssuePrompt({
      number: 5,
      title: "Empty body",
      body: "",
    })
    expect(result).toInclude("No description provided.")
  })

  test("includes labels from string array", () => {
    const result = buildIssuePrompt({
      number: 10,
      title: "Labeled issue",
      body: "Some body",
      labels: ["bug", "priority"],
    })
    expect(result).toInclude("Labels: bug, priority")
  })

  test("includes labels from object array", () => {
    const result = buildIssuePrompt({
      number: 10,
      title: "Labeled issue",
      body: "Some body",
      labels: [{ name: "enhancement" }, { name: "help wanted" }],
    })
    expect(result).toInclude("Labels: enhancement, help wanted")
  })

  test("handles mixed label types (string and object)", () => {
    const result = buildIssuePrompt({
      number: 10,
      title: "Mixed labels",
      body: "Body",
      labels: ["bug", { name: "urgent" }],
    })
    expect(result).toInclude("Labels: bug, urgent")
  })

  test("omits labels line when labels array is empty", () => {
    const result = buildIssuePrompt({
      number: 3,
      title: "No labels",
      body: "Body text",
      labels: [],
    })
    expect(result).not.toInclude("Labels:")
    expect(result).toBe("Issue #3: No labels\n\nBody text")
  })

  test("omits labels line when labels is undefined", () => {
    const result = buildIssuePrompt({
      number: 3,
      title: "No labels",
      body: "Body text",
    })
    expect(result).not.toInclude("Labels:")
  })

  test("filters out labels with missing name", () => {
    const result = buildIssuePrompt({
      number: 7,
      title: "Partial labels",
      body: "Body",
      labels: [{ name: "valid" }, { name: undefined } as any, { name: "" }],
    })
    expect(result).toInclude("Labels: valid")
  })

  test("preserves markdown formatting in body", () => {
    const body = "## Steps to reproduce\n\n1. Open the app\n2. Click login\n\n```js\nconsole.log('test')\n```"
    const result = buildIssuePrompt({
      number: 99,
      title: "Markdown body",
      body,
    })
    expect(result).toInclude("## Steps to reproduce")
    expect(result).toInclude("```js")
  })
})
