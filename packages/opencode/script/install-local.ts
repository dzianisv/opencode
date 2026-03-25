#!/usr/bin/env bun

import { $ } from "bun"
import path from "path"

const dir = path.resolve(import.meta.dir, "..")
const os = process.platform === "win32" ? "windows" : process.platform
const arch = process.arch === "x64" ? "x64" : process.arch === "arm64" ? "arm64" : process.arch
const src = path.join(dir, "dist", `opencode-${os}-${arch}`, "bin", os === "windows" ? "opencode.exe" : "opencode")
const dst = path.join(process.env.HOME || "", ".local", "bin", os === "windows" ? "opencode.exe" : "opencode")

process.chdir(dir)

await $`mkdir -p ${path.dirname(dst)}`

if (os === "windows") {
  await $`cp ${src} ${dst}`
}

if (os !== "windows") {
  const res = await $`ln -sf ${src} ${dst}`.nothrow()
  if (res.exitCode !== 0) await $`cp ${src} ${dst}`
}

if (os !== "windows") {
  await $`chmod +x ${dst}`
}
