---
name: frontend-design
description: Use when shaping LifeTrack React screens, interaction design, responsive layouts, or visual polish. Do not use for engine or financial-rule changes.
---
# LifeTrack frontend design

- Inspect the existing screen, components, design tokens, and related project notes before proposing a visual change. Preserve the established LifeTrack art direction and illustrations.
- Make a compact design decision for hierarchy, typography, color, spacing, and responsive behavior before editing. Avoid generic dashboard patterns and unnecessary new UI.
- Build with the existing React 19, TypeScript, and Tailwind CSS v4 setup. Keep components focused and follow existing conventions; do not add packages for styling.
- Keep game calculations and authoritative game state out of presentation components. Respect accessibility: semantic controls, keyboard focus, readable contrast, and reduced motion.
- Check the changed screen at mobile and desktop sizes when browser tooling is available. Keep changes within the user's requested phase and scope.
