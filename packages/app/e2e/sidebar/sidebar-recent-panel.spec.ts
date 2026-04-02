import path from "path"
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
        await expect(one.getByText(path.basename(root)).first()).toBeVisible()
        await expect(two.getByText(path.basename(other)).first()).toBeVisible()

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

test("recent sidebar shows child sessions nested under their parent", async ({ page, withProject }) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  await withProject(async ({ directory, gotoSession, trackSession }) => {
    const stamp = Date.now()
    const rootTitle = `e2e recent tree root ${stamp}`
    const childTitle = `e2e recent tree child ${stamp}`

    const root = await createSdk(directory).session.create({ title: rootTitle }).then((r) => r.data)
    if (!root?.id) throw new Error("Root session create did not return an id")

    const child = await createSdk(directory).session.create({ title: childTitle, parentID: root.id }).then((r) => r.data)
    if (!child?.id) throw new Error("Child session create did not return an id")

    trackSession(root.id, directory)
    trackSession(child.id, directory)

    await gotoSession(root.id)
    await openSidebar(page)

    const tile = page.locator('[data-component="sidebar-rail"]').getByRole("button", { name: /recent sessions/i })
    await expect(tile).toBeVisible()
    await tile.click()

    const nav = page.locator('[data-component="sidebar-nav-desktop"]').first()
    const rootItem = nav.locator(`[data-session-id="${root.id}"]`).first()
    const childItem = nav.locator(`[data-session-id="${child.id}"]`).first()

    await expect(rootItem).toBeVisible()
    await expect(childItem).toBeVisible()

    const rootPad = await rootItem.evaluate((el) => Number.parseFloat(getComputedStyle(el).paddingLeft))
    const childPad = await childItem.evaluate((el) => Number.parseFloat(getComputedStyle(el).paddingLeft))

    expect(childPad).toBeGreaterThan(rootPad)
  })
})

test("archiving from recent sidebar removes the thread immediately", async ({ page, withProject }) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  await withProject(async ({ directory, gotoSession, trackSession }) => {
    const stamp = Date.now()
    const rootTitle = `e2e recent archive root ${stamp}`
    const childTitle = `e2e recent archive child ${stamp}`

    const root = await createSdk(directory).session.create({ title: rootTitle }).then((r) => r.data)
    if (!root?.id) throw new Error("Root session create did not return an id")

    const child = await createSdk(directory).session.create({ title: childTitle, parentID: root.id }).then((r) => r.data)
    if (!child?.id) throw new Error("Child session create did not return an id")

    trackSession(root.id, directory)
    trackSession(child.id, directory)

    await gotoSession(root.id)
    await openSidebar(page)

    const tile = page.locator('[data-component="sidebar-rail"]').getByRole("button", { name: /recent sessions/i })
    await expect(tile).toBeVisible()
    await tile.click()

    const rootItem = page.locator(sessionItemSelector(root.id)).first()
    const childItem = page.locator(sessionItemSelector(child.id)).first()

    await expect(rootItem).toBeVisible()
    await expect(childItem).toBeVisible()

    await rootItem.hover()
    await rootItem.getByRole("button", { name: /archive/i }).first().click()

    await expect(rootItem).toHaveCount(0)
    await expect(childItem).toHaveCount(0)
  })
})
