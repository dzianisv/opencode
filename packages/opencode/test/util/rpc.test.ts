import { describe, expect, test } from "bun:test"
import { Rpc } from "../../src/util/rpc"

describe("rpc client", () => {
  test("times out pending calls and keeps later calls working", async () => {
    const original = process.env.OPENCODE_RPC_TIMEOUT_MS
    process.env.OPENCODE_RPC_TIMEOUT_MS = "20"

    const sent: { id: number }[] = []
    const target = {
      postMessage(data: string) {
        const parsed = JSON.parse(data)
        sent.push({ id: parsed.id })
        return null
      },
      onmessage: null as ((this: Worker, ev: MessageEvent<any>) => any) | null,
    }

    try {
      const client = Rpc.client<{ ping(input: { value: number }): number }>(target)

      await expect(client.call("ping", { value: 1 })).rejects.toThrow("RPC timeout: ping")

      ;(target.onmessage as any)?.({
        data: JSON.stringify({
          type: "rpc.result",
          id: sent[0].id,
          result: 1,
        }),
      } as MessageEvent<any>)

      const next = client.call("ping", { value: 2 })

      ;(target.onmessage as any)?.({
        data: JSON.stringify({
          type: "rpc.result",
          id: sent[1].id,
          result: 2,
        }),
      } as MessageEvent<any>)

      await expect(next).resolves.toBe(2)
    } finally {
      if (original === undefined) delete process.env.OPENCODE_RPC_TIMEOUT_MS
      else process.env.OPENCODE_RPC_TIMEOUT_MS = original
    }
  })
})
