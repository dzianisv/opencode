import { Session } from "@/session/session"
import { Todo } from "@/session/todo"
import { SessionID } from "@/session/schema"
import { Database } from "@opencode-ai/core/database/database"
import { EventV2 } from "@opencode-ai/core/event"
import { EventSequenceTable, EventTable } from "@opencode-ai/core/event/sql"
import { FSUtil } from "@opencode-ai/core/fs-util"
import { Prompt } from "@opencode-ai/core/session/prompt"
import { SessionInput } from "@opencode-ai/core/session/input"
import { SessionMessage } from "@opencode-ai/core/session/message"
import { MessageTable, PartTable, SessionInputTable, SessionMessageTable, SessionTable, TodoTable } from "@opencode-ai/core/session/sql"
import { SessionV1 } from "@opencode-ai/core/v1/session"
import { and, asc, desc, eq, inArray, lt, notInArray, sql } from "drizzle-orm"
import { Effect, Schema } from "effect"
import { EOL } from "os"
import path from "path"
import type { Argv } from "yargs"
import type { InstanceContext } from "@/project/instance-context"
import { InstanceRef } from "@/effect/instance-ref"
import { CliError, effectCmd, fail } from "../effect-cmd"

const Header = Schema.Struct({
  type: Schema.Literal("header"),
  format: Schema.Literal("opencode-session-offload"),
  version: Schema.Literal(1),
  sessionID: SessionID,
})

const SessionRecord = Schema.Struct({
  type: Schema.Literal("session"),
  info: Session.Info,
})

const MessageRecord = Schema.Struct({
  type: Schema.Literal("message"),
  info: SessionV1.Info,
  parts: Schema.Array(SessionV1.Part),
})

const TodoRecord = Schema.Struct({
  type: Schema.Literal("todo"),
  todo: Todo.Info,
})

const SessionMessageRecord = Schema.Struct({
  type: Schema.Literal("session-message"),
  id: SessionMessage.ID,
  messageType: Schema.String,
  seq: Schema.Int,
  timeCreated: Schema.Int,
  data: Schema.Record(Schema.String, Schema.Unknown),
})

const SessionInputRecord = Schema.Struct({
  type: Schema.Literal("session-input"),
  id: SessionMessage.ID,
  prompt: Schema.Record(Schema.String, Schema.Unknown),
  delivery: Schema.String,
  admittedSeq: Schema.Int,
  promotedSeq: Schema.optional(Schema.Int),
  timeCreated: Schema.Int,
})

const EventSequenceRecord = Schema.Struct({
  type: Schema.Literal("event-sequence"),
  seq: Schema.Int,
})

const EventRecord = Schema.Struct({
  type: Schema.Literal("event"),
  id: EventV2.ID,
  eventType: Schema.String,
  seq: Schema.Int,
  data: Schema.Record(Schema.String, Schema.Unknown),
})

const RecordType = Schema.Struct({ type: Schema.String })
const decodeHeader = Schema.decodeUnknownSync(Header)
const decodeSessionRecord = Schema.decodeUnknownSync(SessionRecord)
const decodeMessageRecord = Schema.decodeUnknownSync(MessageRecord)
const decodeTodoRecord = Schema.decodeUnknownSync(TodoRecord)
const decodeSessionMessageRecord = Schema.decodeUnknownSync(SessionMessageRecord)
const decodeSessionInputRecord = Schema.decodeUnknownSync(SessionInputRecord)
const decodeEventSequenceRecord = Schema.decodeUnknownSync(EventSequenceRecord)
const decodeEventRecord = Schema.decodeUnknownSync(EventRecord)
const decodeRecordType = Schema.decodeUnknownSync(RecordType)
const decodeSession = Schema.decodeUnknownSync(Session.Info)
const decodeSessionMessage = Schema.decodeUnknownSync(SessionMessage.Message)
const decodePrompt = Schema.decodeUnknownSync(Prompt)
const decodeDelivery = Schema.decodeUnknownSync(SessionInput.Delivery)

export type Archive = {
  info: Session.Info
  messages: SessionV1.WithParts[]
  todos: Todo.Info[]
  sessionMessages: Array<{
    id: SessionMessage.ID
    messageType: string
    seq: number
    timeCreated: number
    data: Record<string, unknown>
  }>
  sessionInputs: Array<{
    id: SessionMessage.ID
    prompt: Record<string, unknown>
    delivery: string
    admittedSeq: number
    promotedSeq?: number
    timeCreated: number
  }>
  eventSequence?: { seq: number }
  events: Array<{ id: EventV2.ID; eventType: string; seq: number; data: Record<string, unknown> }>
}

type Options = { export?: string; import?: string; olderThan?: number; delete?: boolean; vacuum?: boolean }

export function archiveJsonl(archive: Archive): string {
  return [
    JSON.stringify({
      type: "header",
      format: "opencode-session-offload",
      version: 1,
      sessionID: archive.info.id,
    }),
    JSON.stringify({ type: "session", info: archive.info }),
    ...archive.messages.map((message) => JSON.stringify({ type: "message", ...message })),
    ...archive.todos.map((todo) => JSON.stringify({ type: "todo", todo })),
    ...archive.sessionMessages.map((message) => JSON.stringify({ type: "session-message", ...message })),
    ...archive.sessionInputs.map((input) => JSON.stringify({ type: "session-input", ...input })),
    ...(archive.eventSequence ? [JSON.stringify({ type: "event-sequence", ...archive.eventSequence })] : []),
    ...archive.events.map((event) => JSON.stringify({ type: "event", ...event })),
  ].join(EOL) + EOL
}

export function parseArchiveJsonl(text: string): Archive {
  const lines = text.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length === 0) throw new Error("Archive is empty")

  const records = lines.map((line, index) => {
    try {
      return JSON.parse(line) as unknown
    } catch (error) {
      throw new Error(`Invalid JSON on line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`)
    }
  })
  const header = decodeHeader(records[0])
  let info: Session.Info | undefined
  const messages: SessionV1.WithParts[] = []
  const todos: Todo.Info[] = []
  const sessionMessages: Archive["sessionMessages"] = []
  const sessionInputs: Archive["sessionInputs"] = []
  const events: Archive["events"] = []
  let eventSequence: Archive["eventSequence"]

  for (const [index, record] of records.slice(1).entries()) {
    const line = index + 2
    const type = decodeRecordType(record).type
    if (type === "session") {
      if (info) throw new Error(`Duplicate session record on line ${line}`)
      info = decodeSessionRecord(record).info as Session.Info
      continue
    }
    if (type === "message") {
      const message = decodeMessageRecord(record)
      messages.push({ info: message.info as SessionV1.Info, parts: message.parts as SessionV1.Part[] })
      continue
    }
    if (type === "todo") {
      todos.push(decodeTodoRecord(record).todo)
      continue
    }
    if (type === "session-message") {
      const message = decodeSessionMessageRecord(record)
      decodeSessionMessage({ ...message.data, id: message.id, type: message.messageType })
      sessionMessages.push(message)
      continue
    }
    if (type === "session-input") {
      const input = decodeSessionInputRecord(record)
      decodePrompt(input.prompt)
      decodeDelivery(input.delivery)
      sessionInputs.push(input)
      continue
    }
    if (type === "event-sequence") {
      if (eventSequence) throw new Error(`Duplicate event sequence record on line ${line}`)
      eventSequence = decodeEventSequenceRecord(record)
      continue
    }
    if (type === "event") {
      const event = decodeEventRecord(record)
      events.push(event)
      continue
    }
    throw new Error(`Unknown archive record type on line ${line}: ${type}`)
  }

  if (!info) throw new Error("Archive has no session record")
  if (header.sessionID !== info.id) throw new Error("Archive header session ID does not match session record")
  for (const message of messages) {
    if (message.info.sessionID !== info.id) throw new Error(`Message ${message.info.id} belongs to another session`)
    for (const part of message.parts) {
      if (part.sessionID !== info.id || part.messageID !== message.info.id)
        throw new Error(`Part ${part.id} does not belong to message ${message.info.id}`)
    }
  }
  if (!eventSequence && events.length > 0) throw new Error("Archive events have no event sequence record")
  if (eventSequence && events.length === 0) throw new Error("Archive event sequence has no events")
  for (const [index, event] of events.entries()) {
    if (event.seq !== index) throw new Error(`Event sequence mismatch at index ${index}: expected ${index}, got ${event.seq}`)
    if (event.data.sessionID !== info.id) throw new Error(`Event ${event.id} belongs to another session`)
  }
  if (eventSequence && eventSequence.seq !== events.length - 1) throw new Error("Event sequence does not match final event")
  return { info, messages, todos, sessionMessages, sessionInputs, eventSequence, events }
}

export const SessionOffloadCommand = effectCmd<Options, void>({
  command: "session-offload",
  describe: "export session history as JSONL or import an archived session",
  instance: (args: Options) => Boolean(args.import),
  builder: (yargs): Argv<Options> =>
    yargs
      .option("export", {
        describe: "directory for one <sessionID>.jsonl archive per local session",
        type: "string",
      })
      .option("import", {
        describe: "path to one <sessionID>.jsonl archive",
        type: "string",
      })
      .option("older-than", {
        describe: "only export sessions inactive for this many days",
        type: "number",
      })
      .option("delete", {
        describe: "delete exported sessions after archive verification; requires --older-than",
        type: "boolean",
      })
      .option("vacuum", {
        describe: "reclaim physical database space after deletion; requires --delete and exclusive database access",
        type: "boolean",
      })
      .check((args: Options) => {
        if (Boolean(args.export) === Boolean(args.import)) return "Specify exactly one of --export or --import"
        if (args.delete && (!args.export || args.olderThan === undefined))
          return "--delete requires --export and --older-than"
        if (args.vacuum && !args.delete) return "--vacuum requires --delete"
        if (args.olderThan !== undefined && (!Number.isFinite(args.olderThan) || args.olderThan < 0))
          return "--older-than must be a non-negative number of days"
        return true
      }),
  handler: Effect.fn("Cli.sessionOffload")(function* (args: Options) {
    if (args.export) return yield* exportArchives(args.export, args)
    if (args.import) {
      const ctx = yield* InstanceRef
      if (!ctx) return yield* Effect.die("InstanceRef not provided")
      return yield* importArchive(args.import, ctx)
    }
    return yield* fail("Specify exactly one of --export or --import")
  }),
})

const exportArchives = Effect.fn("Cli.sessionOffload.export")(function* (directory: string, options: Options) {
  const { db } = yield* Database.Service
  const fs = yield* FSUtil.Service
  const cutoff = options.olderThan === undefined ? undefined : Date.now() - options.olderThan * 24 * 60 * 60 * 1000
  const sessions = yield* db
    .select()
    .from(SessionTable)
    .where(cutoff === undefined ? undefined : lt(SessionTable.time_updated, cutoff))
    .orderBy(desc(SessionTable.time_updated), desc(SessionTable.id))
    .all()
    .pipe(Effect.orDie)
  const target = path.resolve(directory)
  yield* fs.ensureDir(target).pipe(Effect.mapError((error) => new CliError({ message: error.message })))

  const archived: SessionID[] = []
  let archiveBytes = 0
  for (const row of sessions) {
    const archive = yield* db
      .transaction((tx) => readArchive(tx as unknown as Database.Interface["db"], row.id))
      .pipe(Effect.orDie)
    if (!archive) continue
    const filename = `${archive.info.id}.jsonl`
    if (path.basename(filename) !== filename) return yield* fail(`Unsafe session ID: ${archive.info.id}`)
    const content = archiveJsonl(archive)
    const destination = path.join(target, filename)
    const temporary = `${destination}.tmp-${crypto.randomUUID()}`
    yield* fs.writeWithDirs(temporary, content).pipe(Effect.mapError((error) => new CliError({ message: error.message })))
    yield* fs.rename(temporary, destination).pipe(
      Effect.mapError((error) => new CliError({ message: error.message })),
      Effect.ensuring(fs.remove(temporary, { force: true }).pipe(Effect.ignore)),
    )
    const verified = yield* fs
      .readFileString(destination)
      .pipe(Effect.mapError((error) => new CliError({ message: `Failed to verify ${destination}: ${error.message}` })))
    const restored = yield* Effect.try({
      try: () => parseArchiveJsonl(verified),
      catch: (error) => new CliError({ message: `Failed to verify ${destination}: ${error instanceof Error ? error.message : String(error)}` }),
    })
    if (restored.info.id !== archive.info.id) return yield* fail(`Archive verification failed: ${destination}`)
    archiveBytes += Number(
      (yield* fs.stat(destination).pipe(Effect.mapError((error) => new CliError({ message: error.message })))).size,
    )
    archived.push(archive.info.id)
  }

  let deleted = 0
  if (options.delete && archived.length > 0) {
    if (cutoff === undefined) return yield* fail("--delete requires --older-than")
    yield* db
      .transaction(
        (tx) =>
          Effect.gen(function* () {
            const eligible = yield* tx
              .select({ id: SessionTable.id })
              .from(SessionTable)
              .where(and(inArray(SessionTable.id, archived), lt(SessionTable.time_updated, cutoff)))
              .all()
              .pipe(Effect.orDie)
            const ids = eligible.map((session) => session.id)
            if (ids.length === 0) return
            deleted = ids.length
            yield* tx
              .update(SessionTable)
              .set({ parent_id: null })
              .where(and(inArray(SessionTable.parent_id, ids), notInArray(SessionTable.id, ids)))
              .run()
              .pipe(Effect.orDie)
            yield* tx.delete(SessionTable).where(inArray(SessionTable.id, ids)).run().pipe(Effect.orDie)
            yield* tx.delete(EventSequenceTable).where(inArray(EventSequenceTable.aggregate_id, ids)).run().pipe(Effect.orDie)
          }),
        { behavior: "immediate" },
      )
      .pipe(Effect.orDie)
  }

  process.stdout.write(`Exported ${archived.length} session archives (${archiveBytes} archived bytes) to ${target}${EOL}`)
  if (options.delete) process.stdout.write(`Deleted ${deleted} archived sessions still inactive for ${options.olderThan} days${EOL}`)
  if (options.vacuum) {
    const before = Number(
      (yield* fs.stat(Database.path()).pipe(Effect.mapError((error) => new CliError({ message: error.message })))).size,
    )
    process.stdout.write(`Vacuuming ${Database.path()}. Stop every OpenCode process using this database first; active service may cause SQLITE_BUSY.${EOL}`)
    yield* db.run(sql`PRAGMA wal_checkpoint(TRUNCATE)`).pipe(Effect.orDie)
    yield* db.run(sql`VACUUM`).pipe(Effect.orDie)
    const after = Number(
      (yield* fs.stat(Database.path()).pipe(Effect.mapError((error) => new CliError({ message: error.message })))).size,
    )
    process.stdout.write(`Vacuum complete: database physical size changed from ${before} to ${after} bytes; reclaimed ${before - after} bytes${EOL}`)
  }
  const pageSize = yield* db
    .get<{ page_size: number }>(sql`PRAGMA page_size`)
    .pipe(
      Effect.mapError((error) => new CliError({ message: error.message })),
      Effect.flatMap((result) => (result ? Effect.succeed(result) : fail("Failed to read database page size"))),
    )
  const pageCount = yield* db
    .get<{ page_count: number }>(sql`PRAGMA page_count`)
    .pipe(
      Effect.mapError((error) => new CliError({ message: error.message })),
      Effect.flatMap((result) => (result ? Effect.succeed(result) : fail("Failed to read database page count"))),
    )
  const freelistCount = yield* db
    .get<{ freelist_count: number }>(sql`PRAGMA freelist_count`)
    .pipe(
      Effect.mapError((error) => new CliError({ message: error.message })),
      Effect.flatMap((result) => (result ? Effect.succeed(result) : fail("Failed to read database free pages"))),
    )
  const physicalBytes = Number(
    (yield* fs.stat(Database.path()).pipe(Effect.mapError((error) => new CliError({ message: error.message })))).size,
  )
  process.stdout.write(
    `Database: ${physicalBytes} physical bytes; ${pageSize.page_size} page size; ${pageCount.page_count} pages; ${freelistCount.freelist_count} free pages; ${pageSize.page_size * freelistCount.freelist_count} reusable bytes${EOL}`,
  )
})

const importArchive = Effect.fn("Cli.sessionOffload.import")(function* (file: string, ctx: InstanceContext) {
  const fs = yield* FSUtil.Service
  const { db } = yield* Database.Service
  const text = yield* fs
    .readFileString(file)
    .pipe(Effect.mapError((error) => new CliError({ message: `Failed to read ${file}: ${error.message}` })))
  const archive = yield* Effect.try({
    try: () => parseArchiveJsonl(text),
    catch: (error) => new CliError({ message: `Invalid session archive: ${error instanceof Error ? error.message : String(error)}` }),
  })
  const existing = yield* db
    .select({ id: SessionTable.id })
    .from(SessionTable)
    .where(eq(SessionTable.id, archive.info.id))
    .get()
    .pipe(Effect.orDie)
  if (existing) return yield* fail(`Session already exists: ${archive.info.id}`)
  const parent = archive.info.parentID
    ? yield* db
        .select({ id: SessionTable.id })
        .from(SessionTable)
        .where(eq(SessionTable.id, archive.info.parentID))
        .get()
        .pipe(Effect.orDie)
    : undefined

  const info = decodeSession({
    ...archive.info,
    projectID: ctx.project.id,
    workspaceID: undefined,
    parentID: parent?.id,
    share: undefined,
    directory: ctx.directory,
    path: path.relative(path.resolve(ctx.worktree), ctx.directory).replaceAll("\\", "/"),
  })
  const row = Session.toRow(info as Session.Info)
  yield* db
    .transaction(
      (tx) =>
        Effect.gen(function* () {
          yield* tx.insert(SessionTable).values(row).run().pipe(Effect.orDie)
          for (const message of archive.messages) {
            const { id, sessionID: _, ...data } = message.info
            yield* tx
              .insert(MessageTable)
              .values({ id, session_id: info.id, time_created: message.info.time.created, data })
              .run()
              .pipe(Effect.orDie)
            for (const part of message.parts) {
              const { id: partID, sessionID: _sessionID, messageID, ...partData } = part
              yield* tx
                .insert(PartTable)
                .values({ id: partID, message_id: messageID, session_id: info.id, data: partData })
                .run()
                .pipe(Effect.orDie)
            }
          }
          for (const message of archive.sessionMessages) {
            const encoded = Schema.encodeUnknownSync(SessionMessage.Message)(
              decodeSessionMessage({ ...message.data, id: message.id, type: message.messageType }),
            )
            const { id, type, ...data } = encoded
            yield* tx
              .insert(SessionMessageTable)
              .values([
                {
                  id: SessionMessage.ID.make(id),
                  session_id: info.id,
                  type,
                  seq: message.seq,
                  time_created: message.timeCreated,
                  data: data as never,
                },
              ])
              .run()
              .pipe(Effect.orDie)
          }
          for (const input of archive.sessionInputs) {
            yield* tx
              .insert(SessionInputTable)
              .values({
                id: input.id,
                session_id: info.id,
                prompt: Schema.encodeUnknownSync(Prompt)(decodePrompt(input.prompt)),
                delivery: decodeDelivery(input.delivery),
                admitted_seq: input.admittedSeq,
                promoted_seq: input.promotedSeq ?? null,
                time_created: input.timeCreated,
              })
              .run()
              .pipe(Effect.orDie)
          }
          if (archive.todos.length > 0) {
            yield* tx
              .insert(TodoTable)
              .values(
                archive.todos.map((todo, position) => ({
                  session_id: info.id,
                  content: todo.content,
                  status: todo.status,
                  priority: todo.priority,
                  position,
                })),
              )
              .run()
              .pipe(Effect.orDie)
          }
          if (!archive.eventSequence) return
          yield* tx
            .insert(EventSequenceTable)
            .values({ aggregate_id: info.id, seq: archive.eventSequence.seq, owner_id: null })
            .run()
            .pipe(Effect.orDie)
          for (const event of archive.events) {
            yield* tx
              .insert(EventTable)
              .values({
                id: event.id,
                aggregate_id: info.id,
                seq: event.seq,
                type: event.eventType,
                data: event.data,
              })
              .run()
              .pipe(Effect.orDie)
          }
        }),
      { behavior: "immediate" },
    )
    .pipe(Effect.orDie)
  process.stdout.write(`Imported session: ${info.id}${EOL}`)
})

const readMessages = Effect.fn("Cli.sessionOffload.readMessages")(function* (
  db: Database.Interface["db"],
  sessionID: SessionID,
) {
  const messages = yield* db
    .select()
    .from(MessageTable)
    .where(eq(MessageTable.session_id, sessionID))
    .orderBy(asc(MessageTable.time_created), asc(MessageTable.id))
    .all()
    .pipe(Effect.orDie)
  const parts = yield* db
    .select()
    .from(PartTable)
    .where(eq(PartTable.session_id, sessionID))
    .orderBy(asc(PartTable.message_id), asc(PartTable.id))
    .all()
    .pipe(Effect.orDie)
  const partsByMessage = new Map<string, SessionV1.Part[]>()
  for (const part of parts) {
    const value = { ...part.data, id: part.id, sessionID: part.session_id, messageID: part.message_id } as SessionV1.Part
    const current = partsByMessage.get(part.message_id)
    if (current) current.push(value)
    else partsByMessage.set(part.message_id, [value])
  }
  return messages.map((message) => ({
    info: { ...message.data, id: message.id, sessionID: message.session_id } as SessionV1.Info,
    parts: partsByMessage.get(message.id) ?? [],
  }))
})

const readArchive = Effect.fn("Cli.sessionOffload.readArchive")(function* (db: Database.Interface["db"], sessionID: SessionID) {
  const row = yield* db.select().from(SessionTable).where(eq(SessionTable.id, sessionID)).get().pipe(Effect.orDie)
  if (!row) return undefined
  const info = Session.fromRow(row)
  const [messages, todos, sessionMessages, sessionInputs, eventSequence, events] = yield* Effect.all(
    [
      readMessages(db, info.id),
      db
        .select({ content: TodoTable.content, status: TodoTable.status, priority: TodoTable.priority })
        .from(TodoTable)
        .where(eq(TodoTable.session_id, info.id))
        .orderBy(asc(TodoTable.position))
        .all()
        .pipe(Effect.orDie),
      db
        .select()
        .from(SessionMessageTable)
        .where(eq(SessionMessageTable.session_id, info.id))
        .orderBy(asc(SessionMessageTable.seq))
        .all()
        .pipe(Effect.orDie),
      db
        .select()
        .from(SessionInputTable)
        .where(eq(SessionInputTable.session_id, info.id))
        .orderBy(asc(SessionInputTable.admitted_seq))
        .all()
        .pipe(Effect.orDie),
      db
        .select()
        .from(EventSequenceTable)
        .where(eq(EventSequenceTable.aggregate_id, info.id))
        .get()
        .pipe(Effect.orDie),
      db
        .select()
        .from(EventTable)
        .where(eq(EventTable.aggregate_id, info.id))
        .orderBy(asc(EventTable.seq))
        .all()
        .pipe(Effect.orDie),
    ],
    { concurrency: "unbounded" },
  )
  return {
    info,
    messages,
    todos,
    sessionMessages: sessionMessages.map((message) => ({
      id: message.id,
      messageType: message.type,
      seq: message.seq,
      timeCreated: message.time_created,
      data: message.data,
    })),
    sessionInputs: sessionInputs.map((input) => ({
      id: input.id,
      prompt: input.prompt,
      delivery: input.delivery,
      admittedSeq: input.admitted_seq,
      ...(input.promoted_seq === null ? {} : { promotedSeq: input.promoted_seq }),
      timeCreated: input.time_created,
    })),
    ...(eventSequence && events.length > 0 ? { eventSequence: { seq: eventSequence.seq } } : {}),
    events: events.map((event) => ({ id: event.id, eventType: event.type, seq: event.seq, data: event.data })),
  }
})
