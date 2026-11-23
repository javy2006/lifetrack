# Claude Code skills for LifeTrack

These project-level skills live in `.claude/skills/` and are discoverable by Claude Code when opened in this repository. Invoke them by their skill names (for example `/frontend-design` or `/playwright-testing`), or let Claude Code select a skill from its description.

| Skill | Use it for | Guardrail |
| --- | --- | --- |
| `frontend-design` | React screen design, responsive UI, visual polish | Preserves existing illustrations, design language, and engine/UI separation |
| `threejs-development` | Explicit Three.js or React Three Fiber scene work | Checks React 19/R3F 9 compatibility; installs no packages without authorization |
| `playwright-testing` | Browser flows, interaction checks, responsive QA | Uses existing browser tooling and reports only observed results |
| `lifetrack-code-review` | Diff review and regression assessment | Treats financial/game logic as authoritative; review-only unless fixes are requested |
| `git-workflow` | Safe Git inspection and requested source-control operations | Avoids destructive history/worktree operations and protects unrelated changes |

## Naming

The review skill is named `lifetrack-code-review`, not `code-review`. A project skill with the same name as a Claude Code built-in replaces the built-in for this repository. While it was called `code-review`, it hid Claude Code's own `/code-review` command, including `/code-review ultra`. With the `lifetrack-` prefix, both are available: `/lifetrack-code-review` runs the LifeTrack checklist, and `/code-review` runs Claude Code's built-in review. The other four names don't clash with any built-in command, so they are unchanged.

## Browser QA script

`scripts/qa/journey.mjs` drives a full LifeTrack game in headless Microsoft Edge for the `playwright-testing` workflow. It imports `playwright-core`, which is **not** a project dependency and is not listed in `package.json` or `pnpm-lock.yaml`. Install it temporarily in a folder outside the project, copy the script next to it, and run it there. ES modules resolve imports relative to the script, so `NODE_PATH` does not work:

```bash
npm i --prefix ../lt-qa playwright-core@1.49.1
cp scripts/qa/journey.mjs ../lt-qa/
node ../lt-qa/journey.mjs http://127.0.0.1:5174/ ./qa-shots
```

It uses the browser already installed on the machine (`channel: 'msedge'`) and downloads no browsers. Screenshots in `qa-shots/` are git-ignored.

## Source and scope

This is a deliberately small set of project-authored instruction files, informed by the inspected sources below. The skills are not executable code and add no npm dependencies or Claude plugins. For each task, use only the relevant skill. None authorizes starting a later LifeTrack phase or changing financial logic outside the user's requested scope.

- Anthropic's [frontend-design skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md): brief-specific design decisions, responsive/accessibility quality, and self-critique.
- Microsoft's [Playwright CLI skill](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/tools/skills/playwright-cli/SKILL.md): inspected as a testing reference. Its command instructions depend on `playwright-cli`, which is not installed here; this project skill instead directs Claude to existing tooling.
- OpenAI's [React Three Fiber game skill](https://github.com/openai/plugins/blob/main/plugins/game-studio/skills/react-three-fiber-game/SKILL.md) and the inspected [R3F v9 / React 19 guide](https://github.com/b-open-io/prompts/blob/master/modules/creative/skills/threejs-r3f/SKILL.md): used as architecture/performance references, with unneeded plugin references and package installation steps omitted.
- `lifetrack-code-review` and `git-workflow` are project-specific instructions based on LifeTrack's preservation requirements and standard safe review practices; no third-party plugin is needed.

The repository currently uses React 19 and does not list Three.js, React Three Fiber, Playwright or `playwright-core` as dependencies. These skills do not add or imply those dependencies.
