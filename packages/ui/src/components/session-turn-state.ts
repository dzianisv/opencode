import type { AssistantMessage, Part as PartType } from "@opencode-ai/sdk/v2/client"

const hidden = new Set(["todowrite", "todoread"])
const shown = new Set(["compaction"])

export function partState(part: PartType, show: boolean) {
  if (part.type === "tool") {
    if (hidden.has(part.tool)) return
    if (part.tool === "question" && (part.state.status === "pending" || part.state.status === "running")) return
    return "visible" as const
  }
  if (part.type === "text") return part.text?.trim() ? ("visible" as const) : undefined
  if (part.type === "reasoning") {
    if (show && part.text?.trim()) return "visible" as const
    return
  }
  if (shown.has(part.type)) return "visible" as const
  return
}

type AbortErr = Extract<NonNullable<AssistantMessage["error"]>, { name: "MessageAbortedError" }>

export function visible(messages: readonly AssistantMessage[], parts: Record<string, readonly PartType[] | undefined> | undefined, show: boolean) {
  return messages.reduce((count, message) => {
    const items = Array.isArray(parts?.[message.id]) ? parts[message.id]! : []
    return count + items.filter((part) => partState(part, show) === "visible").length
  }, 0)
}

export function abortCard(
  messages: readonly AssistantMessage[],
  parts: Record<string, readonly PartType[] | undefined> | undefined,
  show: boolean,
) {
  const match = messages.findLast(
    (message): message is AssistantMessage & { error: AbortErr } =>
      message.error?.name === "MessageAbortedError" && typeof message.time.completed === "number",
  )
  if (!match) return
  if (visible(messages, parts, show) > 0) return
  return match.error
}
