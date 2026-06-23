import type { Assistant, User, WithParts } from "@opencode-ai/core/v1/session"
import { AbortedError } from "@opencode-ai/core/v1/session"

export const ResumeError = "Tool execution was interrupted by server restart"
export const ResumeAbortError = "Tool execution aborted"
export const ResumePrompt =
  "Your last response was interrupted by an OpenCode server restart. Continue from the latest context without repeating completed work."

export type ResumeMatch = {
  assistant: Assistant
  user: User
}

export type ResumeAction =
  | { type: "interrupted"; assistant: Assistant; user: User }
  | { type: "unanswered"; user: User }

function interrupted(item: WithParts) {
  if (item.info.role !== "assistant") return false
  if (AbortedError.isInstance(item.info.error)) return true
  return item.parts.some(
    (part) =>
      part.type === "tool" &&
      part.state.status === "error" &&
      (part.state.error === ResumeError || part.state.error === ResumeAbortError),
  )
}

/**
 * Unified picker: returns the single best recovery action for a session.
 *
 * Priority:
 *   1. **unanswered** – last message is a user message with no assistant reply
 *   2. **interrupted** – last assistant was interrupted with no subsequent user message
 */
export function pickAction(input: WithParts[]): ResumeAction | undefined {
  if (input.length === 0) return

  const last = input[input.length - 1]

  // Priority 1: trailing user message with no assistant reply
  if (last.info.role === "user") {
    return { type: "unanswered", user: last.info as User }
  }

  // Priority 2: interrupted assistant (existing pickResume logic)
  const match = pickResume(input)
  if (match) return { type: "interrupted", ...match }
}

export function pickResume(input: WithParts[]) {
  for (let i = input.length - 1; i >= 0; i--) {
    const item = input[i]
    if (item.info.role !== "assistant") continue
    if (typeof item.info.time.completed !== "number") continue
    if (!interrupted(item)) continue
    if (input.slice(i + 1).some((next) => next.info.role === "user")) continue

    for (let j = i - 1; j >= 0; j--) {
      const prev = input[j]
      if (prev.info.role !== "user") continue
      return {
        assistant: item.info,
        user: prev.info,
      } satisfies ResumeMatch
    }
  }
}
