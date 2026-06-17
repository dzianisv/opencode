import { Bus } from "@/bus"
import { GlobalBus, type GlobalEvent } from "@/bus/global"
import * as InstanceState from "@/effect/instance-state"
import { SessionTable } from "@/session/session.sql"
import type { SessionID } from "@/session/schema"
import { Database } from "@/storage/db"
import { eq } from "drizzle-orm"
import * as Log from "@opencode-ai/core/util/log"
import { Effect, Queue, Schema } from "effect"
import * as Stream from "effect/Stream"
import { HttpServerResponse } from "effect/unstable/http"
import { HttpApi, HttpApiBuilder, HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "effect/unstable/httpapi"
import * as Sse from "effect/unstable/encoding/Sse"

const log = Log.create({ service: "server" })

type EventPayload = {
  id: string
  type: string
  properties: unknown
}

export const EventPaths = {
  event: "/event",
} as const

export const EventApi = HttpApi.make("event").add(
  HttpApiGroup.make("event")
    .add(
      HttpApiEndpoint.get("subscribe", EventPaths.event, {
        success: Schema.String.pipe(HttpApiSchema.asText({ contentType: "text/event-stream" })),
      }).annotateMerge(
        OpenApi.annotations({
          identifier: "event.subscribe",
          summary: "Subscribe to events",
          description: "Get events",
        }),
      ),
    )
    .annotateMerge(OpenApi.annotations({ title: "event", description: "Instance event stream route." })),
)

function eventData(data: unknown): Sse.Event {
  return {
    _tag: "Event",
    event: "message",
    id: undefined,
    data: JSON.stringify(data),
  }
}

function rootDirectoryOf(sessionID: string, cache: Map<string, string>) {
  const seen: string[] = []
  let current: string | undefined = sessionID
  while (current) {
    const cached = cache.get(current)
    if (cached) return cached
    if (seen.includes(current)) return
    seen.push(current)
    const row = Database.use((db) =>
      db
        .select({ directory: SessionTable.directory, parent_id: SessionTable.parent_id })
        .from(SessionTable)
        .where(eq(SessionTable.id, current as SessionID))
        .get(),
    )
    if (!row) return
    if (!row.parent_id) {
      for (const id of seen) cache.set(id, row.directory)
      return row.directory
    }
    current = row.parent_id
  }
}

function sessionIDOf(payload: unknown) {
  const sessionID = (payload as { properties?: { sessionID?: unknown } } | undefined)?.properties?.sessionID
  return typeof sessionID === "string" ? sessionID : undefined
}

function crossDirectoryStream(directory: string): Stream.Stream<EventPayload> {
  const roots = new Map<string, string>()
  return Stream.callback<EventPayload>((queue) => {
    const handler = (event: GlobalEvent) => {
      if (event.directory === directory) return
      const sessionID = sessionIDOf(event.payload)
      if (!sessionID) return
      const root = rootDirectoryOf(sessionID, roots)
      if (root === directory) Queue.offerUnsafe(queue, event.payload as EventPayload)
    }
    return Effect.acquireRelease(
      Effect.sync(() => GlobalBus.on("event", handler)),
      () => Effect.sync(() => GlobalBus.off("event", handler)),
    )
  })
}

function eventResponse(bus: Bus.Interface, directory: string) {
  const events = bus
    .subscribeAll()
    .pipe(Stream.merge(crossDirectoryStream(directory), { haltStrategy: "left" }))
    .pipe(Stream.takeUntil((event) => event.type === Bus.InstanceDisposed.type))
  const heartbeat = Stream.tick("10 seconds").pipe(
    Stream.drop(1),
    Stream.map(() => ({ id: Bus.createID(), type: "server.heartbeat", properties: {} })),
  )

  log.info("event connected")
  return HttpServerResponse.stream(
    Stream.make({ id: Bus.createID(), type: "server.connected", properties: {} }).pipe(
      Stream.concat(events.pipe(Stream.merge(heartbeat, { haltStrategy: "left" }))),
      Stream.map(eventData),
      Stream.pipeThroughChannel(Sse.encode()),
      Stream.encodeText,
      Stream.ensuring(Effect.sync(() => log.info("event disconnected"))),
    ),
    {
      contentType: "text/event-stream",
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        "X-Content-Type-Options": "nosniff",
      },
    },
  )
}

export const eventHandlers = HttpApiBuilder.group(EventApi, "event", (handlers) =>
  Effect.gen(function* () {
    const bus = yield* Bus.Service
    return handlers.handleRaw(
      "subscribe",
      Effect.fn("EventHttpApi.subscribe")(function* () {
        return eventResponse(bus, yield* InstanceState.directory)
      }),
    )
  }),
)
