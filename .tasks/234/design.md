## Problem

`packages/opencode/script/postinstall.mjs` hardcodes the platform binary package name as `opencode-${platform}-${arch}` (unscoped). When the opencode package is published under an npm scope (e.g. `@vibetechnologies/opencode`), the platform-specific optional deps also get scoped names. The postinstall fails because `require.resolve("opencode-linux-x64/package.json")` can't find `@vibetechnologies/opencode-linux-x64`.

## Goal

The postinstall script correctly resolves the platform-specific binary package regardless of whether the main package is scoped or unscoped.

## Success Metric

- `node postinstall.mjs` succeeds when run inside a package whose `name` is `opencode-ai` (unscoped) OR `@vibetechnologies/opencode` (scoped)
- Existing install path for `opencode-ai` remains unbroken

## Out of Scope

- The `@vibetechnologies/opencode` fork's publish pipeline itself — only the postinstall script that ships with every fork.

## Current State

`packages/opencode/script/postinstall.mjs:50-69` — `findBinary()` constructs:
```js
const packageName = `opencode-${platform}-${arch}`
```
This is correct for `opencode-ai` (unscoped) but wrong for scoped forks.

## Proposed Design

Read the package's own `package.json` `name` field, extract the npm scope (everything before the last `/`), and prepend it:

```js
const selfPkg = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf8"))
const scope = selfPkg.name.replace(/[^/]+$/, "")
const packageName = `${scope}opencode-${platform}-${arch}`
```

- `"opencode-ai"` → scope `""` → `packageName` = `"opencode-linux-x64"` ✅
- `"@vibetechnologies/opencode"` → scope `"@vibetechnologies/"` → `packageName` = `"@vibetechnologies/opencode-linux-x64"` ✅

## Alternatives Considered

1. **Match by suffix from optionalDependencies** — more robust against naming variations, but fragile if multiple variants match (e.g. `opencode-linux-x64` and `opencode-linux-x64-musl` both end with same suffix).
2. **Hardcode scope as build parameter** — requires build system changes; breaks the auto-derivation property.
3. **Pass scope via env var** — fragile, easy to forget.

## Risks & Open Questions

- None identified. The change is backward compatible: for unscoped names `replace(/[^/]+$/, "")` yields empty string, producing the same result as before.

## Touched Surface

- `packages/opencode/script/postinstall.mjs`
