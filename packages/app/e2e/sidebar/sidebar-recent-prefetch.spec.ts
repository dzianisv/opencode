import { test, expect } from "../fixtures"
import { cleanupSession, openSidebar } from "../actions"

test("sidebar hover prefetches lightweight session previews", async ({ page, sdk, gotoSession }) => {
  const stamp = Date.now()
  const one = await sdk.session.create({ title: `e2e recent prefetch 1 ${stamp}` }).then((r) => r.data)
  const two = await sdk.session.create({ title: `e2e recent prefetch 2 ${stamp}` }).then((r) => r.data)

  if (!one?.id) throw new Error("Session create did not return an id")
  if (!two?.id) throw new Error("Session create did not return an id")

  const seen: string[] = []
  page.on("request", (req) => {
    const url = new URL(req.url())
    if (!url.pathname.endsWith(`/session/${two.id}/message`)) return
    seen.push(url.searchParams.get("preview") ?? "")
  })

  try {
    await gotoSession(one.id)
    await openSidebar(page)

    const item = page.locator(`[data-session-id="${two.id}"] a`).first()
    await expect(item).toBeVisible()
    await item.hover()

    await expect.poll(() => seen.length, { timeout: 10_000 }).toBeGreaterThan(0)
    expect(seen.every((value) => value === "true")).toBe(true)
  } finally {
    await cleanupSession({ sdk, sessionID: one.id })
    await cleanupSession({ sdk, sessionID: two.id })
  }
})
