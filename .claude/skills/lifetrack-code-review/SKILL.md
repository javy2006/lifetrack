---
name: lifetrack-code-review
description: Use to review a proposed LifeTrack diff for correctness, regressions, accessibility, and test coverage before reporting completion.
---
# LifeTrack code review

- Review the actual diff and relevant call sites. Lead with actionable findings, ordered by severity, with file and line references. State uncertainty where evidence is incomplete.
- Treat `src/lifetrack/game/` as authoritative financial and gameplay logic. Do not change its formulas, policy values, scoring, AI strategy, seeded events, or save/resume behavior without explicit scope and evidence.
- Check state transitions, invalid/terminal states, duplicate actions, persistence compatibility, and UI-to-reducer boundaries where relevant.
- Check responsive behavior, accessibility, and whether existing tests cover affected behavior. Run only checks requested by the user or task instructions; never weaken existing assertions to get a pass.
- Separate verified defects from suggestions. Do not edit files during a review unless the user also asked for fixes.
