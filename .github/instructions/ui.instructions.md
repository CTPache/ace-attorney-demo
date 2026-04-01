---
description: "Use when editing UI menus, config/history behavior, title-screen controls, single-screen mode, responsive layout, or CSS styling in js/ui and css. Covers localization attributes, screen-mode checks, and when a UI change also requires shared runtime updates."
name: "UI And Layout Guidelines"
applyTo: "js/ui/**, css/**"
---

# UI And Layout Guidelines

- Preserve the current split between UI state logic in `js/ui/` and shared engine behavior elsewhere. If a UI change affects keyboard shortcuts, evidence flow, investigation behavior, or title-screen orchestration, inspect adjacent runtime files such as `js/key-events.js`, `js/court-record.js`, `js/investigation.js`, or `js/title-screen.js` before editing.
- Respect single-screen mode as a first-class layout, not a fallback. Changes to menus, overlays, top-bar controls, or fullscreen panels should be checked against both normal two-screen mode and the `M` / `S` flow.
- Follow existing stylesheet boundaries. Prefer the most focused CSS file for the feature area, such as `css/single-screen.css`, `css/investigation.css`, or `css/menus.css`, instead of appending unrelated rules to a general stylesheet.
- The UI relies heavily on container-query units such as `cqh` and `cqw`. Match the existing responsive sizing approach unless there is a clear reason to change it.
- Keep layering and pointer-event behavior deliberate. Many single-screen overlays depend on `z-index`, `pointer-events`, and DOM reparenting to keep controls interactive over the top screen.
- For localized UI text, use `data-i18n`, `data-i18n-title`, and `data-i18n-aria-label`, then add matching keys to `assets/i18n/ui-text.json`.
- Maintain menu open/close behavior carefully. Config, history, court record, investigation, topic, and gallery flows all interact with shared input-blocking and close-stack behavior.
- Avoid introducing duplicate UI state. Reuse existing globals and helper functions when wiring button state, autoplay state, or title-only config behavior.
- Representative references: `js/ui/config-history.js` for menu state and autoplay interactions, `js/ui/screen-mode.js` for orientation-driven mode changes, and `css/single-screen.css` for overlay and stacking patterns.

## Manual Checks

- Verify the affected UI in both standard two-screen mode and single-screen mode.
- If the change touches menus or overlays, test keyboard closure behavior, especially `Escape`, plus any affected button-disabled states.
- If the change adds or changes visible copy, confirm the corresponding UI localization keys exist in `assets/i18n/ui-text.json`.