import { Global } from "../global"
import { Log } from "../util/log"
import path from "path"
import z from "zod"
import { Installation } from "../installation"
import { Flag } from "../flag/flag"
import { lazy } from "@/util/lazy"
import { Filesystem } from "../util/filesystem"
import { Auth } from "../auth"

// Try to import bundled snapshot (generated at build time)
// Falls back to undefined in dev mode when snapshot doesn't exist
/* @ts-ignore */

export namespace ModelsDev {
  const log = Log.create({ service: "models.dev" })
  const filepath = path.join(Global.Path.cache, "models.json")

  export const Model = z.object({
    id: z.string(),
    name: z.string(),
    family: z.string().optional(),
    release_date: z.string(),
    attachment: z.boolean(),
    reasoning: z.boolean(),
    temperature: z.boolean(),
    tool_call: z.boolean(),
    interleaved: z
      .union([
        z.literal(true),
        z
          .object({
            field: z.enum(["reasoning_content", "reasoning_details"]),
          })
          .strict(),
      ])
      .optional(),
    cost: z
      .object({
        input: z.number(),
        output: z.number(),
        cache_read: z.number().optional(),
        cache_write: z.number().optional(),
        context_over_200k: z
          .object({
            input: z.number(),
            output: z.number(),
            cache_read: z.number().optional(),
            cache_write: z.number().optional(),
          })
          .optional(),
      })
      .optional(),
    limit: z.object({
      context: z.number(),
      input: z.number().optional(),
      output: z.number(),
    }),
    modalities: z
      .object({
        input: z.array(z.enum(["text", "audio", "image", "video", "pdf"])),
        output: z.array(z.enum(["text", "audio", "image", "video", "pdf"])),
      })
      .optional(),
    experimental: z.boolean().optional(),
    status: z.enum(["alpha", "beta", "deprecated"]).optional(),
    options: z.record(z.string(), z.any()),
    headers: z.record(z.string(), z.string()).optional(),
    provider: z.object({ npm: z.string().optional(), api: z.string().optional() }).optional(),
    variants: z.record(z.string(), z.record(z.string(), z.any())).optional(),
  })
  export type Model = z.infer<typeof Model>

  export const Provider = z.object({
    api: z.string().optional(),
    name: z.string(),
    env: z.array(z.string()),
    id: z.string(),
    npm: z.string().optional(),
    models: z.record(z.string(), Model),
  })

  export type Provider = z.infer<typeof Provider>

  function url() {
    return Flag.OPENCODE_MODELS_URL || "https://models.dev"
  }
  const cacheDir = Global.Path.cache
  const kilocodeFilepath = path.join(cacheDir, "kilocode-models.json")

  export const Data = lazy(async () => {
    const result = await Filesystem.readJson(Flag.OPENCODE_MODELS_PATH ?? filepath).catch(() => {})
    if (result) return result
    // @ts-ignore
    const snapshot = await import("./models-snapshot")
      .then((m) => m.snapshot as Record<string, unknown>)
      .catch(() => undefined)
    if (snapshot) return snapshot
    if (Flag.OPENCODE_DISABLE_MODELS_FETCH) return {}
    const json = await fetch(`${url()}/api.json`).then((x) => x.text())
    return JSON.parse(json)
  })

  export async function get() {
    const result = await Data()
    const database = result as Record<string, Provider>
    if (!database["kilocode"]) {
      database["kilocode"] = {
        id: "kilocode",
        name: "Kilo Code",
        env: ["KILOCODE_API_KEY"],
        models: {
          "minimax/max-m2": {
            id: "minimax/max-m2",
            name: "Minimax M2",
            release_date: "2024-12-01",
            attachment: true,
            reasoning: false,
            temperature: true,
            tool_call: true,
            cost: {
              input: 0,
              output: 0,
            },
            limit: {
              context: 128000,
              output: 8192,
            },
            options: {},
          },
        },
      }
    }

    // Try to load from local cache first
    const kilocodeCache = await Bun.file(kilocodeFilepath)
      .json()
      .catch(() => null)
    if (kilocodeCache) {
      Object.assign(database["kilocode"].models, kilocodeCache)
    }

    const auth = await Auth.get("kilocode")
    if (auth && auth.type === "api") {
      const { isJwtExpired } = await import("../util/jwt")
      if (isJwtExpired(auth.key)) {
        log.warn("Kilo Code token has expired. Please run 'opencode auth login kilocode' to refresh it.")
      }

      const refreshModels = async () => {
        try {
          const baseUrl = (() => {
            try {
              const parts = auth.key.split(".")
              if (parts.length !== 3) return "https://api.kilo.ai"
              const payload = JSON.parse(Buffer.from(parts[1], "base64").toString())
              if (payload.env === "development") return "http://localhost:3000"
            } catch {}
            return "https://api.kilo.ai"
          })()

          const response = await fetch(`${baseUrl}/api/openrouter/models`, {
            headers: {
              Authorization: `Bearer ${auth.key}`,
              "x-api-key": auth.key,
              "HTTP-Referer": "https://kilocode.ai",
              "X-Title": "Kilo Code",
              "X-KiloCode-Version": "4.138.0",
              "User-Agent": "Kilo-Code/4.138.0",
            },
            signal: AbortSignal.timeout(5000),
          })
          if (response.ok) {
            const json = (await response.json()) as any
            const models = json.data
            if (Array.isArray(models)) {
              const newModels: Record<string, Model> = {}
              for (const model of models) {
                newModels[model.id] = {
                  id: model.id,
                  name: model.name,
                  release_date: "2024-01-01",
                  attachment: true,
                  reasoning: model.supported_parameters?.includes("reasoning") ?? false,
                  temperature: model.supported_parameters?.includes("temperature") ?? true,
                  tool_call: model.supported_parameters?.includes("tools") ?? true,
                  cost: {
                    input: parseFloat(model.pricing?.prompt || "0"),
                    output: parseFloat(model.pricing?.completion || "0"),
                  },
                  limit: {
                    context: model.context_length || 128000,
                    output: model.top_provider?.max_completion_tokens || 4096,
                  },
                  options: {},
                }
              }
              Object.assign(database["kilocode"].models, newModels)
              await Bun.write(kilocodeFilepath, JSON.stringify(newModels, null, 2))
            }
          } else if (response.status === 401 || response.status === 403) {
            log.error("Kilo Code authentication failed. The token might be expired or invalid.")
          }
        } catch (e) {
          log.error("Failed to discover kilocode models", { error: e })
        }
      }

      if (!kilocodeCache) {
        // Block if no cache exists yet
        await refreshModels()
      } else {
        // Refresh in background if we have a cache
        refreshModels()
      }
    }

    return database
  }

  export async function refresh() {
    const result = await fetch(`${url()}/api.json`, {
      headers: {
        "User-Agent": Installation.USER_AGENT,
      },
      signal: AbortSignal.timeout(10 * 1000),
    }).catch((e) => {
      log.error("Failed to fetch models.dev", {
        error: e,
      })
    })
    if (result && result.ok) {
      await Filesystem.write(filepath, await result.text())
      ModelsDev.Data.reset()
    }
  }
}

if (!Flag.OPENCODE_DISABLE_MODELS_FETCH && !process.argv.includes("--get-yargs-completions")) {
  ModelsDev.refresh()
  setInterval(
    async () => {
      await ModelsDev.refresh()
    },
    60 * 1000 * 60,
  ).unref()
}
