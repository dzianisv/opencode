export class AsyncQueue<T> implements AsyncIterable<T> {
  private queue: T[] = []
  private resolvers: ((value: T) => void)[] = []
  private closed = false

  push(item: T) {
    if (this.closed) return
    const resolve = this.resolvers.shift()
    if (resolve) resolve(item)
    else this.queue.push(item)
  }

  async next(): Promise<T | undefined> {
    if (this.closed && this.queue.length === 0) return undefined
    if (this.queue.length > 0) return this.queue.shift()!
    if (this.closed) return undefined
    return new Promise((resolve) => this.resolvers.push(resolve))
  }

  /**
   * Close the queue. No more items can be pushed.
   * Pending consumers will receive undefined.
   */
  close() {
    this.closed = true
    // Resolve all pending consumers with undefined
    for (const resolve of this.resolvers) {
      resolve(undefined as T)
    }
    this.resolvers = []
  }

  /**
   * Drain remaining items without blocking.
   * Returns items that were in the queue.
   */
  drain(): T[] {
    const items = [...this.queue]
    this.queue = []
    return items
  }

  get isClosed() {
    return this.closed
  }

  async *[Symbol.asyncIterator]() {
    while (!this.closed) {
      const item = await this.next()
      if (item === undefined && this.closed) break
      if (item !== undefined) yield item
    }
  }
}

export async function work<T>(concurrency: number, items: T[], fn: (item: T) => Promise<void>) {
  const pending = [...items]
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (true) {
        const item = pending.pop()
        if (item === undefined) return
        await fn(item)
      }
    }),
  )
}
