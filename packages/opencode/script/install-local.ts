#!/usr/bin/env bun

import { $ } from "bun"
import fs from "fs/promises"
import path from "path"

const dir = path.resolve(import.meta.dir, "..")
const os = process.platform === "win32" ? "windows" : process.platform
const arch = process.arch === "x64" ? "x64" : process.arch === "arm64" ? "arm64" : process.arch
const src = path.join(dir, "dist", `opencode-${os}-${arch}`, "bin", os === "windows" ? "opencode.exe" : "opencode")
const dst = path.join(process.env.HOME || "", ".local", "bin", os === "windows" ? "opencode.exe" : "opencode")
const tmp = `${dst}.${process.pid}.tmp`

process.chdir(dir)

await fs.mkdir(path.dirname(dst), { recursive: true })
await fs.rm(tmp, { force: true })
await fs.copyFile(src, tmp)
await fs.rm(dst, { force: true })
await fs.rename(tmp, dst)

if (os !== "windows") {
  await fs.chmod(dst, 0o755)
}

if (os === "darwin") {
  await $`codesign --remove-signature ${dst}`.nothrow()
  await $`codesign --force --sign - ${dst}`
  await $`codesign --verify --verbose=4 ${dst}`
}
