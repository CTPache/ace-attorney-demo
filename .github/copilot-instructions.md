# Ace Attorney Demo Engine - AI Instructions

## Project Overview
This is a web-based visual novel engine mimicking the "Ace Attorney" style. It uses a data-driven architecture where the game content is separated from the engine logic.

## Architecture
- **Engine Core**: Split into modules:
  - `js/DOMGlobals.js`: Centralized DOM element references.
  - `js/globals.js`: Global state variables and data containers.
  - `js/engine.js`: Game loop and high-level script execution.
  - `js/parser.js`: Optimized Regex-based text parsing.
  - `js/text-renderer.js`: Handles text typing, skipping logic. Delegates logic to `script-actions.js`.
  - `js/animations.js`: Manages complex CSS/WebP animations defined in JSON timelines.
  - `js/script-actions.js`: Executes non-rendering game logic (state, evidence, audio, flow).
  - `js/ui.js`: High-level UI state management and transition logic.
  - `js/court-record.js`: Evidence/Profiles inventory and presenting logic.
  - `js/investigation.js`: Investigation mode (examining, moving) logic.
  - `js/topics.js`: Topic selection menu logic.
  - `js/media.js`: Audio playback and visual effects.
  - `js/key-events.js`: Centralized global keyboard shortcuts.
  - `js/loader.js`: Asset preloading.
  - `js/main.js`: Initialization, entry point, and Scene Loading.
- **Game Data**: `game.json` (or split scene files) contains dialogue scripts, scene flow, asset definitions, and in-text commands.
- **Styling**: 
  - `css/style.css`: Main layout, layering, and core UI styles. Uses Container Query Units (`cqh`) for aspect-ratio independent scaling.
  - `css/investigation.css`: Specific styles for the investigation menu and buttons.
  - `css/move.css`: Styles for the Move menu grid and 3D perspectives.
- **Assets**: Stored in `assets/` and referenced via relative paths in `game.json`.

## Critical Workflows
- **Running the Game**: Must be served via a local web server (e.g., XAMPP, Python `http.server`, VS Code Live Server) because `game.json` is loaded via `fetch()`.
- **URL Parameters**:
  - `?lang=EN|ES|JP`: Sets initial UI/scene language.
  - `?scene=path_or_key`: Sets initial scene key relative to language scene folder (example: `?scene=detention_center`).
  - Scene loading falls back to English if the selected language file is missing.
- **Adding Content**:
  1. Add assets to `assets/`.
  2. Register new assets (characters, backgrounds, audio) in the respective sections of `game.json`.
  3. Write dialogue in `game.json` under `gameScript`.

## Data Structures & Conventions

### `scene.json` Structure
The JSON file acts as the central database.
```json
{
  "characters": { ... },
  "backgrounds": { ... },
  "evidence": { ... },
  "profiles": { ... },
  "investigations": { ... },
  "Topics": { ... },
  "sounds": { ... },
  "music": { ... },
  "videos": { ... },
  "options": { ... },
  "gameScript": {
    "Section_Name": [
      {
        "name": "Character Name",
        "text": "Dialogue text with {commands}."
      }
    ]
  }
}
```

### Text Commands (Embedded in Dialogue)
The engine parses commands enclosed in `{}` within the `text` string.

**Visuals:**
- `{bg:Key}`: Change background.
- `{bgMove:PositionName}` / `{bgMove:PositionName,Duration}`: Move a positioned background to a named position (e.g., `{bgMove:top}` or `{bgMove:bottom,600}`). Supports optional duration in milliseconds (default 400ms). Requires background to have `positions` object in JSON.
- `{fg:Key}`: Change foreground (e.g., bars, overlays).
- `{sprite:CharName["Emotion"]}`: Change character sprite. Automatically shows character if hidden.
- `{fadeInCharacter}` / `{fadeOutCharacter}`: Fade character in or out.
- `{fadeInCharacter:Duration}` / `{fadeOutCharacter:Duration}`: Fade character with custom duration in milliseconds.
- `{showCharacter}` / `{hideCharacter}`: Toggle character visibility instantly.
- `{playAnimation:Name}`: Plays an animation sequence from `assets/animations/Name.json`. Pauses text until done.
- `{hideTextbox}` / `{showTextbox}`: Toggle the dialogue box visibility.
- `{flash}`: Trigger a white flash effect.
- `{shake:Milliseconds}`: Trigger a temporary screen shake effect.
- `{playVideo:Key}`: Play a top-screen video sequence from the `videos` DB.
- `{stopVideo}`: Stop the currently playing video sequence.

**Audio:**
- `{blip:Type,Speak}`: Change text blip. `Speak` is (opt) boolean. If false, mouth doesn't move. Types: 1: Male, 2: Female, 3: Typewriter, 4: Silence.
- `{playSound:Key}`: Play a sound effect once.
- `{startBGM:Key}`: Start looping background music.
- `{stopBGM}` / `{stopBGM:false}`: Stop BGM (default fades out, pass `false` for instant cut).

**Fade Effects:**
- `{fadeBg:Key}`: Fade out current background, change to new background, fade in.
- `{fadeOutBg}`: Fade out current background.
- `{fadeInBg}`: Fade in current background.
- `{fadeFg:Key}`: Fade out current foreground, change to new foreground, fade in.
- `{fadeOutFg}`: Fade out current foreground.
- `{fadeInFg}`: Fade in current foreground.
- `{fadeInCharacter}` / `{fadeOutCharacter}`: Fade character in or out (use built-in command, optional duration).
- `{fadeInCharacter:Duration}` / `{fadeOutCharacter:Duration}`: Fade with custom duration in milliseconds (e.g., `{fadeInCharacter:500}`).
- All fade commands support optional duration: `{fadeBg:Key,Duration}`, `{fadeOutBg:300}`, `{fadeInFg:500}`, etc. Default is 400ms.
- Multiple fades execute simultaneously and the engine waits for the longest duration to complete.

**Flow Control:**
- `{p:Milliseconds}`: Pause typing for X ms.
- `{skip:Milliseconds}`: Auto-advance after X ms.
- `{jump:SectionName}`: Jump to a new section.
- `{jumpIf:VarName,TrueSection,FalseSection}`: Conditional jump based on `gameState`. `FalseSection` is (opt); if omitted, continues to next line on false.
- `{setState:VarName,Value}`: Update a variable in `gameState`.
- `{option:Key}`: Display a list of choices defined in `options` db.
- `{setGameOver:Label}`: Sets the section to jump to if a Game Over occurs.
- `{checkpoint:SectionName}`: Sets the restart point for Game Over screens. If unset, restarts from the beginning.
- `{endGame}`: Triggers the "THE END" overlay and stops execution.

**Text Styling & Formatting:**
- `{color:ColorName}`: Change text color (e.g., `{color:#ff5555}`).
- `{center}`: Center align the text for the current line.
- `{nl}`: Insert a new line (line break).
- `{textSpeed:Milliseconds}`: Change typing speed for the current line.

**Gameplay Features:**
- `{addEvidence:Key,ShowPopup}`: Add item to Court Record. Auto-sets `gameState['evidence_Key']=true`.
- `{addProfile:Key,ShowPopup}`: Add profile to Court Record profile inventory.
- `{removeEvidence:Key}`: Remove item from Court Record and clear its game state.
- `{updateEvidence:OldKey,NewKey,ShowPopup}`: Replace an evidence item with another.
- `{topicUnlock:Key}`: Unlock a conversation topic.
- `{sectionEnd}`: Trigger the topic selection menu at the end of the current section.
- `{lifeMod:Amount}`: Add/Subtract from the life bar (e.g., `{lifeMod:-2}`).
- `{showLifeBar:Penalty}`: Show the life bar (optional penalty preview).
- `{hideLifeBar}`: Hide the life bar.

### Asset Configuration (`scene.json`)
- **Characters**: Nested object structure: `CharacterName -> Emotion -> State (default/talking)`.
- **Backgrounds**: Can be either:
  - Simple string: `"BackgroundName": "assets/path/to/image.png"`
  - Positioned object (for panning/scrolling):
    ```json
    "BackgroundName": {
      "path": "assets/path/to/image.png",
      "positions": {
        "default": "top",
        "top": [0, 0],
        "middle": [100, 200],
        "bottom": [0, -300]
      }
    }
    ```
    The `positions` object maps position names to `[x, y]` pixel offsets. The `default` key specifies which position loads initially. Use `{bgMove:positionName}` to move to different positions.
- **Evidence/Profiles**: Objects with `name`, `description`, and `image`.
- **Topics**: Objects with `text` (display name) and `label` (target section).
- **Investigations**: Keyed by background name. Can be an array (points only) or an object structure:
  - `default`: (opt) Section to jump to when clicking empty space.
  - `move`: Array of objects defines locations to travel to:
    - `label`: Button text.
    - `target`: Section to jump to.
    - `preview`: Background key for hover preview.
    - `json`: (Opt) Path to a new JSON file to load (Scene Change).
  - `points`: Array of objects with `bounds` (polygon coordinates) and `label` (target section).
- **Sounds/Music**: Key-value mapping to file paths.
- **Videos**: Key-value object where each key maps to a video definition containing at least a `file` path and optional caption/script entries.
- **Options**: Dialogue choice definitions used by `{option:Key}`.

## Common Patterns
- **Scene Management**: Support for multiple JSON/Scene files. Use `window.loadGameData()` or the `json` property in investigation moves. Evidence inventory is preserved (merged) across scenes.
- **Language Switching**: Changing language from the config menu reloads the current scene in the new language, resets line progression to the beginning, and clears dialogue history.
- **State Management**: Use `gameState` object in `js/globals.js` for flags.
- **Typing Effect**: `typeWriter` in `js/engine.js` handles rendering.
- **Sprite States**: Characters automatically switch between `default` and `talking` states during text rendering.
- **Responsive Design**: The UI relies on Container Queries (`cqh`) to maintain a 16:9 aspect ratio.
- **UI Theme**: Primary interaction buttons use a consistent "Wood" theme.
- **Keyboard Shortcuts**:
  - `A`: Toggle Auto Play.
  - `G`: Open/close Config menu.
  - `M`: Toggle single-screen mode.
  - `S`: Switch active screen in single-screen mode.
  - `Escape`: Close Config/History menus.
