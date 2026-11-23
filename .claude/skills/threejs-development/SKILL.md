---
name: threejs-development
description: Use only when LifeTrack work explicitly involves Three.js, WebGL, or React Three Fiber scenes.
---
# LifeTrack Three.js and React Three Fiber

- First inspect the installed React and 3D package versions, the current scene architecture, and the official compatibility documentation. LifeTrack uses React 19; React Three Fiber v9 is the matching major line. Do not assume a package is installed.
- Do not install or upgrade packages unless the user explicitly requests implementation that needs them. Check Three.js, Fiber, Drei, and browser support versions before proposing code.
- Keep the existing game reducer and financial engine authoritative. 3D components render state and dispatch typed existing actions; they never own or recompute game rules.
- Keep menus, HUD, settings, and accessible controls in the DOM unless a specific interaction requires 3D. Isolate Canvas, camera, asset loading, and scene concerns.
- For animation, use frame delta and refs for transient per-frame mutations; avoid React state updates each frame. Reuse geometry/materials, cap device pixel ratio, and consider mobile GPU limits and reduced motion.
- Keep assets local and verify loading, disposal, responsive sizing, keyboard alternatives, and fallback behavior. Do not begin a deferred project phase unless asked.

References:
- R3F documentation: https://r3f.docs.pmnd.rs/
- Three.js documentation: https://threejs.org/docs/
- Reviewed R3F 9 / React 19 skill: https://github.com/b-open-io/prompts/blob/master/modules/creative/skills/threejs-r3f/SKILL.md
