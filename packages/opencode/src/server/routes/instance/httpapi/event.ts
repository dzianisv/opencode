import { Bus } from "@/bus"
import { GlobalBus, type GlobalEvent } from "@/bus/global"
import { Session } from "@/session/session"
import { SessionID } from "@/session/schema"
import * as InstanceState from "@/effect/instance-state"
import * as Log from "@opencode-ai/core/util/log"
import { Effect, Queue, Schema } from "effect"
import * as Stream from "effect/Stream"
import { HttpServerResponse } from "effect/unstable/http"
import { HttpApi, HttpApiBuilder, HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "effect/unstable/httpapi"
import * as Sse from "effect/unstable/encoding/Sse"

const log = Log.create({ service: "server" })

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

type Payload = { id: string; type: string; properties: unknown }

// Build a stream of cross-directory child-session events sourced from GlobalBus.
// Events whose directory matches the subscription instance are already delivered by the
// instance-scoped Bus.Service; only events from other directories are bridged here.
// Filtering is by session lineage: an event belongs to this subscription if the session's
// root ancestor is rooted in instanceDirectory. Global/instance events (no sessionID) are
// excluded — those are only relevant to their own instance.
function crossDirectoryStream(sessions: Session.Interface, instanceDirectory: string): Stream.Stream<Payload> {
  // Per-connection memoized lineage cache: maps sessionID → root directory.
  // Each session's ancestry is walked at most once; subsequent events are O(1).
  const rootDirCache = new Map<string, string>()

  const rootDirectoryOf = (sessionID: string): Effect.Effect<string | undefined> =>
    Effect.gen(function* () {
      const chain: string[] = []
      let current: string | undefined = sessionID
      let root: string | undefined = undefined
      while (current) {
        const cached = rootDirCache.get(current)
        if (cached !== undefined) {
          root = cached
          break
        }
        if (chain.includes(current)) break // cycle guard
        chain.push(current)
        const info = yield* sessions
          .get(SessionID.make(current))
          .pipe(Effect.catchCause(() => Effect.succeed(undefined)))
        if (!info) break
        if (!info.parentID) {
          root = info.directory
          break
        }
        current = info.parentID as string | undefined
      }
      if (root !== undefined) for (const id of chain) rootDirCache.set(id, root)
      return root
    })

  const sessionIDOf = (payload: Payload): string | undefined => {
    const sid = (payload.properties as { sessionID?: unknown } | undefined)?.sessionID
    return typeof sid === "string" ? sid : undefined
  }

  // Tap GlobalBus for events from directories other than the subscription instance.
  const rawGlobal = Stream.callback<GlobalEvent>((queue) => {
    const handler = (event: GlobalEvent) => {
      if (event.directory === instanceDirectory) return
      Queue.offerUnsafe(queue, event)
    }
    return Effect.acquireRelease(
      Effect.sync(() => GlobalBus.on("event", handler)),
      () => Effect.sync(() => GlobalBus.off("event", handler)),
    )
  })

  return rawGlobal.pipe(
    Stream.mapEffect((globalEvent) =>
      Effect.gen(function* () {
        const payload = globalEvent.payload as Payload | undefined
        if (!payload) return undefined
        const sessionID = sessionIDOf(payload)
        if (!sessionID) return undefined
        const root = yield* rootDirectoryOf(sessionID)
        return root === instanceDirectory ? payload : undefined
      }),
    ),
    Stream.filter((p): p is Payload => p !== undefined),
  )
}

function eventResponse(bus: Bus.Interface, sessions: Session.Interface, instanceDirectory: string) {
  const instanceEvents = bus.subscribeAll().pipe(Stream.takeUntil((event) => event.type === Bus.InstanceDisposed.type))
  const crossEvents = crossDirectoryStream(sessions, instanceDirectory)
  // Halt both streams when the instance is disposed (instanceEvents ends first via takeUntil).
  const allEvents = instanceEvents.pipe(Stream.merge(crossEvents, { haltStrategy: "left" }))
  const heartbeat = Stream.tick("10 seconds").pipe(
    Stream.drop(1),
    Stream.map(() => ({ id: Bus.createID(), type: "server.heartbeat", properties: {} })),
  )

  log.info("event connected")
  return HttpServerResponse.stream(
    Stream.make({ id: Bus.createID(), type: "server.connected", properties: {} }).pipe(
      Stream.concat(allEvents.pipe(Stream.merge(heartbeat, { haltStrategy: "left" }))),
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
    const sessions = yield* Session.Service
    return handlers.handleRaw(
      "subscribe",
      Effect.fn("EventHttpApi.subscribe")(function* () {
        const directory = yield* InstanceState.directory
        return eventResponse(bus, sessions, directory)
      }),
    )
  }),
)
