import { expect, test } from "bun:test"
import { archiveJsonl, parseArchiveJsonl } from "../../src/cli/cmd/session-offload"
import { SessionID } from "../../src/session/schema"

const header = JSON.stringify({
  type: "header",
  format: "opencode-session-offload",
  version: 1,
  sessionID: "ses_archive",
})

const session = JSON.stringify({
  type: "session",
  info: {
    id: "ses_archive",
    slug: "archive",
    projectID: "global",
    directory: "/tmp/archive",
    title: "Archived session",
    version: "1.0.0",
    time: { created: 1, updated: 1 },
  },
})

test("parses a minimal session archive", () => {
  const archive = parseArchiveJsonl(`${header}\n${session}\n`)

  expect(archive.info.id).toBe(SessionID.make("ses_archive"))
  expect(archive.info.title).toBe("Archived session")
  expect(archive.messages).toEqual([])
  expect(archive.sessionMessages).toEqual([])
})

test("round trips a transcript and todo", () => {
  const message = JSON.stringify({
    type: "message",
    info: {
      id: "msg_user",
      sessionID: "ses_archive",
      role: "user",
      time: { created: 1 },
      agent: "build",
      model: { providerID: "test", modelID: "test" },
    },
    parts: [{ id: "prt_user", sessionID: "ses_archive", messageID: "msg_user", type: "text", text: "hello" }],
  })
  const todo = JSON.stringify({ type: "todo", todo: { content: "do thing", status: "pending", priority: "high" } })
  const archive = parseArchiveJsonl(`${header}\n${session}\n${message}\n${todo}\n`)

  expect(parseArchiveJsonl(archiveJsonl(archive))).toEqual(archive)
})

test("rejects an event sequence without events", () => {
  const eventSequence = JSON.stringify({ type: "event-sequence", seq: 0 })

  expect(() => parseArchiveJsonl(`${header}\n${session}\n${eventSequence}\n`)).toThrow(
    "Archive event sequence has no events",
  )
})

test("rejects mismatched session IDs", () => {
  const otherHeader = JSON.stringify({
    type: "header",
    format: "opencode-session-offload",
    version: 1,
    sessionID: "ses_other",
  })

  expect(() => parseArchiveJsonl(`${otherHeader}\n${session}\n`)).toThrow("Archive header session ID does not match session record")
})
