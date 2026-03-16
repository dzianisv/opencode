import { test, expect } from "../fixtures"
import { cleanupTestProject, createTestProject, openSidebar } from "../actions"
import { sessionItemSelector } from "../selectors"
import { createSdk } from "../utils"

test("recent sidebar tile shows global sessions across projects", async ({ page, withProject }) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  const other = await createTestProject()

  try {
    await withProject(
      async ({ directory: root, gotoSession, trackSession }) => {
        const stamp = Date.now()
        const firstTitle = `e2e recent root ${stamp}`
        const secondTitle = `e2e recent other ${stamp}`

        const first = await createSdk(root).session.create({ title: firstTitle }).then((r) => r.data)
        const second = await createSdk(other).session.create({ title: secondTitle }).then((r) => r.data)

        if (!first?.id) throw new Error("Session create did not return an id")
        if (!second?.id) throw new Error("Session create did not return an id")

        trackSession(first.id, root)
        trackSession(second.id, other)

        await gotoSession(first.id)
        await openSidebar(page)

        const tile = page.locator('[data-component="sidebar-rail"]').getByRole("button", { name: /recent sessions/i })
        await expect(tile).toBeVisible()
        await tile.click()

        const nav = page.locator('[data-component="sidebar-nav-desktop"]').first()
        await expect(nav.getByText("Across all projects").first()).toBeVisible()

        const input = nav.getByPlaceholder(/search/i).first()
        await expect(input).toBeVisible()

        const one = page.locator(sessionItemSelector(first.id)).first()
        const two = page.locator(sessionItemSelector(second.id)).first()

        await expect(one).toBeVisible()
        await expect(two).toBeVisible()

        await input.fill(secondTitle)
        await expect(two).toBeVisible()
        await expect(one).toHaveCount(0)

        await input.fill("")
        await expect(one).toBeVisible()
        await expect(two).toBeVisible()
      },
      { extra: [other] },
    )
  } finally {
    await cleanupTestProject(other)
  }
})
