declare global {
  const OPENCODE_VERSION: string
  const OPENCODE_CHANNEL: string
  const OPENCODE_REPO: string
  const OPENCODE_GIT_DESCRIBE: string
}

export const InstallationVersion = typeof OPENCODE_VERSION === "string" ? OPENCODE_VERSION : "local"
export const InstallationChannel = typeof OPENCODE_CHANNEL === "string" ? OPENCODE_CHANNEL : "local"
export const InstallationLocal = InstallationChannel === "local"
const repo = typeof OPENCODE_REPO === "string" ? OPENCODE_REPO : ""
const gitDescribe = typeof OPENCODE_GIT_DESCRIBE === "string" ? OPENCODE_GIT_DESCRIBE : ""
export const InstallationVersionDisplay = [repo, gitDescribe || InstallationVersion].filter(Boolean).join(" ")
