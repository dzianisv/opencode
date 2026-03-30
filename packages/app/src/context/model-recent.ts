export type ModelKey = {
  providerID: string
  modelID: string
}

export type RecentModel = ModelKey & {
  variant?: string
}

export function recentKey(item: RecentModel) {
  return `${item.providerID}:${item.modelID}:${item.variant ?? ""}`
}

function normalize(item: unknown) {
  if (!item || typeof item !== "object") return

  const providerID = (item as { providerID?: unknown }).providerID
  const modelID = (item as { modelID?: unknown }).modelID
  const variant = (item as { variant?: unknown }).variant
  if (typeof providerID !== "string" || typeof modelID !== "string") return

  const provider = providerID.trim()
  const model = modelID.trim()
  if (!provider || !model) return

  return {
    providerID: provider,
    modelID: model,
    variant: typeof variant === "string" && variant.trim() ? variant.trim() : undefined,
  } satisfies RecentModel
}

export function migrateRecent(list: unknown) {
  if (!Array.isArray(list)) return []
  return list.flatMap((item) => {
    const normalized = normalize(item)
    return normalized ? [normalized] : []
  })
}

export function pushRecent(list: RecentModel[], item: RecentModel, limit = 5) {
  const seen = new Set<string>()
  return [item, ...list].flatMap((entry) => {
    const key = recentKey(entry)
    if (seen.has(key)) return []
    seen.add(key)
    return seen.size <= limit ? [entry] : []
  })
}
