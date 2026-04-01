# Ace Attorney Demo Engine - Workspace Instructions

## Build And Run
- This repo has no npm, bundler, or automated test pipeline. Do not invent build steps.
- Run the game through HTTP only because scene data is loaded with `fetch()`.
- Supported local workflows: XAMPP at `http://localhost/Demo`, `python -m http.server 8000` from the workspace root, or VS Code Live Server on `index.html`.
- Existing VS Code tasks are utility CSS append tasks, not build or test tasks.

## Architecture
- This is a data-driven vanilla JavaScript engine. Engine behavior lives in `js/`; content lives in scene JSON under `assets/scenes/{Case}/{Language}/`.
- `index.html` loads scripts in order. Keep that load-order dependency in mind before moving logic between files.
- Core responsibilities:
  - `js/main.js`: startup, URL params, scene loading, language fallback, case-aware path handling.
  - `js/parser.js`: parses inline `{commands}` inside dialogue text.
  - `js/text-renderer.js`: typewriter flow and inline rendering behavior.
  - `js/script-actions.js`: non-rendering commands such as state, inventory, audio, and flow control.
  - `js/globals.js` and `js/DOMGlobals.js`: shared global state and cached DOM references.
  - `js/ui/`: menu, config/history, screen mode, return-to-title, and other UI-specific behavior.
- Prefer fixing shared engine behavior in JS modules instead of adding scene-specific workarounds in JSON.

## Scene And Data Conventions
- Scene files live at `assets/scenes/{Case}/{Language}/{scene}.json`. Keep that case folder in place when adding or referencing scenes.
- URL parameters supported by the engine include `?lang=EN|ES|JP`, `?case=FlyHigh|Don|LockedRoom`, and `?scene=scene_key`.
- Scene changes inside JSON should use case-relative paths without the language segment, for example `assets/scenes/FlyHigh/detention_center.json`. The loader inserts the active language.
- Scene JSON is the content database for a location or segment. Keep content changes data-only where possible.
- The topics database key is `Topics` with a capital `T`.
- Investigation polygon bounds are normalized `0-100` coordinates, not pixels.
- Positioned background movement with `{bgMove:*}` only works for backgrounds defined with `path` and `positions`, not plain string paths.
- Evidence and profile databases are merged across scene loads. New scene data extends existing inventory definitions rather than resetting them.

## Editing Guardrails
- When adding a new inline script command, update both `js/parser.js` and the module that executes it, usually `js/script-actions.js` or `js/text-renderer.js`.
- Preserve the current separation between engine logic and scene data. Do not duplicate control flow in scene JSON if the behavior belongs in the engine.
- For UI localization, use `data-i18n`, `data-i18n-title`, and `data-i18n-aria-label`, and add matching keys to `assets/i18n/ui-text.json`.
- Follow existing CSS file boundaries. Prefer editing the focused stylesheet for the feature area instead of creating ad hoc style files.
- Be careful with global state. This codebase relies heavily on shared globals, so avoid renaming or reinitializing shared containers unless the change is deliberate.

## Verification
- There is no automated test suite, so verify behavior manually in the browser.
- For gameplay or layout changes, check both normal two-screen mode and single-screen mode, including the `M` and `S` flow.
- If you touch scene loading, language handling, or scene switching, verify fallback behavior with at least one non-English scene.
