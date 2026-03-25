#!/usr/bin/env bun

import { $ } from "bun"
import path from "path"

async function sign(bin: string) {
  if ((await $`${bin} --version`.nothrow()).exitCode === 0) return
  if ((await $`codesign --verify --verbose=4 ${bin}`.nothrow()).exitCode === 0) return
  await $`codesign --remove-signature ${bin}`.nothrow()
  const res = await $`codesign --force --sign - ${bin}`.nothrow()
  if (res.exitCode === 0) {
    await $`codesign --verify --verbose=4 ${bin}`
    return
  }
  await $`${bin} --version`
}

const dir = path.resolve(import.meta.dir, "..")
const os = process.platform === "win32" ? "windows" : process.platform

if (os !== "darwin") process.exit(0)

const arch = process.arch === "x64" ? "x64" : process.arch === "arm64" ? "arm64" : process.arch
const bin = path.join(dir, "dist", `opencode-${os}-${arch}`, "bin", "opencode")

process.chdir(dir)

await sign(bin)
