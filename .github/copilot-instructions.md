# Ace Attorney Demo Engine - AI Instructions

## Project Overview
This is a web-based visual novel engine mimicking the "Ace Attorney" style. It uses a data-driven architecture where the game content is separated from the engine logic.

## Architecture
- **Engine Core**: `js/script.js` handles the game loop, text parsing, and DOM manipulation.
- **Game Data**: `game.json` contains the dialogue scripts, scene flow, and in-text commands.
- **Styling**: `css/style.css` manages the 16:9 responsive layout and layering (background, character, UI).
- **Assets**: Stored in `assets/` and referenced via relative paths in `script.js` configuration.

## Critical Workflows
- **Running the Game**: Must be served via a local web server (e.g., XAMPP, Python `http.server`, VS Code Live Server) because `game.json` is loaded via `fetch()`. Opening `index.html` directly via `file://` will fail due to CORS.
- **Adding Content**:
  1. Add assets to `assets/`.
  2. Register new characters/backgrounds in `js/script.js` (`characters` and `backgrounds` objects).
  3. Write dialogue in `game.json`.

## Data Structures & Conventions

### `game.json` Structure
The JSON file is a dictionary of "sections". Each section is an array of dialogue objects.
```json
{
  "Section_Name": [
    {
      "name": "Character Name",
      "text": "Dialogue text with {commands}."
    }
  ]
}
```

### Text Commands (Embedded in Dialogue)
The engine parses commands enclosed in `{}` within the `text` string.
- **Visuals**:
  - `{bg:Key}`: Change background (keys defined in `script.js`).
  - `{sprite:CharName["Emotion"]}`: Change character sprite.
  - `{fadeInCharacter}` / `{fadeOutCharacter}`: Fade character in or out.
  - `{showCharacter}` / `{hideCharacter}`: Toggle character visibility.
  - `{flash}`: Trigger a white flash effect.
- **Flow Control**:
  - `{p:Milliseconds}`: Pause typing for X ms.
  - `{skip:Milliseconds}`: Auto-advance after X ms.
  - `{jump:SectionName}`: Jump to a new section.
  - `{jumpIf:VarName,TrueSection,FalseSection}`: Conditional jump based on `gameState`.
  - `{setState:VarName,Value}`: Update a variable in `gameState`.
- **Text Styling**:
  - `{color:ColorName}`: Change text color (e.g., `{color:#ff5555}`).

### Asset Configuration (`js/script.js`)
- **Characters**: Nested object structure: `CharacterName -> Emotion -> State (default/talking)`.
  ```javascript
  const characters = {
      "Oldbag": {
          "Embarrassed": {
              "default": "path/to/static.webp",
              "talking": "path/to/anim.webp"
          }
      }
  };
  ```
- **Backgrounds**: Simple key-value mapping.
  ```javascript
  const backgrounds = {
      "JoyPolis": "assets/backgrounds/FlyHigh_JoyPolis.png"
  };
  ```

## Common Patterns
- **State Management**: Use `gameState` object in `script.js` for flags (e.g., `hasMetOldbag`).
- **Typing Effect**: The `typeWriter` function handles text rendering. Avoid manipulating `textContent` directly; use `updateDialogue`.
- **Sprite States**: Characters have `default` (idle) and `talking` states. The engine automatically switches to `talking` while text is typing and reverts to `default` when done.
