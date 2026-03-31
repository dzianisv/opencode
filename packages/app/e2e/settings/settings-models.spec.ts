import { test, expect, settingsKey } from "../fixtures"
import {
  promptSelector,
  promptAutoReviewSelector,
  settingsModelAutoReviewSelector,
  settingsModelDefaultSelector,
  settingsModelReviewSelector,
} from "../selectors"
import { closeDialog, openSettings } from "../actions"

test("hiding a model removes it from the model picker", async ({ page, gotoSession }) => {
  await gotoSession()

  await page.locator(promptSelector).click()
  await page.keyboard.type("/model")

  const command = page.locator('[data-slash-id="model.choose"]')
  await expect(command).toBeVisible()
  await command.hover()
  await page.keyboard.press("Enter")

  const picker = page.getByRole("dialog")
  await expect(picker).toBeVisible()

  const target = picker.locator('[data-slot="list-item"]').first()
  await expect(target).toBeVisible()

  const key = await target.getAttribute("data-key")
  if (!key) throw new Error("Failed to resolve model key from list item")

  const name = (await target.locator("span").first().innerText()).trim()
  if (!name) throw new Error("Failed to resolve model name from list item")

  await page.keyboard.press("Escape")
  await expect(picker).toHaveCount(0)

  const settings = await openSettings(page)

  await settings.getByRole("tab", { name: "Models" }).click()
  const search = settings.getByPlaceholder("Search models")
  await expect(search).toBeVisible()
  await search.fill(name)

  const toggle = settings.locator('[data-component="switch"]').filter({ hasText: name }).first()
  const input = toggle.locator('[data-slot="switch-input"]')
  await expect(toggle).toBeVisible()
  await expect(input).toHaveAttribute("aria-checked", "true")
  await toggle.locator('[data-slot="switch-control"]').click()
  await expect(input).toHaveAttribute("aria-checked", "false")

  await closeDialog(page, settings)

  await page.locator(promptSelector).click()
  await page.keyboard.type("/model")
  await expect(command).toBeVisible()
  await command.hover()
  await page.keyboard.press("Enter")

  const pickerAgain = page.getByRole("dialog")
  await expect(pickerAgain).toBeVisible()
  await expect(pickerAgain.locator('[data-slot="list-item"]').first()).toBeVisible()

  await expect(pickerAgain.locator(`[data-slot="list-item"][data-key="${key}"]`)).toHaveCount(0)

  await page.keyboard.press("Escape")
  await expect(pickerAgain).toHaveCount(0)
})

test("showing a hidden model restores it to the model picker", async ({ page, gotoSession }) => {
  await gotoSession()

  await page.locator(promptSelector).click()
  await page.keyboard.type("/model")

  const command = page.locator('[data-slash-id="model.choose"]')
  await expect(command).toBeVisible()
  await command.hover()
  await page.keyboard.press("Enter")

  const picker = page.getByRole("dialog")
  await expect(picker).toBeVisible()

  const target = picker.locator('[data-slot="list-item"]').first()
  await expect(target).toBeVisible()

  const key = await target.getAttribute("data-key")
  if (!key) throw new Error("Failed to resolve model key from list item")

  const name = (await target.locator("span").first().innerText()).trim()
  if (!name) throw new Error("Failed to resolve model name from list item")

  await page.keyboard.press("Escape")
  await expect(picker).toHaveCount(0)

  const settings = await openSettings(page)

  await settings.getByRole("tab", { name: "Models" }).click()
  const search = settings.getByPlaceholder("Search models")
  await expect(search).toBeVisible()
  await search.fill(name)

  const toggle = settings.locator('[data-component="switch"]').filter({ hasText: name }).first()
  const input = toggle.locator('[data-slot="switch-input"]')
  await expect(toggle).toBeVisible()
  await expect(input).toHaveAttribute("aria-checked", "true")

  await toggle.locator('[data-slot="switch-control"]').click()
  await expect(input).toHaveAttribute("aria-checked", "false")

  await toggle.locator('[data-slot="switch-control"]').click()
  await expect(input).toHaveAttribute("aria-checked", "true")

  await closeDialog(page, settings)

  await page.locator(promptSelector).click()
  await page.keyboard.type("/model")
  await expect(command).toBeVisible()
  await command.hover()
  await page.keyboard.press("Enter")

  const pickerAgain = page.getByRole("dialog")
  await expect(pickerAgain).toBeVisible()

  await expect(pickerAgain.locator(`[data-slot="list-item"][data-key="${key}"]`)).toBeVisible()

  await page.keyboard.press("Escape")
  await expect(pickerAgain).toHaveCount(0)
})

test("model defaults and auto-review settings persist", async ({ page, gotoSession, sdk }) => {
  await gotoSession()

  const settings = await openSettings(page)
  await settings.getByRole("tab", { name: "Models" }).click()

  const defaultSelect = settings.locator(settingsModelDefaultSelector)
  const reviewSelect = settings.locator(settingsModelReviewSelector)
  const autoReview = settings.locator(settingsModelAutoReviewSelector)

  await expect(defaultSelect).toBeVisible()
  await expect(reviewSelect).toBeVisible()
  await expect(autoReview).toBeVisible()

  const defaultValue = defaultSelect.locator('[data-slot="select-select-trigger-value"]')
  const reviewValue = reviewSelect.locator('[data-slot="select-select-trigger-value"]')

  const currentDefault = (await defaultValue.textContent())?.trim() ?? ""
  await defaultSelect.locator('[data-slot="select-select-trigger"]').click()
  const defaultItems = page.locator('[data-slot="select-select-item"]')
  await expect(defaultItems.first()).toBeVisible()
  if (currentDefault) {
    await defaultItems.filter({ hasNotText: currentDefault }).first().click()
  }
  if (!currentDefault) {
    await defaultItems.nth(1).click()
  }

  const beforeCfg = (await sdk.global.config.get()).data?.auto_review?.model
  const currentReview = (await reviewValue.textContent())?.trim() ?? ""
  await reviewSelect.locator('[data-slot="select-select-trigger"]').click()
  const reviewItems = page.locator('[data-slot="select-select-item"]')
  await expect(reviewItems.first()).toBeVisible()
  const reviewItem = currentReview ? reviewItems.filter({ hasNotText: currentReview }).first() : reviewItems.nth(1)
  if (currentReview) {
    await reviewItem.click()
  }
  if (!currentReview) {
    await reviewItem.click()
  }
  await expect
    .poll(async () => {
      return (await sdk.global.config.get()).data?.auto_review?.model
    })
    .not.toBe(beforeCfg)

  const autoReviewInput = autoReview.locator('[data-slot="switch-input"]')
  const before = await autoReviewInput.getAttribute("aria-checked")
  await autoReview.locator('[data-slot="switch-control"]').click()
  const after = await autoReviewInput.getAttribute("aria-checked")
  expect(before).not.toBe(after)

  await expect
    .poll(async () => {
      return await page.evaluate((key) => {
        const raw = localStorage.getItem(key)
        return raw ? JSON.parse(raw) : null
      }, settingsKey)
    })
    .toMatchObject({
      models: {
        autoReview: after === "true",
        defaultModel: {
          providerID: expect.any(String),
          modelID: expect.any(String),
        },
        reviewModel: {
          providerID: expect.any(String),
          modelID: expect.any(String),
        },
      },
    })

  await closeDialog(page, settings)
  await page.reload()

  const rehydrated = await openSettings(page)
  await rehydrated.getByRole("tab", { name: "Models" }).click()

  const autoReviewRehydrated = rehydrated.locator(settingsModelAutoReviewSelector).locator('[data-slot="switch-input"]')
  await expect(autoReviewRehydrated).toHaveAttribute("aria-checked", after ?? "false")

  await closeDialog(page, rehydrated)
})

test("prompt auto-review button toggles with settings", async ({ page, gotoSession }) => {
  await gotoSession()

  const button = page.locator(promptAutoReviewSelector)
  await expect(button).toBeVisible()

  const before = await button.getAttribute("aria-pressed")
  await button.click()
  const after = await button.getAttribute("aria-pressed")
  expect(before).not.toBe(after)

  const settings = await openSettings(page)
  await settings.getByRole("tab", { name: "Models" }).click()
  const toggle = settings.locator(settingsModelAutoReviewSelector).locator('[data-slot="switch-input"]')
  await expect(toggle).toHaveAttribute("aria-checked", after ?? "false")
  await closeDialog(page, settings)
})
