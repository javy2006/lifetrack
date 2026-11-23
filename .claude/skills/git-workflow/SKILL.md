---
name: git-workflow
description: Use for safe source-control inspection and reversible Git operations in the LifeTrack repository.
---
# LifeTrack safe Git workflow

- Start with `git status --short --branch` and inspect the relevant diff before any Git operation. Preserve unrelated user changes.
- Prefer small, reviewable changes. Never discard, reset, clean, force-push, amend, rebase, or rewrite history unless the user explicitly asks for that exact operation.
- Do not stage or commit unless asked. If asked to commit, stage only the intended files and inspect the staged diff first.
- Before switching branches or resolving conflicts, check for uncommitted work and preserve it. Do not overwrite user files to make a branch operation succeed.
- Report the branch and working-tree outcome accurately. Keep secrets, local configuration, generated output, and unrelated files out of commits.
