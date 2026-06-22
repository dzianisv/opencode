---
name: fork-deliver
description: >-
  Deliver a change from the local dev branch to npm as @vibetechnologies/opencode.
  Use whenever changes are ready to ship: push to origin/dev, trigger fork-publish
  CI, monitor the run, and verify the installed binary shows the correct semver.
  Triggers: "ship this", "publish to npm", "deliver the fix", "push and verify",
  "release this change", "monitor and own task end to end".
metadata:
  author: opencode-fork
  version: "1.0"
---

<role>
You own the delivery of this fork's changes to npm. Not done until
`npm install -g @vibetechnologies/opencode && opencode -v` shows `dzianisv/opencode <VERSION>`.
</role>

<trigger_conditions>
`fork-publish` CI only fires when BOTH conditions are true:
1. Push is to branch `dev` (not a feature branch).
2. `packages/opencode/package.json` changed in the pushed commit(s).

If neither the workflow nor the package.json changed, bump the version to force a re-publish.
</trigger_conditions>

<procedure>

## Step 1 — Pre-push checks

```bash
# typecheck must be clean before pushing
cd packages/opencode && bun typecheck
cd -

# Confirm version in package.json is NOT already on npm
VERSION=$(node -p "require('./packages/opencode/package.json').version")
npm view "@vibetechnologies/opencode@${VERSION}" version 2>/dev/null \
  && echo "ALREADY PUBLISHED — bump version first" \
  || echo "OK to publish ${VERSION}"
```

If already published, bump:
```bash
# edit packages/opencode/package.json: increment patch version
# then commit: git add packages/opencode/package.json && git commit -m "chore(opencode): bump to X.Y.Z"
```

## Step 2 — Push to origin/dev

```bash
git push origin dev
```

The pre-push hook runs `bun turbo typecheck` automatically. It must pass.

## Step 3 — Locate the fork-publish run

```bash
# Wait ~15s for GitHub to register the run, then:
gh run list --repo dzianisv/opencode --branch dev --limit 5 \
  --json databaseId,name,status,headSha \
  | python3 -c "import json,sys; [print(r['databaseId'], r['name'], r['status'], r['headSha'][:8]) for r in json.load(sys.stdin)]"
```

Find the row named `fork publish`. Note its `databaseId`.

## Step 4 — Watch until complete

```bash
gh run watch <databaseId>
```

Expected final output:
```
✓ dev fork publish · <id>
✓ publish in ~4m
  ✓ Build Linux CLI binary
  ✓ Publish package
  ✓ Create git tag
```

If any step fails, read the log:
```bash
gh run view <databaseId> --log-failed
```

Common failures and fixes:
| Symptom | Cause | Fix |
|---------|-------|-----|
| `already exists` on Publish package | Version already on npm | Bump version, re-push |
| `bun: command not found` | setup-bun action failed | Re-run or check bun version in root package.json |
| Typecheck errors | Code change broke types | Fix types, commit, re-push |
| `OPENCODE_CHANNEL` missing | Old workflow cached | Should not occur after fix; check workflow file |

## Step 5 — Verify npm package

```bash
VERSION=$(node -p "require('./packages/opencode/package.json').version")

# Confirm it appears in npm registry
npm view "@vibetechnologies/opencode@${VERSION}" version

# Install in isolated temp dir and check --version output
TMPDIR=$(mktemp -d)
npm install --prefix "$TMPDIR" "@vibetechnologies/opencode@${VERSION}"
"$TMPDIR/node_modules/.bin/opencode" --version
```

Expected output: `dzianisv/opencode <VERSION>`
NOT: `github-v1.2.25-*` or `local` or `0.0.0-*`

If version string is wrong, the binary was built with `OPENCODE_CHANNEL: local` — see
the gotcha section below.

## Step 6 — Update worklog / close task

Append evidence to the task worklog and mark the task done only after Step 5 passes.

</procedure>

<gotchas>

### --version shows git-describe instead of semver

Symptom: `opencode -v` prints `dzianisv/opencode github-v1.2.25-509-g8c8761f07`.

Root cause: two bugs (both fixed in commit 8d74035d6 / 5a6007f6e):

1. `fork-publish.yml` build step must set:
   ```yaml
   env:
     OPENCODE_CHANNEL: latest
     OPENCODE_VERSION: ${{ steps.package.outputs.version }}
   ```
   With `OPENCODE_CHANNEL: local`, `IS_PREVIEW=true` and the binary bakes in
   `OPENCODE_VERSION = "0.0.0-local-TIMESTAMP"`.

2. `packages/core/src/installation/version.ts` must prefer `InstallationVersion`
   when it is a real semver (not `0.0.0-*` or `local`):
   ```ts
   const isDevBuild = !InstallationVersion || InstallationVersion === "local" || InstallationVersion.startsWith("0.0.0-")
   const versionPart = isDevBuild ? gitDescribe || InstallationVersion : InstallationVersion
   export const InstallationVersionDisplay = [repo, versionPart].filter(Boolean).join(" ")
   ```
   Without this, `gitDescribe = "github-v1.2.25-*"` shadows the semver because
   the upstream fork uses tag format `github-v*`, not `v1.17.*`.

If this regresses: check both files before investigating further.

### fork-publish not triggering

`fork-publish.yml` path filter is `packages/opencode/package.json`. A commit that only
touches other files will NOT trigger it. Solution: bump the version in that file.

### Version already on npm

Once published, a version cannot be re-published. Bump patch version and re-push.

</gotchas>

<done_when>
`"$TMPDIR/node_modules/.bin/opencode" --version` prints `dzianisv/opencode <VERSION>`
where VERSION matches `packages/opencode/package.json`.
</done_when>
