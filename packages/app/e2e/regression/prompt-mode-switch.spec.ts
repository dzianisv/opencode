import { expect, test } from "@playwright/test"
import { base64Encode } from "@opencode-ai/core/util/encode"
import { mockOpenCodeServer } from "../utils/mock-server"
import { expectAppVisible } from "../utils/waits"

const directory = "C:/OpenCode/PromptModeSwitchRegression"
const projectID = "proj_prompt_mode_switch_regression"
const sessionID = "ses_prompt_mode_switch_regression"

const baseProject = {
  id: projectID,
  worktree: directory,
  vcs: "git",
  name: "prompt-mode-switch-regression",
  time: { created: 1700000000000, updated: 1700000000000 },
  sandboxes: [],
}

const baseProvider = {
  all: [
    {
      id: "opencode",
      name: "OpenCode",
      models: {
        "gpt-4o": {
          id: "gpt-4o",
          name: "GPT-4o",
          limit: { context: 128_000 },
        },
      },
    },
  ],
  connected: ["opencode"],
  default: { providerID: "opencode", modelID: "gpt-4o" },
}

const baseSession = {
  id: sessionID,
  slug: "prompt-mode-switch-regression",
  projectID,
  directory,
  title: "Prompt mode switch regression",
  version: "dev",
  time: { created: 1700000000000, updated: 1700000000000 },
}

const bothAgents = [
  { name: "build", mode: "primary" },
  { name: "plan", mode: "primary" },
]

async function setupV2Session(page: Parameters<typeof mockOpenCodeServer>[0], agents = bothAgents) {
  await mockOpenCodeServer(page, {
    directory,
    project: baseProject,
    provider: baseProvider,
    sessions: [baseSession],
    agents,
    pageMessages: () => ({ items: [] }),
  })
  await page.addInitScript(() => {
    localStorage.setItem("settings.v3", JSON.stringify({ general: { newLayoutDesigns: true } }))
  })
  await page.goto(`/${base64Encode(directory)}/session/${sessionID}`)
  const composer = page.locator('[data-component="session-composer"]')
  await expectAppVisible(composer)
  return composer
}

test.describe("regression: build/plan mode toggle in v2 composer", () => {
  test("toggle is visible when both build and plan agents are available", async ({ page }) => {
    const composer = await setupV2Session(page)
    const toggle = composer.locator('[data-component="prompt-mode-toggle"]')
    await expect(toggle).toBeVisible()
    await expect(toggle.locator('[data-action="prompt-mode-build"]')).toBeVisible()
    await expect(toggle.locator('[data-action="prompt-mode-plan"]')).toBeVisible()
  })

  test("build mode is active by default", async ({ page }) => {
    const composer = await setupV2Session(page)
    const buildBtn = composer.locator('[data-action="prompt-mode-build"]')
    const planBtn = composer.locator('[data-action="prompt-mode-plan"]')
    await expect(buildBtn).toHaveAttribute("aria-pressed", "true")
    await expect(planBtn).toHaveAttribute("aria-pressed", "false")
  })

  test("clicking plan switches to plan mode", async ({ page }) => {
    const composer = await setupV2Session(page)
    const buildBtn = composer.locator('[data-action="prompt-mode-build"]')
    const planBtn = composer.locator('[data-action="prompt-mode-plan"]')

    await planBtn.click()
    await expect(planBtn).toHaveAttribute("aria-pressed", "true")
    await expect(buildBtn).toHaveAttribute("aria-pressed", "false")
  })

  test("clicking build after plan switches back to build", async ({ page }) => {
    const composer = await setupV2Session(page)
    const buildBtn = composer.locator('[data-action="prompt-mode-build"]')
    const planBtn = composer.locator('[data-action="prompt-mode-plan"]')

    await planBtn.click()
    await expect(planBtn).toHaveAttribute("aria-pressed", "true")

    await buildBtn.click()
    await expect(buildBtn).toHaveAttribute("aria-pressed", "true")
    await expect(planBtn).toHaveAttribute("aria-pressed", "false")
  })

  test("toggle sits before the model selector in DOM order", async ({ page }) => {
    const composer = await setupV2Session(page)
    const toggle = composer.locator('[data-component="prompt-mode-toggle"]')
    const modelControl = composer.locator('[data-component="prompt-input"] ~ * [data-action="prompt-model"]').first()

    // Use JS to check DOM order: toggle must precede the model control
    const toggleBefore = await page.evaluate(() => {
      const t = document.querySelector('[data-component="prompt-mode-toggle"]')
      const m = document.querySelector('[data-action="prompt-model"]')
      if (!t || !m) return null
      // Node.DOCUMENT_POSITION_FOLLOWING means m comes after t
      return !!(t.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING)
    })
    await expect(toggle).toBeVisible()
    expect(toggleBefore).toBe(true)
  })

  test("toggle is absent when only build agent exists", async ({ page }) => {
    await setupV2Session(page, [{ name: "build", mode: "primary" }])
    await expect(page.locator('[data-component="prompt-mode-toggle"]')).toHaveCount(0)
  })
})

test.describe("regression: build/plan toggle absent in v1 (legacy) layout", () => {
  test("mode toggle is NOT rendered when newLayoutDesigns is false", async ({ page }) => {
    await mockOpenCodeServer(page, {
      directory,
      project: baseProject,
      provider: baseProvider,
      sessions: [baseSession],
      agents: bothAgents,
      pageMessages: () => ({ items: [] }),
    })
    await page.addInitScript(() => {
      localStorage.setItem("settings.v3", JSON.stringify({ general: { newLayoutDesigns: false } }))
    })
    await page.goto(`/${base64Encode(directory)}/session/${sessionID}`)
    await expectAppVisible(page.locator('[data-component="session-composer"]'))
    await expect(page.locator('[data-component="prompt-mode-toggle"]')).toHaveCount(0)
  })
})
