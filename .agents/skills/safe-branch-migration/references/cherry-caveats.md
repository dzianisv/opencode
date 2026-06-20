# `git cherry` caveats for migration verification

`git cherry -v <upstream> <head>` lists each commit on `<head>` not in `<upstream>`:
- `+ <sha>` — patch is NOT in upstream (potentially dropped work)
- `- <sha>` — an equivalent patch IS already in upstream

It compares **patch-ids**, so it is only reliable when commits keep their identity.

## The squash trap (why verify against SOURCE branches, not the squashed one)

Squashing N commits into 1 creates a new commit with a new patch-id that matches none of the
originals. Therefore:

- `git cherry -v <target> <squashed-feature-branch>` **over-reports**: every original commit
  shows as `+` even though its content shipped in the squash. Untrustworthy — do not gate on it.
- `git cherry -v <target> <sibling-source-branch>` **is accurate**: sibling branches were not
  squashed, so their patch-ids are intact. This is the check that catches dropped work.

Rule: run the completeness check against the **un-squashed source branches**.

## Other cases that flip `+`/`-`

- **Rebase / cherry-pick with conflict edits** can change a patch enough that `git cherry` no
  longer matches it as `-`. A `+` here may be a false alarm — diff the actual content before
  concluding it was dropped.
- **Trailing-whitespace / line-ending normalization** changes patch-ids. If a `+` looks
  spurious, confirm with `git show <sha>` vs target content.
- **Pure-merge commits** are skipped by `git cherry` (use `--no-merges`-aware reasoning).

## Reachability cross-check (independent of patch-id)

`git cherry` is patch-based; pair it with a graph-based check:
- `git branch --contains <sha>` — which branches actually contain the commit object.
- `git merge-base --is-ancestor <sha> <branch>; echo $?` — 0 if `<sha>` is reachable from
  `<branch>`. If a commit is not an ancestor of your squash source, a path-allowlist squash
  could never have included it.

When patch-id (`git cherry`) and reachability (`--contains`) disagree, trust the content: run
`git show <sha>` and grep the target tree for the change.
