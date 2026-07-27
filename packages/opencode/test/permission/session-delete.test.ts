import { expect } from "bun:test"
import { PermissionV1 } from "@opencode-ai/core/v1/permission"
import { Database } from "@opencode-ai/core/database/database"
import { SessionProjector } from "@opencode-ai/core/session/projector"
import { SessionTable } from "@opencode-ai/core/session/sql"
import { CrossSpawnSpawner } from "@opencode-ai/core/cross-spawn-spawner"
import { eq } from "drizzle-orm"
import { Cause, Deferred, Effect, Exit, Fiber, Layer } from "effect"
import { EventV2Bridge } from "@/event-v2-bridge"
import { Permission } from "@/permission"
import { Session } from "@/session/session"
import { Storage } from "@/storage/storage"
import { RuntimeFlags } from "@/effect/runtime-flags"
import { BackgroundJob } from "@/background/job"
import { SessionID } from "@/session/schema"
import { testInstanceStoreLayer } from "../fixture/fixture"
import { pollWithTimeout, testEffect } from "../lib/effect"

const events = EventV2Bridge.defaultLayer
const env = Layer.mergeAll(
  Permission.layer.pipe(Layer.provide(Database.defaultLayer), Layer.provide(events)),
  Session.layer.pipe(
    Layer.provide(Storage.defaultLayer),
    Layer.provide(Database.defaultLayer),
    Layer.provide(events),
    Layer.provide(SessionProjector.defaultLayer),
    Layer.provide(RuntimeFlags.layer({ experimentalWorkspaces: false })),
    Layer.provide(BackgroundJob.defaultLayer),
  ),
  events,
  Database.defaultLayer,
  CrossSpawnSpawner.defaultLayer,
  testInstanceStoreLayer,
)
const it = testEffect(env)

const askForever = (sessionID: SessionID, id: PermissionV1.ID) =>
  Effect.gen(function* () {
    const permission = yield* Permission.Service
    return yield* permission.ask({
      id,
      sessionID,
      permission: "bash",
      patterns: ["ls"],
      metadata: {},
      always: [],
      ruleset: [{ permission: "bash", pattern: "*", action: "ask" }],
    })
  }).pipe(Effect.forkScoped)

const list = () =>
  Effect.gen(function* () {
    const permission = yield* Permission.Service
    return yield* permission.list()
  })

const waitForPending = (count: number) =>
  pollWithTimeout(
    Effect.map(list(), (items) => (items.length === count ? items : undefined)),
    `timed out waiting for ${count} pending permission request(s)`,
  )

it.instance(
  "session delete - removes pending permission requests from list",
  () =>
    Effect.gen(function* () {
      const session = yield* Session.Service
      const info = yield* session.create({})
      const fiber = yield* askForever(info.id, PermissionV1.ID.make("per_delete_list"))

      expect(yield* waitForPending(1)).toHaveLength(1)
      yield* session.remove(info.id)
      yield* waitForPending(0)

      yield* Fiber.await(fiber)
    }),
  { git: true },
  { timeout: 30000 },
)

it.instance(
  "session delete - terminates the pending ask fiber with RejectedError",
  () =>
    Effect.gen(function* () {
      const session = yield* Session.Service
      const info = yield* session.create({})
      const fiber = yield* askForever(info.id, PermissionV1.ID.make("per_delete_fiber"))

      yield* waitForPending(1)
      yield* session.remove(info.id)

      const exit = yield* Fiber.await(fiber).pipe(
        Effect.timeoutOrElse({
          duration: "5 seconds",
          orElse: () => Effect.fail(new Error("pending ask fiber never terminated after session delete")),
        }),
      )
      expect(Exit.isFailure(exit)).toBe(true)
      if (!Exit.isFailure(exit)) return
      expect(Cause.squash(exit.cause)).toBeInstanceOf(PermissionV1.RejectedError)
    }),
  { git: true },
  { timeout: 30000 },
)

it.instance(
  "session delete - publishes replied reject for the orphaned request",
  () =>
    Effect.gen(function* () {
      const bridge = yield* EventV2Bridge.Service
      const session = yield* Session.Service
      const info = yield* session.create({})
      const fiber = yield* askForever(info.id, PermissionV1.ID.make("per_delete_event"))

      yield* waitForPending(1)

      const seen = yield* Deferred.make<{
        sessionID: SessionID
        requestID: PermissionV1.ID
        reply: PermissionV1.Reply
      }>()
      const unsub = yield* bridge.listen((event) => {
        if (event.type === Permission.Event.Replied.type)
          Deferred.doneUnsafe(
            seen,
            Effect.succeed(event.data as { sessionID: SessionID; requestID: PermissionV1.ID; reply: PermissionV1.Reply }),
          )
        return Effect.void
      })
      yield* Effect.addFinalizer(() => unsub)

      yield* session.remove(info.id)

      expect(
        yield* Deferred.await(seen).pipe(
          Effect.timeoutOrElse({
            duration: "5 seconds",
            orElse: () => Effect.fail(new Error("timed out waiting for permission replied event")),
          }),
        ),
      ).toEqual({
        sessionID: info.id,
        requestID: PermissionV1.ID.make("per_delete_event"),
        reply: "reject",
      })

      yield* Fiber.await(fiber)
    }),
  { git: true },
  { timeout: 30000 },
)

it.instance(
  "session delete - purges pending permissions on child sessions",
  () =>
    Effect.gen(function* () {
      const session = yield* Session.Service
      const parent = yield* session.create({})
      const child = yield* session.create({ parentID: parent.id })
      const fiber = yield* askForever(child.id, PermissionV1.ID.make("per_delete_child"))

      expect(yield* waitForPending(1)).toMatchObject([{ sessionID: child.id }])
      yield* session.remove(parent.id)
      yield* waitForPending(0)

      const exit = yield* Fiber.await(fiber).pipe(
        Effect.timeoutOrElse({
          duration: "5 seconds",
          orElse: () => Effect.fail(new Error("child pending ask fiber never terminated after parent delete")),
        }),
      )
      expect(Exit.isFailure(exit)).toBe(true)
      if (!Exit.isFailure(exit)) return
      expect(Cause.squash(exit.cause)).toBeInstanceOf(PermissionV1.RejectedError)
    }),
  { git: true },
  { timeout: 30000 },
)

it.instance(
  "session delete - gc sweep drops orphans deleted out of band",
  () =>
    Effect.gen(function* () {
      const session = yield* Session.Service
      const info = yield* session.create({})
      const fiber = yield* askForever(info.id, PermissionV1.ID.make("per_delete_gc"))

      yield* waitForPending(1)

      // Bypass Session.remove entirely so no session.deleted event is published:
      // only the gc sweep inside list() can notice this orphan.
      yield* (yield* Database.Service).db.delete(SessionTable).where(eq(SessionTable.id, info.id)).run().pipe(Effect.orDie)

      yield* waitForPending(0)

      const exit = yield* Fiber.await(fiber).pipe(
        Effect.timeoutOrElse({
          duration: "5 seconds",
          orElse: () => Effect.fail(new Error("orphaned ask fiber never terminated after gc sweep")),
        }),
      )
      expect(Exit.isFailure(exit)).toBe(true)
      if (!Exit.isFailure(exit)) return
      expect(Cause.squash(exit.cause)).toBeInstanceOf(PermissionV1.RejectedError)
    }),
  { git: true },
  { timeout: 30000 },
)

it.instance(
  "session delete - gc sweep leaves requests for never-persisted sessions alone",
  () =>
    Effect.gen(function* () {
      const permission = yield* Permission.Service
      const fiber = yield* askForever(SessionID.make("session_synthetic"), PermissionV1.ID.make("per_delete_synth"))

      yield* waitForPending(1)
      // The sweep runs on every list() call; a synthetic session that never had a
      // row must survive repeated sweeps, otherwise every synthetic-ID test breaks.
      for (let i = 0; i < 5; i++) {
        expect(yield* list()).toHaveLength(1)
      }

      yield* permission.reply({ requestID: PermissionV1.ID.make("per_delete_synth"), reply: "reject" })
      yield* Fiber.await(fiber)
    }),
  { git: true },
  { timeout: 30000 },
)
