import type { Page } from "@playwright/test"
import { test, expect } from "../fixtures"
import { withSession } from "../actions"
import { promptSelector } from "../selectors"
import { modKey } from "../utils"
import type { E2EWindow } from "../../src/testing/terminal"

const voiceStub = async (page: Page) => {
  await page.addInitScript(() => {
    const win = window as E2EWindow
    win.__opencode_e2e = {
      ...win.__opencode_e2e,
      voice: {
        starts: 0,
        cancels: 0,
        spoken: [],
      },
    }

    class FakeUtterance {
      text: string
      lang: string
      rate: number

      constructor(text = "") {
        this.text = text
        this.lang = ""
        this.rate = 1
      }
    }

    class FakeRecognition {
      continuous = false
      interimResults = false
      lang = "en-US"
      onstart: ((event: Event) => void) | null = null
      onend: ((event: Event) => void) | null = null
      onerror: ((event: { error?: string; message?: string }) => void) | null = null
      onresult: ((event: { resultIndex: number; results: ArrayLike<unknown> }) => void) | null = null

      start() {
        const state = (window as E2EWindow).__opencode_e2e?.voice
        if (state) state.starts = (state.starts ?? 0) + 1
        this.onstart?.(new Event("start"))
        queueMicrotask(() => {
          this.onresult?.({
            resultIndex: 0,
            results: [
              {
                0: { transcript: "voice prompt seeded" },
                isFinal: true,
                length: 1,
              },
            ],
          })
          this.onend?.(new Event("end"))
        })
      }

      stop() {
        this.onend?.(new Event("end"))
      }

      abort() {
        this.onend?.(new Event("end"))
      }
    }

    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      writable: true,
      value: FakeUtterance,
    })
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        cancel() {
          const state = (window as E2EWindow).__opencode_e2e?.voice
          if (state) state.cancels = (state.cancels ?? 0) + 1
        },
        speak(utterance: { text?: string }) {
          const state = (window as E2EWindow).__opencode_e2e?.voice
          if (!state) return
          state.spoken = [...(state.spoken ?? []), utterance.text ?? ""]
        },
      },
    })
    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      writable: true,
      value: FakeRecognition,
    })
  })
}

test("voice controls transcribe prompt input and speak completed replies", async ({ page, sdk, gotoSession }) => {
  test.setTimeout(120_000)

  await voiceStub(page)

  await withSession(sdk, `e2e voice ${Date.now()}`, async (session) => {
    await gotoSession(session.id)

    const voice = page.locator('[data-action="prompt-voice"]').first()
    const speaker = page.locator('[data-action="prompt-speaker"]').first()
    const prompt = page.locator(promptSelector)

    await expect(voice).toBeVisible()
    await expect(speaker).toBeVisible()

    await voice.click()

    await expect
      .poll(() => page.evaluate(() => (window as E2EWindow).__opencode_e2e?.voice?.starts ?? 0), { timeout: 10_000 })
      .toBe(1)

    await expect
      .poll(async () => (await prompt.textContent()) ?? "", { timeout: 10_000 })
      .toContain("voice prompt seeded")

    await speaker.click()
    await expect(speaker).toHaveAttribute("aria-pressed", "true")

    await page.reload()
    await expect(page.locator(promptSelector)).toBeVisible()
    await expect(page.locator('[data-action="prompt-speaker"]').first()).toHaveAttribute("aria-pressed", "true")

    const token = `VOICE_REPLY_${Date.now()}`
    await page.locator(promptSelector).click()
    await page.keyboard.press(`${modKey}+A`)
    await page.keyboard.type(`Reply with exactly: ${token}`)
    await page.keyboard.press("Enter")

    await expect
      .poll(
        async () => {
          const messages = await sdk.session.messages({ sessionID: session.id, limit: 50 }).then((r) => r.data ?? [])
          return messages
            .filter((message) => message.info.role === "assistant")
            .flatMap((message) => message.parts)
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join("\n")
        },
        { timeout: 90_000 },
      )
      .toContain(token)

    await expect
      .poll(
        async () =>
          page
            .evaluate(() => (window as E2EWindow).__opencode_e2e?.voice?.spoken ?? [])
            .then((list) => list.some((text) => text.includes(token))),
        { timeout: 30_000 },
      )
      .toBe(true)
  })
})
