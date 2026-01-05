# Ace Attorney Demo Engine - AI Instructions

## Project Overview
This is a web-based visual novel engine mimicking the "Ace Attorney" style. It uses a data-driven architecture where the game content is separated from the engine logic.

## Architecture
- **Engine Core**: Split into modules:
  - `js/globals.js`: Global state and data containers.
  - `js/engine.js`: Game loop, text parsing, and script execution.
  - `js/ui.js`: UI interaction (buttons, menus, court record).
  - `js/media.js`: Audio playback and visual effects.
  - `js/loader.js`: Asset preloading.
  - `js/main.js`: Initialization and entry point.
- **Game Data**: `game.json` contains dialogue scripts, scene flow, asset definitions, and in-text commands.
- **Styling**: `css/style.css` manages the 16:9 responsive layout, layering, and mobile responsiveness.
- **Assets**: Stored in `assets/` and referenced via relative paths in `game.json`.

## Critical Workflows
- **Running the Game**: Must be served via a local web server (e.g., XAMPP, Python `http.server`, VS Code Live Server) because `game.json` is loaded via `fetch()`.
- **Adding Content**:
  1. Add assets to `assets/`.
  2. Register new assets (characters, backgrounds, audio) in the respective sections of `game.json`.
  3. Write dialogue in `game.json` under `gameScript`.

## Data Structures & Conventions

### `game.json` Structure
The JSON file acts as the central database.
```json
{
  "characters": { ... },
  "backgrounds": { ... },
  "evidence": { ... },
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
- `{sprite:CharName["Emotion"]}`: Change character sprite.
- `{fadeInCharacter}` / `{fadeOutCharacter}`: Fade character in or out.
- `{showCharacter}` / `{hideCharacter}`: Toggle character visibility instantly.
- `{flash}`: Trigger a white flash effect.

**Audio:**
- `{blip:Type}`: Change text blip sound (1: Male, 2: Female, 3: Typewriter, 4: Silence).
- `{playSound:Key}`: Play a sound effect once.
- `{startBGM:Key}`: Start looping background music.
- `{stopBGM}` / `{stopBGM:false}`: Stop BGM (default fades out, pass `false` for instant cut).

**Flow Control:**
- `{p:Milliseconds}`: Pause typing for X ms.
- `{skip:Milliseconds}`: Auto-advance after X ms.
- `{jump:SectionName}`: Jump to a new section.
- `{jumpIf:VarName,TrueSection,FalseSection}`: Conditional jump based on `gameState`.
- `{setState:VarName,Value}`: Update a variable in `gameState`.

**Text Styling & Formatting:**
- `{color:ColorName}`: Change text color (e.g., `{color:#ff5555}`).
- `{center}`: Center align the text for the current line.
- `{nl}`: Insert a new line (line break).
- `{textSpeed:Milliseconds}`: Change typing speed for the current line.

**Gameplay Features:**
- `{addEvidence:Key,ShowPopup}`: Add item to Court Record. `ShowPopup` is optional (default true).
- `{topicUnlock:Key}`: Unlock a conversation topic.
- `{showTopics}`: Trigger the topic selection menu at the end of the current section.

### Asset Configuration (`game.json`)
- **Characters**: Nested object structure: `CharacterName -> Emotion -> State (default/talking)`.
- **Backgrounds**: Key-value mapping to file paths.
- **Evidence**: Objects with `name`, `description`, and `image`.
- **Topics**: Objects with `text` (display name) and `label` (target section).
- **Sounds/Music**: Key-value mapping to file paths.

## Common Patterns
- **State Management**: Use `gameState` object in `js/globals.js` for flags.
- **Typing Effect**: `typeWriter` in `js/engine.js` handles rendering.
- **Sprite States**: Characters automatically switch between `default` and `talking` states during text rendering.
