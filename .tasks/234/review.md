## Review: postinstall.mjs scoped package fix (#234)

### Files checked
- `packages/opencode/script/postinstall.mjs`

### Findings
- `packages/opencode/script/postinstall.mjs:52` — was `const packageName = \`opencode-${platform}-${arch}\``
- Now reads own `package.json`, extracts scope, prepends it to package name
- Logic: `selfPkg.name.replace(/[^/]+$/, "")` correctly handles both scoped and unscoped names
- No security issues: only reads local `package.json`, no new shell calls or network access
- Backward compatible: for `"opencode-ai"` (unscoped), regex yields `""`, producing same result as before
- Error message now shows correct scoped name (e.g. `@vibetechnologies/opencode-linux-x64`)

**VERDICT: pass**
