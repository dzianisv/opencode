import type { Hooks, PluginInput, Plugin as PluginInstance } from "@opencode-ai/plugin"
import { Config } from "../config/config"
import { Bus } from "../bus"
import { Log } from "../util/log"
import { createOpencodeClient } from "@opencode-ai/sdk"
import { Server } from "../server/server"
import { BunProc } from "../bun"
import { Flag } from "../flag/flag"
import { CodexAuthPlugin } from "./codex"
import { Session } from "../session"
import { NamedError } from "@opencode-ai/util/error"
import { CopilotAuthPlugin } from "./copilot"
import { gitlabAuthPlugin as GitlabAuthPlugin } from "opencode-gitlab-auth"
import { PoeAuthPlugin } from "opencode-poe-auth"
import { Effect, Layer, ServiceMap } from "effect"
import { InstanceState } from "@/effect/instance-state"
import { makeRunPromise } from "@/effect/run-service"

export namespace Plugin {
  const log = Log.create({ service: "plugin" })

  type State = {
    hooks: Hooks[]
  }

  // Hook names that follow the (input, output) => Promise<void> trigger pattern
  type TriggerName = {
    [K in keyof Hooks]-?: NonNullable<Hooks[K]> extends (input: any, output: any) => Promise<void> ? K : never
  }[keyof Hooks]

  export interface Interface {
    readonly trigger: <
      Name extends TriggerName,
      Input = Parameters<Required<Hooks>[Name]>[0],
      Output = Parameters<Required<Hooks>[Name]>[1],
    >(
      name: Name,
      input: Input,
      output: Output,
    ) => Effect.Effect<Output>
    readonly list: () => Effect.Effect<Hooks[]>
    readonly init: () => Effect.Effect<void>
  }

  export class Service extends ServiceMap.Service<Service, Interface>()("@opencode/Plugin") {}

  // Built-in plugins that are directly imported (not installed from npm)
  const INTERNAL_PLUGINS: PluginInstance[] = [CodexAuthPlugin, CopilotAuthPlugin, GitlabAuthPlugin, PoeAuthPlugin]

  function isServerPlugin(value: unknown): value is PluginInstance {
    return typeof value === "function"
  }

  function getServerPlugin(value: unknown) {
    if (isServerPlugin(value)) return value
    if (!value || typeof value !== "object" || !("server" in value)) return
    if (!isServerPlugin(value.server)) return
    return value.server
  }

  function getLegacyPlugins(mod: Record<string, unknown>) {
    const seen = new Set<unknown>()
    const result: PluginInstance[] = []

    for (const entry of Object.values(mod)) {
      if (seen.has(entry)) continue
      seen.add(entry)
      const plugin = getServerPlugin(entry)
      if (!plugin) throw new TypeError("Plugin export is not a function")
      result.push(plugin)
    }

    return result
  }

  function publishPluginError(bus: Bus.Interface, message: string) {
    Effect.runFork(bus.publish(Session.Event.Error, { error: new NamedError.Unknown({ message }).toObject() }))
  }

  async function applyPlugin(load: PluginLoader.Loaded, input: PluginInput, hooks: Hooks[]) {
    const plugin = readV1Plugin(load.mod, load.spec, "server", "detect")
    if (plugin) {
      await resolvePluginId(load.source, load.spec, load.target, readPluginId(plugin.id, load.spec), load.pkg)
      hooks.push(await (plugin as PluginModule).server(input, load.options))
      return
    }

    for (const server of getLegacyPlugins(load.mod)) {
      hooks.push(await server(input, load.options))
    }
  }

  export const layer = Layer.effect(
    Service,
    Effect.gen(function* () {
      const cache = yield* InstanceState.make<State>(
        Effect.fn("Plugin.state")(function* (ctx) {
          const hooks: Hooks[] = []

          yield* Effect.promise(async () => {
            const client = createOpencodeClient({
              baseUrl: "http://localhost:4096",
              directory: ctx.directory,
              headers: Flag.OPENCODE_SERVER_PASSWORD
                ? {
                    Authorization: `Basic ${Buffer.from(`${Flag.OPENCODE_SERVER_USERNAME ?? "opencode"}:${Flag.OPENCODE_SERVER_PASSWORD}`).toString("base64")}`,
                  }
                : undefined,
              fetch: async (...args) => Server.Default().fetch(...args),
            })
            const cfg = await Config.get()
            const input: PluginInput = {
              client,
              project: ctx.project,
              worktree: ctx.worktree,
              directory: ctx.directory,
              get serverUrl(): URL {
                return Server.url ?? new URL("http://localhost:4096")
              },
              $: Bun.$,
            }

            for (const plugin of INTERNAL_PLUGINS) {
              log.info("loading internal plugin", { name: plugin.name })
              const init = await plugin(input).catch((err) => {
                log.error("failed to load internal plugin", { name: plugin.name, error: err })
              })
              if (init) hooks.push(init)
            }

            let plugins = cfg.plugin ?? []
            if (plugins.length) await Config.waitForDependencies()

            for (const pluginEntry of plugins) {
              let plugin = typeof pluginEntry === "string" ? pluginEntry : pluginEntry[0]
              if (DEPRECATED_PLUGIN_PACKAGES.some((pkg) => plugin.includes(pkg))) continue
              log.info("loading plugin", { path: plugin })
              if (!plugin.startsWith("file://")) {
                const idx = plugin.lastIndexOf("@")
                const pkg = idx > 0 ? plugin.substring(0, idx) : plugin
                const version = idx > 0 ? plugin.substring(idx + 1) : "latest"
                plugin = await BunProc.install(pkg, version).catch((err) => {
                  const cause = err instanceof Error ? err.cause : err
                  const detail = cause instanceof Error ? cause.message : String(cause ?? err)
                  log.error("failed to install plugin", { pkg, version, error: detail })
                  Bus.publish(Session.Event.Error, {
                    error: new NamedError.Unknown({
                      message: `Failed to install plugin ${pkg}@${version}: ${detail}`,
                    }).toObject(),
                  })
                  return ""
                })
                if (!plugin) continue
              }

                  if (stage === "install") {
                    const parsed = parsePluginSpecifier(spec)
                    log.error("failed to install plugin", { pkg: parsed.pkg, version: parsed.version, error: message })
                    publishPluginError(bus, `Failed to install plugin ${parsed.pkg}@${parsed.version}: ${message}`)
                    return
                  }
                })
                .catch((err) => {
                  const message = err instanceof Error ? err.message : String(err)
                  log.error("failed to load plugin", { path: plugin, error: message })
                  Bus.publish(Session.Event.Error, {
                    error: new NamedError.Unknown({
                      message: `Failed to load plugin ${plugin}: ${message}`,
                    }).toObject(),
                  })
                })
            }

                  if (stage === "compatibility") {
                    log.warn("plugin incompatible", { path: spec, error: message })
                    publishPluginError(bus, `Plugin ${spec} skipped: ${message}`)
                    return
                  }

                  if (stage === "entry") {
                    log.error("failed to resolve plugin server entry", { path: spec, error: message })
                    publishPluginError(bus, `Failed to load plugin ${spec}: ${message}`)
                    return
                  }

                  log.error("failed to load plugin", { path: spec, target: resolved?.entry, error: message })
                  publishPluginError(bus, `Failed to load plugin ${spec}: ${message}`)
                },
              },
            }),
          )
          for (const load of loaded) {
            if (!load) continue

            // Keep plugin execution sequential so hook registration and execution
            // order remains deterministic across plugin runs.
            yield* Effect.tryPromise({
              try: () => applyPlugin(load, input, hooks),
              catch: (err) => {
                const message = errorMessage(err)
                log.error("failed to load plugin", { path: load.spec, error: message })
                return message
              },
            }).pipe(
              Effect.catch((message) =>
                bus.publish(Session.Event.Error, {
                  error: new NamedError.Unknown({
                    message: `Failed to load plugin ${load.spec}: ${message}`,
                  }).toObject(),
                }),
              ),
            )
          }

          // Notify plugins of current config
          for (const hook of hooks) {
            yield* Effect.tryPromise({
              try: () => Promise.resolve((hook as any).config?.(cfg)),
              catch: (err) => {
                log.error("plugin config hook failed", { error: err })
              }
            }
          })

          // Subscribe to bus events, clean up when scope is closed
          yield* Effect.acquireRelease(
            Effect.sync(() =>
              Bus.subscribeAll(async (input) => {
                for (const hook of hooks) {
                  hook["event"]?.({ event: input })
                }
              }),
            ),
            (unsub) => Effect.sync(unsub),
          )

          return { hooks }
        }),
      )

      const trigger = Effect.fn("Plugin.trigger")(function* <
        Name extends TriggerName,
        Input = Parameters<Required<Hooks>[Name]>[0],
        Output = Parameters<Required<Hooks>[Name]>[1],
      >(name: Name, input: Input, output: Output) {
        if (!name) return output
        const state = yield* InstanceState.get(cache)
        yield* Effect.promise(async () => {
          for (const hook of state.hooks) {
            const fn = hook[name] as any
            if (!fn) continue
            await fn(input, output)
          }
        })
        return output
      })

      const list = Effect.fn("Plugin.list")(function* () {
        const state = yield* InstanceState.get(cache)
        return state.hooks
      })

      const init = Effect.fn("Plugin.init")(function* () {
        yield* InstanceState.get(cache)
      })

      return Service.of({ trigger, list, init })
    }),
  )

  const runPromise = makeRunPromise(Service, layer)

  /** Alias of `layer` — provided for consistency with other modules. */
  export const defaultLayer = layer

  export async function trigger<
    Name extends TriggerName,
    Input = Parameters<Required<Hooks>[Name]>[0],
    Output = Parameters<Required<Hooks>[Name]>[1],
  >(name: Name, input: Input, output: Output): Promise<Output> {
    return runPromise((svc) => svc.trigger(name, input, output))
  }

  export async function list(): Promise<Hooks[]> {
    return runPromise((svc) => svc.list())
  }

  export async function init() {
    return runPromise((svc) => svc.init())
  }
}
