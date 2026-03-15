#!/usr/bin/env bun
import { $ } from "bun"
import pkg from "../package.json"
import { fileURLToPath } from "url"

const dir = fileURLToPath(new URL("..", import.meta.url))
process.chdir(dir)

const scope = "@vibetechnologies"
const baseName = "opencode"

const binaries: Record<string, string> = {}
for (const filepath of new Bun.Glob("*/package.json").scanSync({ cwd: "./dist" })) {
  const innerPkg = await Bun.file(`./dist/${filepath}`).json()
  // innerPkg.name is like "opencode-darwin-x64"
  // We change it to "@dzianisv/opencode-darwin-x64"
  const newName = `${scope}/${innerPkg.name}`
  innerPkg.name = newName
  
  await Bun.file(`./dist/${filepath}`).write(JSON.stringify(innerPkg, null, 2))
  
  binaries[newName] = innerPkg.version
}

console.log("binaries", binaries)
const version = Object.values(binaries)[0]

await $`mkdir -p ./dist/${baseName}`
await $`cp -r ./bin ./dist/${baseName}/bin`
await $`cp ./script/postinstall.mjs ./dist/${baseName}/postinstall.mjs`
await Bun.file(`./dist/${baseName}/LICENSE`).write(await Bun.file("../../LICENSE").text())

await Bun.file(`./dist/${baseName}/package.json`).write(
  JSON.stringify(
    {
      name: `${scope}/${baseName}`,
      bin: {
        [baseName]: `./bin/${baseName}`,
      },
      scripts: {
        postinstall: "bun ./postinstall.mjs || node ./postinstall.mjs",
      },
      version: version,
      license: pkg.license,
      optionalDependencies: binaries,
    },
    null,
    2,
  ),
)

// Publish all platform binaries
for (const dirName of Object.keys(binaries).map(name => name.replace(`${scope}/`, ''))) {
  if (process.platform !== "win32") {
    await $`chmod -R 755 .`.cwd(`./dist/${dirName}`)
  }
  await $`bun pm pack`.cwd(`./dist/${dirName}`)
  await $`npm publish *.tgz --access public --tag dev`.cwd(`./dist/${dirName}`)
}

// Publish main package
await $`cd ./dist/${baseName} && bun pm pack && npm publish *.tgz --access public --tag dev`
