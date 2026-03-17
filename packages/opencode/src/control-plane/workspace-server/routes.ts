import { GlobalBus } from "../../bus/global"
import { Hono } from "hono"
import { streamSSE } from "hono/streaming"
import { Relay } from "../../server/relay"

type Event = { type: string; properties: Record<string, unknown> }
type Item = { directory?: string; payload: Event }

export function WorkspaceServerRoutes() {
  return new Hono().get("/event", async (c) => {
    c.header("X-Accel-Buffering", "no")
    c.header("X-Content-Type-Options", "nosniff")
    return streamSSE(c, async (stream) => {
      const relay = Relay.create({
        event: (item: Item) => item.payload,
        scope: (item: Item) => item.directory ?? "global",
        write: async (item: Item) => {
          await stream.writeSSE({
            data: JSON.stringify(item.payload),
          })
        },
      })
      const send = async (event: Event) => {
        await stream.writeSSE({
          data: JSON.stringify(event),
        })
      }
      const handler = (event: Item) => {
        relay.push(event)
      }
      GlobalBus.on("event", handler)
      await send({ type: "server.connected", properties: {} })
      const heartbeat = setInterval(() => {
        void send({ type: "server.heartbeat", properties: {} })
      }, 10_000)

      await new Promise<void>((resolve) => {
        stream.onAbort(() => {
          clearInterval(heartbeat)
          relay.stop()
          GlobalBus.off("event", handler)
          resolve()
        })
      })
    })
  })
}
