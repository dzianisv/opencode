#!/usr/bin/env node

import fs from "fs"
import path from "path"
import os from "os"
import { fileURLToPath } from "url"
import { createRequire } from "module"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

function detectPlatformAndArch() {
  // Map platform names
  let platform
  switch (os.platform()) {
    case "darwin":
      platform = "darwin"
      break
    case "linux":
      platform = "linux"
      break
    case "win32":
      platform = "windows"
      break
    default:
      platform = os.platform()
      break
  }

  // Map architecture names
  let arch
  switch (os.arch()) {
    case "x64":
      arch = "x64"
      break
    case "arm64":
      arch = "arm64"
      break
    case "arm":
      arch = "arm"
      break
    default:
      arch = os.arch()
      break
  }

  return { platform, arch }
}

function findBinary() {
  const { platform, arch } = detectPlatformAndArch()
  const packageName = `opencode-${platform}-${arch}`

  try {
    // Use require.resolve to find the package
    const packageJsonPath = require.resolve(`${packageName}/package.json`)
    const packageDir = path.dirname(packageJsonPath)
    const binaryPath = path.join(packageDir, "bin", platform === "windows" ? "opencode.exe" : "opencode")

    if (!fs.existsSync(binaryPath)) {
      throw new Error(`Binary not found at ${binaryPath}`)
    }

    return { binaryPath }
  } catch (error) {
    throw new Error(`Could not find package ${packageName}: ${error.message}`)
  }
}

function installBinary(sourcePath, targetPath) {
  if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath)
  try {
    fs.linkSync(sourcePath, targetPath)
  } catch {
    fs.copyFileSync(sourcePath, targetPath)
  }
  fs.chmodSync(targetPath, 0o755)
}

async function main() {
  try {
    if (os.platform() === "win32") {
      // On Windows, the .exe is already included in the package and bin field points to it
      // No postinstall setup needed
      console.log("Windows detected: binary setup not needed (using packaged .exe)")
      return
    }

    // On non-Windows platforms, just verify the binary package exists
    // Install the native binary directly so `opencode` does not keep a Node wrapper process alive.
    const { binaryPath } = findBinary()
    const cacheTarget = path.join(__dirname, "bin", ".opencode")
    const entryTarget = path.join(__dirname, "bin", "opencode")
    installBinary(binaryPath, cacheTarget)
    installBinary(binaryPath, entryTarget)
  } catch (error) {
    console.error("Failed to setup opencode binary:", error.message)
    process.exit(1)
  }
}

try {
  main()
} catch (error) {
  console.error("Postinstall script error:", error.message)
  process.exit(0)
}
