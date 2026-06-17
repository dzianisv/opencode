import z from "zod"
import { Hono } from "hono"
import { describeRoute, resolver } from "hono-openapi"
import { streamSSE } from "hono/streaming"
import { eq } from "drizzle-orm"
import * as Log from "@opencode-ai/core/util/log"
import { BusEvent } from "@/bus/bus-event"
import { Bus } from "@/bus"
import { GlobalBus, type GlobalEvent } from "@/bus/global"
import { Instance } from "@/project/instance"
import type { SessionID } from "@/session/schema"
import { SessionTable } from "@/session/session.sql"
import { Database } from "@/storage/db"
import { AsyncQueue } from "@/util/queue"

const log = Log.create({ service: "server" })

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

export const EventRoutes = () =>
  new Hono().get(
    "/event",
    describeRoute({
      summary: "Subscribe to events",
      description: "Get events",
      operationId: "event.subscribe",
      responses: {
        200: {
          description: "Event stream",
          content: {
            "text/event-stream": {
              schema: resolver(
                z.union(BusEvent.payloads()).meta({
                  ref: "Event",
                }),
              ),
            },
          },
        },
      },
    }),
    async (c) => {
      log.info("event connected")
      c.header("Cache-Control", "no-cache, no-transform")
      c.header("X-Accel-Buffering", "no")
      c.header("X-Content-Type-Options", "nosniff")
      return streamSSE(c, async (stream) => {
        const q = new AsyncQueue<string | null>()
        let done = false
        const directory = Instance.directory
        const roots = new Map<string, string>()

        q.push(
          JSON.stringify({
            id: Bus.createID(),
            type: "server.connected",
            properties: {},
          }),
        )

        // Send heartbeat every 10s to prevent stalled proxy streams.
        const heartbeat = setInterval(() => {
          q.push(
            JSON.stringify({
              id: Bus.createID(),
              type: "server.heartbeat",
              properties: {},
            }),
          )
        }, 10_000)

        const stop = () => {
          if (done) return
          done = true
          clearInterval(heartbeat)
          GlobalBus.off("event", globalHandler)
          unsub()
          q.push(null)
          log.info("event disconnected")
        }

        const unsub = Bus.subscribeAll((event) => {
          q.push(JSON.stringify(event))
          if (event.type === Bus.InstanceDisposed.type) {
            stop()
          }
        })

        const globalHandler = (event: GlobalEvent) => {
          if (done || event.directory === directory) return
          const sessionID = sessionIDOf(event.payload)
          if (!sessionID) return
          const root = rootDirectoryOf(sessionID, roots)
          if (root !== directory) return
          q.push(JSON.stringify(event.payload))
        }
        GlobalBus.on("event", globalHandler)

        stream.onAbort(stop)

        try {
          for await (const data of q) {
            if (data === null) return
            await stream.writeSSE({ data })
          }
        } finally {
          stop()
        }
      })
    },
  )
