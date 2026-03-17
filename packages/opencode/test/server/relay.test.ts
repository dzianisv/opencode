import { describe, expect, test } from "bun:test"
import { Relay } from "../../src/server/relay"

type Event = {
  type: string
  properties: Record<string, unknown>
}

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

const delta = (text: string): Event => ({
  type: "message.part.delta",
  properties: {
    sessionID: "ses_1",
    messageID: "msg_1",
    partID: "part_1",
    field: "text",
    delta: text,
  },
})

const part = (text: string): Event => ({
  type: "message.part.updated",
  properties: {
    part: {
      id: "part_1",
      messageID: "msg_1",
      sessionID: "ses_1",
      type: "text",
      text,
    },
  },
})

describe("server relay", () => {
  test("writes queued events sequentially", async () => {
    let active = 0
    let max = 0
    let done = false
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })

    const relay = Relay.create<Event>({
      event: (item) => item,
      write: async (item) => {
        active++
        max = Math.max(max, active)
        if (item.type === "block") await gate
        if (item.type === "next") done = true
        active--
      },
    })

    relay.push({ type: "block", properties: {} })
    relay.push({ type: "next", properties: {} })
    await wait()

    expect(done).toBe(false)
    expect(max).toBe(1)

    release()
    await wait()
    await wait()

    expect(done).toBe(true)
    expect(max).toBe(1)
  })

  test("merges repeated deltas for the same part while a write is in flight", async () => {
    const seen: Event[] = []
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })

    const relay = Relay.create<Event>({
      event: (item) => item,
      write: async (item) => {
        seen.push(JSON.parse(JSON.stringify(item)))
        if (item.type === "block") await gate
      },
    })

    relay.push({ type: "block", properties: {} })
    relay.push(delta("a"))
    relay.push(delta("b"))
    relay.push(delta("c"))
    await wait()

    release()
    await wait()
    await wait()

    expect(seen).toHaveLength(2)
    expect(seen[1]).toEqual(delta("abc"))
  })

  test("drops stale deltas once a newer part update supersedes them in the queue", async () => {
    const seen: Event[] = []
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })

    const relay = Relay.create<Event>({
      event: (item) => item,
      write: async (item) => {
        seen.push(JSON.parse(JSON.stringify(item)))
        if (item.type === "block") await gate
      },
    })

    relay.push({ type: "block", properties: {} })
    relay.push(part(""))
    relay.push(delta("a"))
    relay.push(delta("b"))
    relay.push(part("ab"))
    await wait()

    release()
    await wait()
    await wait()

    expect(seen).toHaveLength(2)
    expect(seen[1]).toEqual(part("ab"))
  })
})
