import { MessageV2 } from "./message-v2"

export const ResumeError = "Tool execution was interrupted by server restart"
export const ResumeAbortError = "Tool execution aborted"
export const ResumePrompt =
  "Your last response was interrupted by an OpenCode server restart. Continue from the latest context without repeating completed work."

export type ResumeMatch = {
  assistant: MessageV2.Assistant
  user: MessageV2.User
}

function interrupted(item: MessageV2.WithParts) {
  if (item.info.role !== "assistant") return false
  if (MessageV2.AbortedError.isInstance(item.info.error)) return true
  return item.parts.some(
    (part) =>
      part.type === "tool" &&
      part.state.status === "error" &&
      (part.state.error === ResumeError || part.state.error === ResumeAbortError),
  )
}

export function pickResume(input: MessageV2.WithParts[]) {
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
