---
description: "Add or revise scene content in this Ace Attorney demo engine. Use for dialogue updates, new branches, move destinations, investigations, evidence, profiles, and scene-local content changes."
name: "Add Scene Content"
argument-hint: "Describe the scene content change you want, including case, language, scene, and target section if known"
agent: "agent"
---

Update scene content for this workspace using the user's request and any attached files.

Workflow:

1. Identify the target case, language, scene file, and section before editing. Inspect the matching file under `assets/scenes/{Case}/{Language}/` and confirm whether the request is content-only or actually needs engine support.
2. Preserve scene-data conventions while editing:
   - Keep scene links case-relative without inserting the language segment.
   - Use `Topics` with a capital `T`.
   - Keep investigation bounds normalized `0-100`.
   - Reuse existing key patterns for evidence, profiles, move entries, and options.
3. If the requested behavior requires a new inline `{command}` or unsupported command behavior, stop treating it as a JSON-only edit. Update the engine path instead by checking `js/parser.js` and the relevant executor in `js/script-actions.js` or `js/text-renderer.js`.
4. When the request likely affects localized scene parity, note that EN, ES, and JP counterparts may also need updates. Only make multi-language content edits automatically if the user asked for them or the surrounding files clearly require them.
5. Keep edits minimal and consistent with nearby scene structure. Do not rewrite unrelated dialogue or reformat large JSON blocks without need.
6. Finish by reporting:
   - Which scene files changed.
   - Whether the request stayed content-only or required engine work.
   - Any manual browser checks needed, especially for move links, investigation hotspots, scene switches, or language fallback.

Use the existing workspace instructions and any matching scoped instructions as the source of truth for repo conventions.