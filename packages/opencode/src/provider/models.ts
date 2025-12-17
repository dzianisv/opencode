import { Global } from "../global"
import { Log } from "../util/log"
import path from "path"
import z from "zod"
import { data } from "./models-macro" with { type: "macro" }
import { Installation } from "../installation"
import { Auth } from "../auth"

export namespace ModelsDev {
  const log = Log.create({ service: "models.dev" })
  const filepath = path.join(Global.Path.cache, "models.json")

  export const Model = z
    .object({
      id: z.string(),
      name: z.string(),
      release_date: z.string(),
      attachment: z.boolean(),
      reasoning: z.boolean(),
      temperature: z.boolean(),
      tool_call: z.boolean(),
      cost: z.object({
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
      }),
      limit: z.object({
        context: z.number(),
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
      provider: z.object({ npm: z.string() }).optional(),
    })
    .meta({
      ref: "Model",
    })
  export type Model = z.infer<typeof Model>

  export const Provider = z
    .object({
      api: z.string().optional(),
      name: z.string(),
      env: z.array(z.string()),
      id: z.string(),
      npm: z.string().optional(),
      models: z.record(z.string(), Model),
    })
    .meta({
      ref: "Provider",
    })

  export type Provider = z.infer<typeof Provider>

  const cacheDir = Global.Path.cache
  const kilocodeFilepath = path.join(cacheDir, "kilocode-models.json")

  export async function get() {
    refresh()
    const file = Bun.file(filepath)
    const result = (await file.json().catch(() => { })) || JSON.parse(await data())
    const database = result as Record<string, Provider>

    if (!database["kilocode"]) {
      database["kilocode"] = {
        id: "kilocode",
        name: "Kilo Code",
        env: ["KILOCODE_API_KEY"],
        models: {
          "anthropic/claude-3-5-sonnet": {
            id: "anthropic/claude-3-5-sonnet",
            name: "Claude 3.5 Sonnet",
            release_date: "2024-06-20",
            attachment: true,
            reasoning: false,
            temperature: true,
            tool_call: true,
            cost: {
              input: 0,
              output: 0,
            },
            limit: {
              context: 200000,
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
      const refreshModels = async () => {
        try {
          const response = await fetch("https://api.kilo.ai/api/openrouter/models", {
            headers: {
              Authorization: `Bearer ${auth.key}`,
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
    const file = Bun.file(filepath)
    log.info("refreshing", {
      file,
    })
    const result = await fetch("https://models.dev/api.json", {
      headers: {
        "User-Agent": Installation.USER_AGENT,
      },
      signal: AbortSignal.timeout(10 * 1000),
    }).catch((e) => {
      log.error("Failed to fetch models.dev", {
        error: e,
      })
    })
    if (result && result.ok) await Bun.write(file, await result.text())
  }
}

setInterval(() => ModelsDev.refresh(), 60 * 1000 * 60).unref()
