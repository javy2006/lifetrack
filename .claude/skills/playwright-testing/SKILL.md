---
name: playwright-testing
description: Use for browser interaction checks, gameplay walkthroughs, console/error checks, and responsive visual QA.
---
# LifeTrack Playwright and responsive QA

- Inspect `package.json`, existing browser-test configuration, and available browser tools first. Use the repository's current setup; do not install Playwright, playwright-cli, browsers, or other packages as a side effect.
- For visual QA, test the requested viewport sizes independently and record what was actually observed. Check overflow, visibility, keyboard interaction, modal/action-bar fit, and console errors.
- For gameplay, follow the user flow through existing UI. Use a test save when available; do not modify financial rules or production save data to make a walkthrough easier.
- Prefer stable accessible locators and observable outcomes. Avoid brittle implementation-detail selectors and fixed sleeps when a state-based wait is available.
- Report untested steps and tooling limitations plainly. Do not claim a browser check based only on a successful build or source inspection.

References:
- Playwright documentation: https://playwright.dev/docs/intro
- Reviewed Microsoft Playwright CLI skill (requires a CLI this project has not installed): https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/tools/skills/playwright-cli/SKILL.md
