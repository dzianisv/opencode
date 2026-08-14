#!/usr/bin/env node

const childProcess = require("child_process")
const fs = require("fs")
const path = require("path")

const scriptDir = path.dirname(fs.realpathSync(__filename))
const installed = path.join(scriptDir, "opencode.exe")
const source = path.join(scriptDir, "..", "src", "index.ts")
const child = childProcess.spawn(
  fs.existsSync(installed) ? installed : "bun",
  fs.existsSync(installed)
    ? ["session-offload", ...process.argv.slice(2)]
    : ["run", "--conditions=browser", source, "session-offload", ...process.argv.slice(2)],
  { stdio: "inherit" },
)
const signals = ["SIGINT", "SIGTERM", "SIGHUP"]
const forwarders = {}

for (const signal of signals) {
  forwarders[signal] = () => child.kill(signal)
  process.on(signal, forwarders[signal])
}

child.on("error", (error) => {
  console.error(error.message)
  process.exit(1)
})

child.on("exit", (code, signal) => {
  for (const forwardedSignal of signals) process.removeListener(forwardedSignal, forwarders[forwardedSignal])
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(typeof code === "number" ? code : 1)
})
