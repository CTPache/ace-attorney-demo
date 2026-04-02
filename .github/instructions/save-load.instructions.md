---
description: "Use when editing save/load behavior, localStorage persistence, snapshot or restore flow, or the save/load UI in the config menu, title screen, and related runtime loading hooks."
name: "Save/Load Guidelines"
applyTo: "js/save-load.js, js/save-load/**, js/ui/config-history.js, js/title-screen.js, js/main.js, index.html"
---

# Save/Load Guidelines

- Treat save/load as orchestration over shared globals. When persisting new state, update `window.buildSaveDataSnapshot()` plus the matching restore logic in `window.restoreCoreStateForLoad()`, and add any visual or UI replay in `window.restoreVisualStateForLoad()` or `window.resumeDialogueForLoad()`.
- Keep the browser-storage contract stable unless the change is deliberate. Saves currently live in `localStorage` under `ace_attorney_save_{slot}` and are blocked when `currentSceneRequestPath` is empty.
- Preserve script load order. `js/save-load/helpers.js` must load before `js/save-load.js`, and both depend on globals and runtime hooks defined earlier in `index.html`.
- Loading should stay case-aware and language-aware through `window.loadGameData(path, startSection, isLoadingSave)` in `js/main.js`. Do not bypass scene normalization or language fallback when restoring a save.
- The current UI is single-slot. Save/load buttons in `js/ui/config-history.js` and the title-screen load button in `js/title-screen.js` all call slot `1`; if you add slots, update all entry points and any visible copy together.
- Be careful with open menus, autoplay, fast-forward, court-record visibility, and title-screen visibility when loading. The helper flow intentionally closes menus, clears timers, hides title and case-select screens, reloads scene data if needed, and only then resumes dialogue.
- Representative references: `js/save-load/helpers.js` for snapshot and restore helpers, `js/save-load.js` for top-level entry points, and `js/main.js` for scene reload behavior.

## Manual Checks

- Save from an active scene, then load both from the config menu and from the title screen.
- Re-test after a language change or scene change to confirm the loader still resolves the correct case and language path.
- If you add new persisted UI or gameplay state, verify it survives reload and that menus or overlays are not left visually stuck.
