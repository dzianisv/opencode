import z from "zod"
import { Effect, Exit, Layer, PubSub, Scope, ServiceMap, Stream } from "effect"
import { Log } from "../util/log"
import { Instance } from "../project/instance"
import { BusEvent } from "./bus-event"
import { GlobalBus } from "./global"
import { InstanceState } from "@/effect/instance-state"
import { makeRuntime } from "@/effect/run-service"

export namespace Bus {
  const log = Log.create({ service: "bus" })

  export const InstanceDisposed = BusEvent.define(
    "server.instance.disposed",
    z.object({
      directory: z.string(),
    }),
  )

  type Payload<D extends BusEvent.Definition = BusEvent.Definition> = {
    type: D["type"]
    properties: z.infer<D["properties"]>
  }

  type State = {
    wildcard: PubSub.PubSub<Payload>
    typed: Map<string, PubSub.PubSub<Payload>>
  }

  export interface Interface {
    readonly publish: <D extends BusEvent.Definition>(
      def: D,
      properties: z.output<D["properties"]>,
    ) => Effect.Effect<void>
    readonly subscribe: <D extends BusEvent.Definition>(def: D) => Stream.Stream<Payload<D>>
    readonly subscribeAll: () => Stream.Stream<Payload>
    readonly subscribeCallback: <D extends BusEvent.Definition>(
      def: D,
      callback: (event: Payload<D>) => unknown,
    ) => Effect.Effect<() => void>
    readonly subscribeAllCallback: (callback: (event: any) => unknown) => Effect.Effect<() => void>
  }

  export class Service extends ServiceMap.Service<Service, Interface>()("@opencode/Bus") {}

  export const layer = Layer.effect(
    Service,
    Effect.gen(function* () {
      const state = yield* InstanceState.make<State>(
        Effect.fn("Bus.state")(function* (ctx) {
          const wildcard = yield* PubSub.unbounded<Payload>()
          const typed = new Map<string, PubSub.PubSub<Payload>>()

          yield* Effect.addFinalizer(() =>
            Effect.gen(function* () {
              // Publish InstanceDisposed before shutting down so subscribers see it
              yield* PubSub.publish(wildcard, {
                type: InstanceDisposed.type,
                properties: { directory: ctx.directory },
              })
              yield* PubSub.shutdown(wildcard)
              for (const ps of typed.values()) {
                yield* PubSub.shutdown(ps)
              }
            }),
          )

          return { wildcard, typed }
        }),
      )

      function getOrCreate<D extends BusEvent.Definition>(state: State, def: D) {
        return Effect.gen(function* () {
          let ps = state.typed.get(def.type)
          if (!ps) {
            ps = yield* PubSub.unbounded<Payload>()
            state.typed.set(def.type, ps)
          }
          return ps as unknown as PubSub.PubSub<Payload<D>>
        })
      }
    },
    async (entry) => {
      const wildcard = entry.subscriptions.get("*")
      if (wildcard) {
        const event = {
          type: InstanceDisposed.type,
          properties: {
            directory: Instance.directory,
          },
        }
        for (const sub of [...wildcard]) {
          sub(event)
        }
      }
      entry.subscriptions.clear()
    },
  )

  const { runPromise, runSync } = makeRuntime(Service, layer)

  // runSync is safe here because the subscribe chain (InstanceState.get, PubSub.subscribe,
  // Scope.make, Effect.forkScoped) is entirely synchronous. If any step becomes async, this will throw.
  export async function publish<D extends BusEvent.Definition>(def: D, properties: z.output<D["properties"]>) {
    return runPromise((svc) => svc.publish(def, properties))
  }

  export function subscribe<D extends BusEvent.Definition>(
    def: D,
    callback: (event: { type: D["type"]; properties: z.infer<D["properties"]> }) => unknown,
  ) {
    return runSync((svc) => svc.subscribeCallback(def, callback))
  }

  export function subscribeAll(callback: (event: any) => unknown) {
    return runSync((svc) => svc.subscribeAllCallback(callback))
  }
}
