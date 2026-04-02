import z from "zod"
import { Effect, Layer, PubSub, ServiceMap, Stream } from "effect"
import { Log } from "../util/log"
import { Instance } from "../project/instance"
import { BusEvent } from "./bus-event"
import { GlobalBus } from "./global"

export namespace Bus {
  const log = Log.create({ service: "bus" })
  type Subscription = (event: any) => void

  export const InstanceDisposed = BusEvent.define(
    "server.instance.disposed",
    z.object({
      directory: z.string(),
    }),
  )

  const state = Instance.state(
    () => {
      const subscriptions = new Map<any, Subscription[]>()

      return {
        subscriptions,
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

  export async function publish<Definition extends BusEvent.Definition>(
    def: Definition,
    properties: z.output<Definition["properties"]>,
  ) {
    const payload = {
      type: def.type,
      properties,
    }
    log.info("publishing", {
      type: def.type,
    })
    const pending = []
    for (const key of [def.type, "*"]) {
      const match = [...(state().subscriptions.get(key) ?? [])]
      for (const sub of match) {
        pending.push(sub(payload))
      }
    }
    GlobalBus.emit("event", {
      directory: Instance.directory,
      payload,
    })
    return Promise.all(pending)
  }

  export function subscribe<Definition extends BusEvent.Definition>(
    def: Definition,
    callback: (event: { type: Definition["type"]; properties: z.infer<Definition["properties"]> }) => void,
  ) {
    return raw(def.type, callback)
  }

  export function once<Definition extends BusEvent.Definition>(
    def: Definition,
    callback: (event: {
      type: Definition["type"]
      properties: z.infer<Definition["properties"]>
    }) => "done" | undefined,
  ) {
    const unsub = subscribe(def, (event) => {
      if (callback(event)) unsub()
    })
  }

  export function subscribeAll(callback: (event: any) => void) {
    return raw("*", callback)
  }

  function raw(type: string, callback: (event: any) => void) {
    log.info("subscribing", { type })
    const subscriptions = state().subscriptions
    let match = subscriptions.get(type) ?? []
    match.push(callback)
    subscriptions.set(type, match)

    return () => {
      log.info("unsubscribing", { type })
      const match = subscriptions.get(type)
      if (!match) return
      const index = match.indexOf(callback)
      if (index === -1) return
      match.splice(index, 1)
    }
  }

  // ---------------------------------------------------------------------------
  // Effect-native service (layer-based, subscriptions as Streams)
  // ---------------------------------------------------------------------------

  export interface EffectInterface {
    publish<Def extends BusEvent.Definition>(
      def: Def,
      props: z.output<Def["properties"]>,
    ): Effect.Effect<void>
    subscribe<Def extends BusEvent.Definition>(
      def: Def,
    ): Stream.Stream<{ type: Def["type"]; properties: z.infer<Def["properties"]> }>
    subscribeAll(): Stream.Stream<{ type: string; properties: unknown }>
    subscribeCallback<Def extends BusEvent.Definition>(
      def: Def,
      callback: (event: { type: Def["type"]; properties: z.infer<Def["properties"]> }) => void,
    ): Effect.Effect<() => void>
  }

  export class Service extends ServiceMap.Service<Service, EffectInterface>()("@opencode/Bus") {}

  export const layer: Layer.Layer<Service> = Layer.effect(
    Service,
    Effect.gen(function* () {
      // Broadcast hub for all events
      const hub = yield* PubSub.unbounded<{ type: string; properties: unknown }>()

      // Bridge the existing callback-based Bus into the hub
      const unsub = subscribeAll((event: any) => {
        Effect.runFork(PubSub.publish(hub, event))
      })
      yield* Effect.addFinalizer(() => Effect.sync(unsub))

      return {
        publish: <Def extends BusEvent.Definition>(def: Def, props: z.output<Def["properties"]>) =>
          Effect.promise(() => publish(def, props)),
        subscribe: <Def extends BusEvent.Definition>(def: Def) => {
          const s = Stream.fromPubSub(hub).pipe(Stream.filter((evt) => evt.type === def.type))
          return s as unknown as Stream.Stream<{
            type: Def["type"]
            properties: z.infer<Def["properties"]>
          }>
        },
        subscribeAll: () => Stream.fromPubSub(hub),
        subscribeCallback: <Def extends BusEvent.Definition>(
          def: Def,
          callback: (event: { type: Def["type"]; properties: z.infer<Def["properties"]> }) => void,
        ) =>
          Effect.sync(() =>
            subscribe(def, (evt) => callback(evt as { type: Def["type"]; properties: z.infer<Def["properties"]> })),
          ),
      }
    }),
  )
}
