import type { Session } from "@opencode-ai/sdk/v2"

export type SessionNode = {
  session: Session
  depth: number
  prefix: string
}

export function buildSessionTree(sessions: Session[]): SessionNode[] {
  const children = new Map<string | undefined, Session[]>()
  for (const s of sessions) {
    const pid = s.parentID
    if (!children.has(pid)) children.set(pid, [])
    children.get(pid)!.push(s)
  }

  // sort each group by updated time descending
  for (const group of children.values()) {
    group.sort((a, b) => b.time.updated - a.time.updated)
  }

  const result: SessionNode[] = []

  function walk(id: string | undefined, depth: number, lines: boolean[]) {
    const group = children.get(id)
    if (!group) return
    for (let i = 0; i < group.length; i++) {
      const s = group[i]
      const last = i === group.length - 1
      let prefix = ""
      if (depth > 0) {
        // build continuation lines for ancestors
        for (let d = 0; d < depth - 1; d++) {
          prefix += lines[d] ? "│ " : "  "
        }
        prefix += last ? "└─" : "├─"
      }
      result.push({ session: s, depth, prefix })
      walk(s.id, depth + 1, [...lines, !last])
    }
  }

  walk(undefined, 0, [])
  return result
}
