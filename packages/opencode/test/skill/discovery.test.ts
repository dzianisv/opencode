import { describe, test, expect } from "bun:test"
import { Discovery } from "../../src/skill/discovery"
import path from "path"

const CLOUDFLARE_SKILLS_URL = "https://developers.cloudflare.com/.well-known/skills/"
const remote = process.env.OPENCODE_TEST_REMOTE_SKILLS === "1"
const check = remote ? test : test.skip

describe("Discovery.pull", () => {
  check(
    "downloads skills from cloudflare url",
    async () => {
      const dirs = await Discovery.pull(CLOUDFLARE_SKILLS_URL)
      expect(dirs.length).toBeGreaterThan(0)
      for (const dir of dirs) {
        expect(dir).toStartWith(Discovery.dir())
        const md = path.join(dir, "SKILL.md")
        expect(await Bun.file(md).exists()).toBe(true)
      }
    },
    30_000,
  )

  check(
    "url without trailing slash works",
    async () => {
      const dirs = await Discovery.pull(CLOUDFLARE_SKILLS_URL.replace(/\/$/, ""))
      expect(dirs.length).toBeGreaterThan(0)
      for (const dir of dirs) {
        const md = path.join(dir, "SKILL.md")
        expect(await Bun.file(md).exists()).toBe(true)
      }
    },
    30_000,
  )

  test("returns empty array for invalid url", async () => {
    const dirs = await Discovery.pull("https://example.invalid/.well-known/skills/")
    expect(dirs).toEqual([])
  })

  test("returns empty array for non-json response", async () => {
    const dirs = await Discovery.pull("https://example.com/")
    expect(dirs).toEqual([])
  })

  check(
    "downloads reference files alongside SKILL.md",
    async () => {
      const dirs = await Discovery.pull(CLOUDFLARE_SKILLS_URL)
      // find a skill dir that should have reference files (e.g. agents-sdk)
      const agentsSdk = dirs.find((d) => d.endsWith("/agents-sdk"))
      if (agentsSdk) {
        const refs = path.join(agentsSdk, "references")
        expect(await Bun.file(path.join(agentsSdk, "SKILL.md")).exists()).toBe(true)
        // agents-sdk has reference files per the index
        const refDir = await Array.fromAsync(new Bun.Glob("**/*.md").scan({ cwd: refs, onlyFiles: true }))
        expect(refDir.length).toBeGreaterThan(0)
      }
    },
    30_000,
  )

  check(
    "caches downloaded files on second pull",
    async () => {
      // first pull to populate cache
      const first = await Discovery.pull(CLOUDFLARE_SKILLS_URL)
      expect(first.length).toBeGreaterThan(0)

      // second pull should return same results from cache
      const second = await Discovery.pull(CLOUDFLARE_SKILLS_URL)
      expect(second.length).toBe(first.length)
      expect(second.sort()).toEqual(first.sort())
    },
    60_000,
  )
})
