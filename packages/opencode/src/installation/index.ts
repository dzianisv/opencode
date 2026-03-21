import { NodeFileSystem, NodePath } from "@effect/platform-node"
import { Effect, Layer, Schema, ServiceMap, Stream } from "effect"
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http"
import * as CrossSpawnSpawner from "@/effect/cross-spawn-spawner"
import { makeRunPromise } from "@/effect/run-service"
import { withTransientReadRetry } from "@/util/effect-http-client"
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process"
import path from "path"
import z from "zod"
import { BusEvent } from "@/bus/bus-event"
import { Flag } from "../flag/flag"
import { Log } from "../util/log"

import semver from "semver"

import semver from "semver"

export namespace Installation {
  const log = Log.create({ service: "installation" })
  export const PACKAGE = "@vibetechnologies/opencode"
  export const LEGACY = "opencode-ai"

  function find(output: string) {
    if (output.includes(PACKAGE)) return PACKAGE
    if (output.includes(LEGACY)) return LEGACY
  }

  export async function pkg(method: Method) {
    if (method === "npm") return find(await text(["npm", "list", "-g", "--depth=0"])) ?? PACKAGE
    if (method === "yarn") return find(await text(["yarn", "global", "list"])) ?? PACKAGE
    if (method === "pnpm") return find(await text(["pnpm", "list", "-g", "--depth=0"])) ?? PACKAGE
    if (method === "bun") return find(await text(["bun", "pm", "ls", "-g"])) ?? PACKAGE
    return "opencode"
  }

  async function version(registry: string, channel: string) {
    for (const pkg of [PACKAGE, LEGACY]) {
      const res = await fetch(`${registry}/${encodeURIComponent(pkg)}/${channel}`)
      if (!res.ok) continue
      const data = (await res.json()) as { version: string }
      if (channel === "latest" && data.version.startsWith("0.0.0-")) continue
      return data.version
    }
    throw new Error(`Could not determine npm version for ${channel}`)
  }

  export type Method = "curl" | "npm" | "yarn" | "pnpm" | "bun" | "brew" | "scoop" | "choco" | "unknown"

  export type ReleaseType = "patch" | "minor" | "major"

  export const Event = {
    Updated: BusEvent.define(
      "installation.updated",
      z.object({
        version: z.string(),
      }),
    ),
    UpdateAvailable: BusEvent.define(
      "installation.update-available",
      z.object({
        version: z.string(),
      }),
    ),
  }

  export function getReleaseType(current: string, latest: string): ReleaseType {
    const currMajor = semver.major(current)
    const currMinor = semver.minor(current)
    const newMajor = semver.major(latest)
    const newMinor = semver.minor(latest)

    if (newMajor > currMajor) return "major"
    if (newMinor > currMinor) return "minor"
    return "patch"
  }

  export const Info = z
    .object({
      version: z.string(),
      latest: z.string(),
    })
    .meta({
      ref: "InstallationInfo",
    })
  export type Info = z.infer<typeof Info>

  export const VERSION = typeof OPENCODE_VERSION === "string" ? OPENCODE_VERSION : "local"
  export const CHANNEL = typeof OPENCODE_CHANNEL === "string" ? OPENCODE_CHANNEL : "local"
  export const USER_AGENT = `opencode/${CHANNEL}/${VERSION}/${Flag.OPENCODE_CLIENT}`

  export function isPreview() {
    return CHANNEL !== "latest"
  }

  export function isLocal() {
    return CHANNEL === "local"
  }

  export class UpgradeFailedError extends Schema.TaggedErrorClass<UpgradeFailedError>()("UpgradeFailedError", {
    stderr: Schema.String,
  }) {}

  // Response schemas for external version APIs
  const GitHubRelease = Schema.Struct({ tag_name: Schema.String })
  const NpmPackage = Schema.Struct({ version: Schema.String })
  const BrewFormula = Schema.Struct({ versions: Schema.Struct({ stable: Schema.String }) })
  const BrewInfoV2 = Schema.Struct({
    formulae: Schema.Array(Schema.Struct({ versions: Schema.Struct({ stable: Schema.String }) })),
  })
  const ChocoPackage = Schema.Struct({
    d: Schema.Struct({ results: Schema.Array(Schema.Struct({ Version: Schema.String })) }),
  })
  const ScoopManifest = NpmPackage

    checks.sort((a, b) => {
      const aMatches = exec.includes(a.name)
      const bMatches = exec.includes(b.name)
      if (aMatches && !bMatches) return -1
      if (!aMatches && bMatches) return 1
      return 0
    })

    for (const check of checks) {
      const output = await check.command()
      if (check.name === "brew" || check.name === "choco" || check.name === "scoop") {
        if (output.includes("opencode")) return check.name
        continue
      }
      if (find(output)) {
        return check.name
      }
    }

    return "unknown"
  }

  export class Service extends ServiceMap.Service<Service, Interface>()("@opencode/Installation") {}

  export const layer: Layer.Layer<Service, never, HttpClient.HttpClient | ChildProcessSpawner.ChildProcessSpawner> =
    Layer.effect(
      Service,
      Effect.gen(function* () {
        const http = yield* HttpClient.HttpClient
        const httpOk = HttpClient.filterStatusOk(withTransientReadRetry(http))
        const spawner = yield* ChildProcessSpawner.ChildProcessSpawner

  export async function upgrade(method: Method, target: string) {
    let result: Awaited<ReturnType<typeof upgradeCurl>> | undefined
    switch (method) {
      case "curl":
        result = await upgradeCurl(target)
        break
      case "npm":
        result = await Process.run(["npm", "install", "-g", `${PACKAGE}@${target}`], { nothrow: true })
        break
      case "pnpm":
        result = await Process.run(["pnpm", "install", "-g", `${PACKAGE}@${target}`], { nothrow: true })
        break
      case "bun":
        result = await Process.run(["bun", "install", "-g", `${PACKAGE}@${target}`], { nothrow: true })
        break
      case "brew": {
        const formula = await getBrewFormula()
        const env = {
          HOMEBREW_NO_AUTO_UPDATE: "1",
          ...process.env,
        }
        if (formula.includes("/")) {
          const tap = await Process.run(["brew", "tap", "anomalyco/tap"], { env, nothrow: true })
          if (tap.code !== 0) {
            result = tap
            break
          }
          const repo = await Process.text(["brew", "--repo", "anomalyco/tap"], { env, nothrow: true })
          if (repo.code !== 0) {
            result = repo
            break
          }
          const dir = repo.text.trim()
          if (dir) {
            const pull = await Process.run(["git", "pull", "--ff-only"], { cwd: dir, env, nothrow: true })
            if (pull.code !== 0) {
              result = pull
              break
            }
          }

          return "unknown" as Method
        })

        const latestImpl = Effect.fn("Installation.latest")(function* (installMethod?: Method) {
          const detectedMethod = installMethod || (yield* methodImpl())

          if (detectedMethod === "brew") {
            const formula = yield* getBrewFormula()
            if (formula.includes("/")) {
              const infoJson = yield* text(["brew", "info", "--json=v2", formula])
              const info = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(BrewInfoV2))(infoJson)
              return info.formulae[0].versions.stable
            }
            const response = yield* httpOk.execute(
              HttpClientRequest.get("https://formulae.brew.sh/api/formula/opencode.json").pipe(
                HttpClientRequest.acceptJson,
              ),
            )
            const data = yield* HttpClientResponse.schemaBodyJson(BrewFormula)(response)
            return data.versions.stable
          }

          if (detectedMethod === "npm" || detectedMethod === "bun" || detectedMethod === "pnpm") {
            const r = (yield* text(["npm", "config", "get", "registry"])).trim()
            const reg = r || "https://registry.npmjs.org"
            const registry = reg.endsWith("/") ? reg.slice(0, -1) : reg
            const channel = CHANNEL
            const response = yield* httpOk.execute(
              HttpClientRequest.get(`${registry}/opencode-ai/${channel}`).pipe(HttpClientRequest.acceptJson),
            )
            const data = yield* HttpClientResponse.schemaBodyJson(NpmPackage)(response)
            return data.version
          }

          if (detectedMethod === "choco") {
            const response = yield* httpOk.execute(
              HttpClientRequest.get(
                "https://community.chocolatey.org/api/v2/Packages?$filter=Id%20eq%20%27opencode%27%20and%20IsLatestVersion&$select=Version",
              ).pipe(HttpClientRequest.setHeaders({ Accept: "application/json;odata=verbose" })),
            )
            const data = yield* HttpClientResponse.schemaBodyJson(ChocoPackage)(response)
            return data.d.results[0].Version
          }

          if (detectedMethod === "scoop") {
            const response = yield* httpOk.execute(
              HttpClientRequest.get(
                "https://raw.githubusercontent.com/ScoopInstaller/Main/master/bucket/opencode.json",
              ).pipe(HttpClientRequest.setHeaders({ Accept: "application/json" })),
            )
            const data = yield* HttpClientResponse.schemaBodyJson(ScoopManifest)(response)
            return data.version
          }

          const response = yield* httpOk.execute(
            HttpClientRequest.get("https://api.github.com/repos/anomalyco/opencode/releases/latest").pipe(
              HttpClientRequest.acceptJson,
            ),
          )
          const data = yield* HttpClientResponse.schemaBodyJson(GitHubRelease)(response)
          return data.tag_name.replace(/^v/, "")
        }, Effect.orDie)

        const upgradeImpl = Effect.fn("Installation.upgrade")(function* (m: Method, target: string) {
          let result: { code: ChildProcessSpawner.ExitCode; stdout: string; stderr: string } | undefined
          switch (m) {
            case "curl":
              result = yield* upgradeCurl(target)
              break
            case "npm":
              result = yield* run(["npm", "install", "-g", `opencode-ai@${target}`])
              break
            case "pnpm":
              result = yield* run(["pnpm", "install", "-g", `opencode-ai@${target}`])
              break
            case "bun":
              result = yield* run(["bun", "install", "-g", `opencode-ai@${target}`])
              break
            case "brew": {
              const formula = yield* getBrewFormula()
              const env = { HOMEBREW_NO_AUTO_UPDATE: "1" }
              if (formula.includes("/")) {
                const tap = yield* run(["brew", "tap", "anomalyco/tap"], { env })
                if (tap.code !== 0) {
                  result = tap
                  break
                }
                const repo = yield* text(["brew", "--repo", "anomalyco/tap"])
                const dir = repo.trim()
                if (dir) {
                  const pull = yield* run(["git", "pull", "--ff-only"], { cwd: dir, env })
                  if (pull.code !== 0) {
                    result = pull
                    break
                  }
                }
              }
              result = yield* run(["brew", "upgrade", formula], { env })
              break
            }
            case "choco":
              result = yield* run(["choco", "upgrade", "opencode", `--version=${target}`, "-y"])
              break
            case "scoop":
              result = yield* run(["scoop", "install", `opencode@${target}`])
              break
            default:
              return yield* new UpgradeFailedError({ stderr: `Unknown method: ${m}` })
          }
          if (!result || result.code !== 0) {
            const stderr = m === "choco" ? "not running from an elevated command shell" : result?.stderr || ""
            return yield* new UpgradeFailedError({ stderr })
          }
          log.info("upgraded", {
            method: m,
            target,
            stdout: result.stdout,
            stderr: result.stderr,
          })
          yield* text([process.execPath, "--version"])
        })

        return Service.of({
          info: Effect.fn("Installation.info")(function* () {
            return {
              version: VERSION,
              latest: yield* latestImpl(),
            }
          }),
          method: methodImpl,
          latest: latestImpl,
          upgrade: upgradeImpl,
        })
      }),
    )

  export const defaultLayer = layer.pipe(
    Layer.provide(FetchHttpClient.layer),
    Layer.provide(CrossSpawnSpawner.layer),
    Layer.provide(NodeFileSystem.layer),
    Layer.provide(NodePath.layer),
  )

  const runPromise = makeRunPromise(Service, defaultLayer)

  export async function info(): Promise<Info> {
    return runPromise((svc) => svc.info())
  }

  export async function method(): Promise<Method> {
    return runPromise((svc) => svc.method())
  }

  export async function latest(installMethod?: Method): Promise<string> {
    return runPromise((svc) => svc.latest(installMethod))
  }

    if (detectedMethod === "brew") {
      const formula = await getBrewFormula()
      if (formula.includes("/")) {
        const infoJson = await text(["brew", "info", "--json=v2", formula])
        const info = JSON.parse(infoJson)
        const version = info.formulae?.[0]?.versions?.stable
        if (!version) throw new Error(`Could not detect version for tap formula: ${formula}`)
        return version
      }
      return fetch("https://formulae.brew.sh/api/formula/opencode.json")
        .then((res) => {
          if (!res.ok) throw new Error(res.statusText)
          return res.json()
        })
        .then((data: any) => data.versions.stable)
    }

    if (detectedMethod === "npm" || detectedMethod === "bun" || detectedMethod === "pnpm") {
      const registry = await iife(async () => {
        const r = (await text(["npm", "config", "get", "registry"])).trim()
        const reg = r || "https://registry.npmjs.org"
        return reg.endsWith("/") ? reg.slice(0, -1) : reg
      })
      return version(registry, CHANNEL)
    }

    if (detectedMethod === "choco") {
      return fetch(
        "https://community.chocolatey.org/api/v2/Packages?$filter=Id%20eq%20%27opencode%27%20and%20IsLatestVersion&$select=Version",
        { headers: { Accept: "application/json;odata=verbose" } },
      )
        .then((res) => {
          if (!res.ok) throw new Error(res.statusText)
          return res.json()
        })
        .then((data: any) => data.d.results[0].Version)
    }

    if (detectedMethod === "scoop") {
      return fetch("https://raw.githubusercontent.com/ScoopInstaller/Main/master/bucket/opencode.json", {
        headers: { Accept: "application/json" },
      })
        .then((res) => {
          if (!res.ok) throw new Error(res.statusText)
          return res.json()
        })
        .then((data: any) => data.version)
    }

    return fetch("https://api.github.com/repos/anomalyco/opencode/releases/latest")
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText)
        return res.json()
      })
      .then((data: any) => data.tag_name.replace(/^v/, ""))
  }
}
