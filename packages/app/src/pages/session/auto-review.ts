type Key = {
  providerID: string
  modelID: string
}

type Item = {
  id: string
  provider: {
    id: string
  }
  variants?: Record<string, unknown>
}

type PickInput = {
  list: Item[]
  used: Key
  review?: Key
  base?: Key
  now?: Key
}

type PickOutput = {
  model: Key
  variant?: string
}

const head = "Codex, run auto-review"
const done = "Task completed."

const key = (item: Key) => `${item.providerID}/${item.modelID}`

const same = (a: Key, b: Key) => a.providerID === b.providerID && a.modelID === b.modelID

const asKey = (item: Item): Key => ({
  providerID: item.provider.id,
  modelID: item.id,
})

const find = (list: Item[], item: Key | undefined) => {
  if (!item) return
  return list.find((x) => x.provider.id === item.providerID && x.id === item.modelID)
}

export const reviewPrompt = (prev: string) =>
  [
    `${head} for ${prev} work.`,
    "1/ What was the task?",
    "2/ Did you complete it?",
    "3/ If no, why did you stop?",
    "4/ If you have next steps to do, go and do them now.",
    `5/ If everything is good, print exactly: "${done}"`,
  ].join("\n")

export const reviewPromptCheck = (text: string) => text.toLowerCase().startsWith(head.toLowerCase())

export const reviewDone = (text: string) => text.trim() === done

export const reviewPick = (input: PickInput): PickOutput | undefined => {
  const map = new Map<string, Item>()

  const add = (item: Key | undefined) => {
    const hit = find(input.list, item)
    if (!hit) return
    map.set(key(asKey(hit)), hit)
  }

  add(input.review)
  add(input.base)
  add(input.now)

  for (const item of input.list) {
    map.set(key(asKey(item)), item)
  }

  const list = [...map.values()]
  if (list.length === 0) return

  const pick = list.find((item) => !same(asKey(item), input.used))
  if (!pick) return

  return {
    model: asKey(pick),
    variant: pick.variants && Object.hasOwn(pick.variants, "xhigh") ? "xhigh" : undefined,
  }
}
