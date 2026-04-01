---
description: "Use when editing scene JSON, dialogue, investigations, move destinations, evidence, profiles, topics, or branching content under assets/scenes. Covers case-aware scene links, scene data conventions, and when a request needs engine support instead of JSON-only changes."
name: "Scene JSON Guidelines"
applyTo: "assets/scenes/**/*.json"
---

# Scene JSON Guidelines

- Treat scene files as content databases. Keep dialogue, move destinations, investigations, evidence, profiles, music, and options in JSON; move shared behavior changes into the engine instead of scripting around them per scene.
- Preserve the scene path structure `assets/scenes/{Case}/{Language}/{scene}.json`. Inside scene JSON, cross-scene links in `move[*].json` should stay case-relative without the language segment, for example `assets/scenes/FlyHigh/office.json`.
- Keep content edits consistent with the active case. Do not move files between case folders or introduce paths that skip the case directory.
- Use `Topics` with a capital `T`. Lowercase `topics` will not be loaded.
- Investigation polygons use normalized `0-100` coordinates, not pixels. Keep hotspot bounds authored for relative positioning.
- Evidence and profile databases merge across scene loads. Add or update keys deliberately to avoid collisions with existing inventory definitions.
- For positioned backgrounds, only use movement patterns such as `{bgMove:*}` when the referenced background is defined as an object with `path` and `positions`.
- Keep inline dialogue commands aligned with existing engine support. If a request needs a new `{command}` or new command behavior, update `js/parser.js` plus the relevant executor in `js/script-actions.js` or `js/text-renderer.js` instead of inventing unsupported scene syntax.
- When editing a content flow that spans multiple languages, verify whether matching EN, ES, and JP files need parity. Do not assume localized files should diverge unless the request says so.
- Follow existing scene patterns before introducing new keys. Representative references: `assets/scenes/FlyHigh/EN/detention_center.json` for move links, evidence entries, and content flow; `js/main.js` for case-aware loading and language fallback.

## Manual Checks

- If you changed scene links, sanity-check that the destination path still resolves through the current case and language.
- If you changed investigation data, verify hotspot behavior in the browser and confirm empty-space fallback still works when defined.
- If you changed localized content, verify at least one affected language file still loads cleanly.