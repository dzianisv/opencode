import { Effect, Layer, ManagedRuntime } from "effect"
import * as ServiceMap from "effect/ServiceMap"
import { Context } from "@/util/context"
import { InstanceRef } from "./instance-ref"

export const memoMap = Layer.makeMemoMapUnsafe()

// Access instance context by its ALS key directly to avoid the circular dep:
// run-service.ts → instance.ts → project.ts → run-service.ts
// The key "instance" must match the one used in project/instance.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const instanceALS = Context.create<any>("instance")

function attach<A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> {
  try {
    const ctx = instanceALS.use()
    return Effect.provideService(effect, InstanceRef, ctx)
  } catch (err) {
    if (!(err instanceof Context.NotFound)) throw err
  }
  return effect
}

export function makeRunPromise<I, S, E>(service: ServiceMap.Service<I, S>, layer: Layer.Layer<I, E>) {
  let rt: ManagedRuntime.ManagedRuntime<I, E> | undefined

  return <A, Err>(fn: (svc: S) => Effect.Effect<A, Err, I>, options?: Effect.RunOptions) => {
    rt ??= ManagedRuntime.make(layer, { memoMap })
    return rt.runPromise(attach(service.use(fn)), options)
  }
}

export function makeRuntime<I, S, E>(service: ServiceMap.Service<I, S>, layer: Layer.Layer<I, E>) {
  let rt: ManagedRuntime.ManagedRuntime<I, E> | undefined
  const getRuntime = () => (rt ??= ManagedRuntime.make(layer, { memoMap }))

  return {
    runSync: <A, Err>(fn: (svc: S) => Effect.Effect<A, Err, I>) => getRuntime().runSync(attach(service.use(fn))),
    runPromiseExit: <A, Err>(fn: (svc: S) => Effect.Effect<A, Err, I>, options?: Effect.RunOptions) =>
      getRuntime().runPromiseExit(attach(service.use(fn)), options),
    runPromise: <A, Err>(fn: (svc: S) => Effect.Effect<A, Err, I>, options?: Effect.RunOptions) =>
      getRuntime().runPromise(attach(service.use(fn)), options),
    runFork: <A, Err>(fn: (svc: S) => Effect.Effect<A, Err, I>) => getRuntime().runFork(attach(service.use(fn))),
    runCallback: <A, Err>(fn: (svc: S) => Effect.Effect<A, Err, I>) =>
      getRuntime().runCallback(attach(service.use(fn))),
  }
}
