type Event = {
  type: string
  properties: Record<string, unknown>
}

export namespace Relay {
  type Input<T> = {
    event: (item: T) => Event
    write: (item: T) => Promise<void>
    scope?: (item: T) => string
  }

  const delta = (scope: string, event: Event) => {
    if (event.type !== "message.part.delta") return
    const props = event.properties as {
      messageID: string
      partID: string
    }
    return `${scope}:${props.messageID}:${props.partID}`
  }

  const part = (scope: string, event: Event) => {
    if (event.type !== "message.part.updated") return
    const next = event.properties.part as {
      messageID: string
      id: string
    }
    return `${scope}:${next.messageID}:${next.id}`
  }

  const key = (scope: string, event: Event) => {
    if (event.type === "session.status") {
      const props = event.properties as {
        sessionID: string
      }
      return `session.status:${scope}:${props.sessionID}`
    }
    if (event.type === "lsp.updated") {
      return `lsp.updated:${scope}`
    }
    if (event.type === "message.part.updated") {
      const next = event.properties.part as {
        messageID: string
        id: string
      }
      return `message.part.updated:${scope}:${next.messageID}:${next.id}`
    }
    if (event.type === "message.part.delta") {
      const props = event.properties as {
        messageID: string
        partID: string
        field: string
      }
      return `message.part.delta:${scope}:${props.messageID}:${props.partID}:${props.field}`
    }
  }

  export function create<T>(input: Input<T>) {
    let queue: T[] = []
    let pool: T[] = []
    let active = false
    let closed = false
    const coalesced = new Map<string, number>()
    const stale = new Set<string>()

    const scope = (item: T) => input.scope?.(item) ?? ""

    const flush = async () => {
      if (active) return
      active = true
      try {
        while (queue.length > 0) {
          const items = queue
          const skip = stale.size > 0 ? new Set(stale) : undefined
          queue = pool
          pool = items
          queue.length = 0
          coalesced.clear()
          stale.clear()

          for (const item of items) {
            if (closed) break
            const event = input.event(item)
            const part = delta(scope(item), event)
            if (part && skip?.has(part)) continue
            await input.write(item)
          }

          pool.length = 0
        }
      } finally {
        active = false
      }
    }

    return {
      push(item: T) {
        if (closed) return
        const event = input.event(item)
        const root = scope(item)
        const itemPart = delta(root, event)
        if (itemPart && stale.has(itemPart)) return

        const id = key(root, event)
        if (id) {
          const index = coalesced.get(id)
          if (index !== undefined) {
            if (event.type === "message.part.delta") {
              const prev = input.event(queue[index])
              if (prev.type === "message.part.delta") {
                const prevProps = prev.properties as {
                  delta: string
                }
                const nextProps = event.properties as {
                  delta: string
                }
                prevProps.delta += nextProps.delta
                return
              }
            }
            const nextPart = part(root, event)
            if (nextPart) {
              stale.add(nextPart)
            }
            queue[index] = item
            return
          }
          coalesced.set(id, queue.length)
        }

        queue.push(item)
        void flush()
      },
      stop() {
        closed = true
        queue.length = 0
        pool.length = 0
        coalesced.clear()
        stale.clear()
      },
    }
  }
}
