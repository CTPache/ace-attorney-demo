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
  - `js/script-actions.js`: Executes non-rendering game logic (state, evidence, audio, flow).
  - `js/ui.js`: High-level UI state management and transition logic.
  - `js/court-record.js`: Evidence/Profiles inventory and presenting logic.
  - `js/investigation.js`: Investigation mode (examining, moving) logic.
  - `js/topics.js`: Topic selection menu logic.
  - `js/media.js`: Audio playback and visual effects.
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
- `{sprite:CharName["Emotion"]}`: Change character sprite. Automatically shows character if hidden.
- `{fadeInCharacter}` / `{fadeOutCharacter}`: Fade character in or out.
- `{showCharacter}` / `{hideCharacter}`: Toggle character visibility instantly.
- `{flash}`: Trigger a white flash effect.

**Audio:**
- `{blip:Type,Speak}`: Change text blip. `Speak` is (opt) boolean. If false, mouth doesn't move. Types: 1: Male, 2: Female, 3: Typewriter, 4: Silence.
- `{playSound:Key}`: Play a sound effect once.
- `{startBGM:Key}`: Start looping background music.
- `{stopBGM}` / `{stopBGM:false}`: Stop BGM (default fades out, pass `false` for instant cut).

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
- `{removeEvidence:Key}`: Remove item from Court Record and clear its game state.
- `{updateEvidence:OldKey,NewKey,ShowPopup}`: Replace an evidence item with another.
- `{topicUnlock:Key}`: Unlock a conversation topic.
- `{sectionEnd}`: Trigger the topic selection menu at the end of the current section.
- `{lifeMod:Amount}`: Add/Subtract from the life bar (e.g., `{lifeMod:-2}`).
- `{showLifeBar:Penalty}`: Show the life bar (optional penalty preview).
- `{hideLifeBar}`: Hide the life bar.

### Asset Configuration (`scene.json`)
- **Characters**: Nested object structure: `CharacterName -> Emotion -> State (default/talking)`.
- **Backgrounds**: Key-value mapping to file paths.
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

## Common Patterns
- **Scene Management**: Support for multiple JSON/Scene files. Use `window.loadGameData()` or the `json` property in investigation moves. Evidence inventory is preserved (merged) across scenes.
- **State Management**: Use `gameState` object in `js/globals.js` for flags.
- **Typing Effect**: `typeWriter` in `js/engine.js` handles rendering.
- **Sprite States**: Characters automatically switch between `default` and `talking` states during text rendering.
- **Responsive Design**: The UI relies on Container Queries (`cqh`) to maintain a 16:9 aspect ratio.
- **UI Theme**: Primary interaction buttons use a consistent "Wood" theme.
