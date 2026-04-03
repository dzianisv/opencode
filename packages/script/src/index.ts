import semver from "semver"
import path from "path"
import { parseGitHubRemote } from "@opencode-ai/util/github"

const root = path.resolve(import.meta.dir, "../../..")
const rootPkgPath = path.join(root, "package.json")
const rootPkg = await Bun.file(rootPkgPath).json()
const expectedBunVersion = rootPkg.packageManager?.split("@")[1]
const dec = new TextDecoder()

if (!expectedBunVersion) {
  throw new Error("packageManager field not found in root package.json")
}

// relax version requirement
const expectedBunVersionRange = `^${expectedBunVersion}`

if (!semver.satisfies(process.versions.bun, expectedBunVersionRange)) {
  throw new Error(`This script requires bun@${expectedBunVersionRange}, but you are using bun@${process.versions.bun}`)
}

const env = {
  OPENCODE_CHANNEL: process.env["OPENCODE_CHANNEL"],
  OPENCODE_BUMP: process.env["OPENCODE_BUMP"],
  OPENCODE_VERSION: process.env["OPENCODE_VERSION"],
  OPENCODE_RELEASE: process.env["OPENCODE_RELEASE"],
}

function git(...cmd: string[]) {
  const out = Bun.spawnSync({
    cmd: ["git", ...cmd],
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
  })
  if (out.exitCode !== 0) return ""
  return dec.decode(out.stdout).trim()
}

function repo(url: string) {
  const remote = parseGitHubRemote(url)
  if (remote) return `${remote.owner}/${remote.repo}`
  const clean = url.replace(/\.git$/, "").replace(/\/$/, "")
  const part = clean.split(/[:/]/).slice(-2).join("/")
  return part || clean
}

const REMOTE = (() => {
  const list = git("remote", "-v")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => x.split(/\s+/))
    .filter((x) => x.length >= 3 && x[2] === "(fetch)")
    .map((x) => ({ name: x[0], repo: repo(x[1]) }))
    .filter((x) => x.repo)
  const item = list.find((x) => x.name === "origin") ?? list.find((x) => x.name === "upstream") ?? list[0]
  return item?.repo ?? ""
})()
const CHANNEL = await (async () => {
  if (env.OPENCODE_CHANNEL) return env.OPENCODE_CHANNEL
  if (env.OPENCODE_BUMP) return "latest"
  if (env.OPENCODE_VERSION && !env.OPENCODE_VERSION.startsWith("0.0.0-")) return "latest"
  return git("branch", "--show-current")
})()
const IS_PREVIEW = CHANNEL !== "latest"
const pkgs = ["@vibetechnologies/opencode", "opencode-ai"]

const VERSION = await (async () => {
  if (env.OPENCODE_VERSION) return env.OPENCODE_VERSION
  if (IS_PREVIEW) return `0.0.0-${CHANNEL}-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}`
  const version = await (async () => {
    for (const pkg of pkgs) {
      const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}/latest`)
      if (!res.ok) continue
      const data = (await res.json()) as { version: string }
      if (CHANNEL === "latest" && data.version.startsWith("0.0.0-")) continue
      return data.version
    }
    throw new Error("Could not determine latest npm version")
  })()
  const [major, minor, patch] = version.split(".").map((x: string) => Number(x) || 0)
  const t = env.OPENCODE_BUMP?.toLowerCase()
  if (t === "major") return `${major + 1}.0.0`
  if (t === "minor") return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
})()
const DESCRIBE = git("describe", "--tags", "--always", "--dirty")
const DISPLAY = REMOTE && DESCRIBE ? `${REMOTE} ${DESCRIBE}` : REMOTE || DESCRIBE || VERSION

const bot = ["actions-user", "opencode", "opencode-agent[bot]"]
const teamPath = path.resolve(import.meta.dir, "../../../.github/TEAM_MEMBERS")
const team = [
  ...(await Bun.file(teamPath)
    .text()
    .then((x) => x.split(/\r?\n/).map((x) => x.trim()))
    .then((x) => x.filter((x) => x && !x.startsWith("#")))),
  ...bot,
]

export const Script = {
  get channel() {
    return CHANNEL
  },
  get version() {
    return VERSION
  },
  get display() {
    return DISPLAY
  },
  get preview() {
    return IS_PREVIEW
  },
  get release(): boolean {
    return !!env.OPENCODE_RELEASE
  },
  get team() {
    return team
  },
}
console.log(`opencode script`, JSON.stringify(Script, null, 2))
