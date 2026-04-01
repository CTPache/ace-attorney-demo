# Ace Attorney Demo Engine Guide

This guide is for people authoring content or extending scenes in this engine. It documents how the runtime loads scenes, how scene JSON is structured, which inline commands are supported, and the main conventions you need to follow so scenes load correctly.

## 1. Running The Engine

This project is a vanilla JavaScript browser engine. There is no npm setup, bundler, or automated test pipeline.

Use one of these local workflows:

- XAMPP: `http://localhost/Demo`
- Python: run `python -m http.server 8000` from the workspace root
- VS Code Live Server: open `index.html` through Live Server

Do not open the project with `file://`. Scene data is loaded with `fetch()`, so it must be served over HTTP.

## 2. Project Layout

High-level structure:

- `index.html`: loads the runtime scripts in order
- `js/`: engine logic
- `css/`: UI and layout styles
- `assets/scenes/{Case}/{Language}/`: scene JSON files
- `assets/animations/`: animation timelines and optional CSS
- `assets/audio/`, `assets/img/`: media assets
- `assets/i18n/ui-text.json`: UI localization strings

Important runtime files:

- `js/main.js`: startup, URL parameters, case-aware scene loading, language fallback
- `js/parser.js`: parses inline `{commands}` inside dialogue text
- `js/text-renderer.js`: typewriter rendering, pauses, fades, animation/video waits
- `js/script-actions.js`: non-rendering command execution such as inventory, flow state, audio, and courtroom state
- `js/cross-examination.js`: cross-examination loop logic
- `js/globals.js` and `js/DOMGlobals.js`: shared runtime state and cached DOM references

Because scripts are loaded in order and share globals, be careful when moving logic between files.

## 3. How Scene Loading Works

Scene files live here:

`assets/scenes/{Case}/{Language}/{scene}.json`

Examples:

- `assets/scenes/FlyHigh/EN/intro.json`
- `assets/scenes/FlyHigh/ES/office.json`
- `assets/scenes/LockedRoom/JP/intro.json`

The loader supports these URL parameters:

- `?case=FlyHigh|Don|LockedRoom`
- `?lang=EN|ES|JP`
- `?scene=scene_key`

Example:

`http://localhost/Demo/?case=FlyHigh&lang=EN&scene=detention_center`

Language fallback behavior:

1. The engine first tries the requested scene in the active language.
2. If that file is missing, it tries the English version.
3. If that also fails, it falls back to the original requested path.

Inside scene JSON, cross-scene links should omit the language segment. Use paths like this:

```json
"json": "assets/scenes/FlyHigh/office.json"
```

The loader inserts the active language automatically.

## 4. Scene JSON Structure

Each scene file is the database for one location or sequence. Not every key is required, but these are the main top-level sections the engine understands:

```json
{
  "initialSection": "Intro",
  "actions": {
    "move": true,
    "examine": true,
    "talk": false,
    "present": false
  },
  "characters": {},
  "backgrounds": {},
  "foregrounds": {},
  "sounds": {},
  "music": {},
  "videos": {},
  "evidence": {},
  "profiles": {},
  "Topics": {},
  "investigations": {},
  "move": [],
  "options": {},
  "courtroom": {},
  "crossExaminations": {},
  "gameScript": {}
}
```

### Required Or Common Top-Level Keys

`initialSection`

- The section name the engine enters when the scene first loads.

`actions`

- Controls which bottom-screen action buttons are available.
- Supported keys: `move`, `examine`, `talk`, `present`
- Omitted keys default to enabled if `actions` is missing entirely.

`gameScript`

- The main scene script.
- Keys are section names.
- Values are arrays of dialogue entries.

Example:

```json
"gameScript": {
  "Intro": [
    {
      "text": "{bg:Office}{sprite:Shawit[\"Stand\"]}Welcome."
    },
    {
      "name": "Phoenix",
      "text": "I have a few questions."
    }
  ]
}
```

Dialogue entry fields:

- `name`: optional speaker name shown in the name tag
- `text`: dialogue text, including inline `{commands}`

## 5. Asset Databases

### Characters

Characters are defined as:

```json
"characters": {
  "Phoenix": {
    "Normal": {
      "default": "assets/img/characters/Common/Phoenix/normal.webp",
      "talking": "assets/img/characters/Common/Phoenix/normal_talking.webp"
    }
  }
}
```

Character emotion objects can also include timed one-shot animation metadata:

- `time`: how long the animation should block the line before continuing
- `shake`: array of timed shake events
- `sound`: array of timed sound events

Example:

```json
"Damage": {
  "default": "assets/img/characters/Fly High/Shawit/Damage.webp",
  "time": 700,
  "shake": [{ "at": 0, "duration": 300 }],
  "sound": [{ "at": 0, "sound": "damage2" }]
}
```

### Backgrounds

Simple background:

```json
"backgrounds": {
  "Office": "assets/img/backgrounds/Fly High/FlyHigh_Office.png"
}
```

Positioned background for panning or vertical movement:

```json
"backgrounds": {
  "Crime_Scene": {
    "path": "assets/img/backgrounds/Fly High/Scene_body.png",
    "positions": {
      "default": "bottom",
      "top": [0, 0],
      "bottom": [0, -81.9]
    }
  }
}
```

Courtroom stand backgrounds can also use `background`, `foreground`, and `positions`.

### Foregrounds

Foregrounds are simple key-to-path mappings:

```json
"foregrounds": {
  "Detention_Bars": "assets/img/backgrounds/Common/Detention_Center_foreground.png"
}
```

### Sounds

```json
"sounds": {
  "evidenceUnlock": "assets/audio/se/evidence_unlock.ogg"
}
```

Use these keys with `{playSound:Key}`.

### Music

Looping music:

```json
"music": {
  "grossberg": "assets/audio/bgm/bgm026.m4a"
}
```

Intro-plus-loop music:

```json
"music": {
  "investigation": [
    "assets/audio/bgm/bgm001.m4a",
    "assets/audio/bgm/bgm001lp.m4a"
  ]
}
```

Use these keys with `{startBGM:Key}`.

### Videos

Videos are looked up in `videosDB` by key. Each entry must contain `file` and may contain a timed caption script.

Example:

```json
"videos": {
  "IntroVideo": {
    "file": "assets/video/intro.mp4",
    "script": [
      {
        "timestamp": 0,
        "name": "Narrator",
        "text": "The curtain rises...",
        "duration": 1800
      }
    ]
  }
}
```

Caption script formats accepted by the engine:

- `script: []`
- `script.lines: []`
- `script.entries: []`

Each caption entry must have a numeric `timestamp`. The guide text is rendered through the normal dialogue pipeline, so caption lines can use `name` and `text` like any other dialogue line.

### Evidence And Profiles

Evidence example:

```json
"evidence": {
  "blog_post_charm": {
    "name": "Blog Post - Glasses Charm",
    "data": "Type: Evidence",
    "description": "Posted at 9:27 PM on the day of the incident.",
    "image": "assets/img/evidence/Screen.png"
  }
}
```

Profile entries use the same general structure.

Important behavior:

- Evidence and profile databases merge across scene loads.
- Loading a new scene extends the global databases instead of resetting them.
- Avoid accidental key collisions unless you intentionally want to update a prior definition.

## 6. Investigation, Move, Topics, And Options

### Investigations

Investigation hotspots are keyed by background name.

```json
"investigations": {
  "Crime_Scene": {
    "default": "Examine_Default",
    "points": [
      {
        "bounds": [63, 50, 40, 50, 40, 65, 63, 65],
        "label": "Examine_Body"
      }
    ]
  }
}
```

Rules:

- `bounds` uses normalized `0-100` coordinates, not pixels
- `label` is the section to jump to when the hotspot is clicked
- `default` is the section to jump to when empty space is clicked

### Move Destinations

```json
"move": [
  {
    "label": "Office",
    "target": "Office_Init",
    "preview": "Office",
    "json": "assets/scenes/FlyHigh/office.json"
  }
]
```

Fields:

- `label`: button label
- `target`: section to start in after loading the destination scene
- `preview`: background key used for preview imagery
- `json`: destination scene path without language segment

### Topics

The topic database key must be `Topics`, not `topics`.

Example:

```json
"Topics": {
  "aboutVictim": {
    "text": "About the victim",
    "label": "Talk_AboutVictim"
  }
}
```

### Options

Options power `{option:Key}` choices.

```json
"options": {
  "BodyPosition": {
    "text": "If the back of the head took the fatal blow, the body should be...",
    "options": [
      {
        "text": "Be lying face up",
        "label": "Body_Lying_Face_Up"
      }
    ]
  }
}
```

## 7. Courtroom Data

Courtroom scenes can define `courtroom` and `crossExaminations`.

### Courtroom Layout

Example:

```json
"courtroom": {
  "views": {
    "overview": { "background": "CourtOverview" },
    "stands": {
      "background": "CourtStands",
      "positions": {
        "defense": "defense",
        "witness": "witness",
        "prosecution": "prosecution"
      }
    },
    "judge": { "background": "CourtJudge" }
  },
  "slots": {
    "defense": { "character": "Phoenix" },
    "prosecution": { "character": "Edgeworth" },
    "witness": { "character": "Gumshoe" },
    "judge": { "character": "Judge" }
  }
}
```

### Cross-Examinations

Example:

```json
"crossExaminations": {
  "Gumshoe_Testimony": {
    "witnessName": "Gumshoe",
    "failSequence": "CE_Fail",
    "statements": {
      "0": {
        "text": "{courtView:witness}The defendant was found at the scene!",
        "press": "Press_Statement_1"
      },
      "2": {
        "text": "{courtView:witness}And he was smoking that cigar!",
        "press": "Press_Statement_3",
        "present": {
          "Cigar": "CE_Victory"
        }
      }
    },
    "initialStatements": ["0", "2"]
  }
}
```

Fields:

- `witnessName`: fallback speaker name for statements without their own `name`
- `failSequence`: section to jump to on a failed present, if provided
- `statements`: dictionary of statement ids to statement objects
- `initialStatements`: ordered list of statement ids shown in the CE loop

Statement fields:

- `name`: optional override speaker name
- `text`: statement dialogue text
- `press`: section to jump to when the player presses the statement
- `present`: evidence-to-section mapping used by presenting evidence

## 8. Inline Dialogue Command Reference

Commands are written inside dialogue text using curly braces. Example:

```text
{bg:Office}{sprite:Shawit["Stand"]}{blip:1}Welcome to the office.
```

You can combine multiple commands in the same line.

### 8.1 Timing And Flow Commands

`{p:Milliseconds}`

- Pauses the typewriter for the given duration.

`{skip:Milliseconds}`

- Stops typing the current line and auto-advances after the given delay.

`{jump:SectionName}`

- Immediately jumps to another section.

`{jumpIf:StateKey,TrueSection,FalseSection}`

- Jumps to `TrueSection` if `gameState[StateKey]` is truthy.
- If the optional false section is supplied, jumps there when false.
- If the false section is omitted and the condition is false, the script continues normally.

`{setState:Key,Value}`

- Sets `gameState[Key]` to the provided string value.

`{option:OptionKey}`

- Opens an options menu using the corresponding entry in the top-level `options` database.

`{sectionEnd}`

- Marks the end of a section for topic/menu behavior.
- Typically used after jumps or section transitions that should stop the current flow cleanly.

`{checkpoint:SectionName}`

- Stores a restart point used by the restart/game-over flow.

`{setGameOver:SectionName}`

- Sets the game-over destination section.

`{endGame}`

- Shows the end overlay and stops normal progression until the player restarts.

`{setAction:ActionName,true|false}`

- Enables or disables an action button.
- Supported action names are the action-state keys used by the engine: `move`, `examine`, `talk`, `present`.

### 8.2 Text Formatting And Textbox Commands

`{color:ColorValue}`

- Changes text color for subsequent text in the line.
- Accepts values the browser can use directly, such as `red`, `lime`, or `#ff5555`.

`{center}`

- Centers text in the current dialogue line.

`{nl}`

- Inserts a line break.

`{textSpeed:Milliseconds}`

- Changes the typewriter speed for the current line.

`{hideTextbox}`

- Hides the textbox by setting its opacity to `0`.

`{showTextbox}`

- Shows the textbox by setting its opacity back to `1`.

### 8.3 Character And Visual Commands

`{sprite:Character["Emotion"]}`

- Changes the current character sprite and makes the character visible immediately.
- The engine expects the character and emotion to exist in the `characters` database.

`{showCharacter}`

- Shows the character instantly.

`{hideCharacter}`

- Hides the character instantly.

`{fadeInCharacter}`

- Fades the current character in using the default duration.

`{fadeOutCharacter}`

- Fades the current character out using the default duration.

`{fadeInCharacter:Milliseconds}`

- Fades the current character in using a custom duration.

`{fadeOutCharacter:Milliseconds}`

- Fades the current character out using a custom duration.

`{bg:BackgroundKey}`

- Changes the background immediately.

`{fg:ForegroundKey}`

- Changes the foreground immediately.

`{fadeBg:BackgroundKey}`

- Fades out the current background, swaps to the new one, then fades back in.

`{fadeBg:BackgroundKey,Milliseconds}`

- Same as above with a custom fade duration.

`{fadeOutBg}`

- Fades the background out using the default duration.

`{fadeOutBg:Milliseconds}`

- Fades the background out using a custom duration.

`{fadeInBg}`

- Fades the background in using the default duration.

`{fadeInBg:Milliseconds}`

- Fades the background in using a custom duration.

`{fadeFg:ForegroundKey}`

- Fades out the current foreground, swaps to the new one, then fades back in.

`{fadeFg:ForegroundKey,Milliseconds}`

- Same as above with a custom fade duration.

`{fadeOutFg}`

- Fades the foreground out using the default duration.

`{fadeOutFg:Milliseconds}`

- Fades the foreground out using a custom duration.

`{fadeInFg}`

- Fades the foreground in using the default duration.

`{fadeInFg:Milliseconds}`

- Fades the foreground in using a custom duration.

`{bgMove:PositionName}`

- Moves the current positioned background to the named position.
- This only works for backgrounds defined with `path` and `positions`.

`{bgMove:PositionName,Milliseconds}`

- Same as above with a custom movement duration.

`{flash}`

- Triggers the white flash overlay effect.

`{shake:Milliseconds}`

- Triggers a temporary screen shake.

`{playAnimation:Name}`

- Plays an animation timeline from `assets/animations/Name.json`.
- The line waits for the animation to finish before continuing.

`{playVideo:VideoKey}`

- Plays a top-screen video from the `videos` database.
- The line resumes when the video ends or is skipped.

`{stopVideo}`

- Stops the current video sequence.

### 8.4 Audio Commands

`{blip:Type}`

- Changes the text blip sound.

`{blip:Type,true|false}`

- Changes the blip sound and whether sprite talking animation is active.

Supported blip types:

- `1`: blip 1
- `2`: blip 2
- `3`: typewriter
- `4`: silence

`{playSound:SoundKey}`

- Plays a sound effect from the `sounds` database once.

`{startBGM:MusicKey}`

- Starts looping music.

`{startBGM:MusicKey,true|false}`

- Starts looping music and optionally fades it in.

`{stopBGM}`

- Stops the current BGM with fade-out enabled by default.

`{stopBGM:true}`

- Explicitly fades the BGM out before stopping.

`{stopBGM:false}`

- Stops the BGM immediately.

### 8.5 Inventory, Topics, And Life Commands

`{addEvidence:Key}`

- Adds an evidence item to the Court Record.
- Also sets `gameState["evidence_" + Key] = true`.

`{addEvidence:Key,true|false}`

- Adds evidence and optionally controls the popup notification.

`{removeEvidence:Key}`

- Removes an evidence item from the Court Record and clears its evidence flag.

`{updateEvidence:OldKey,NewKey}`

- Removes the old evidence item and adds the new one.

`{updateEvidence:OldKey,NewKey,true|false}`

- Same as above and optionally controls the popup notification.

`{addProfile:Key}`

- Adds a profile to the profile inventory.

`{addProfile:Key,true|false}`

- Adds a profile and optionally controls the popup notification.

`{topicUnlock:TopicKey}`

- Unlocks a topic in the topic system.

`{lifeMod:Amount}`

- Modifies the life bar by a signed integer.

`{showLifeBar}`

- Shows the life bar.

`{showLifeBar:Penalty}`

- Shows the life bar and passes a penalty preview value.

`{hideLifeBar}`

- Hides the life bar.

### 8.6 Courtroom Commands

`{courtView:ViewName}`

- Switches the courtroom viewport to a named view.
- Common values include `judge`, `witness`, `defense`, `prosecution`, `cocounsel`, `gallery`, and `overview`.

`{courtPan:ViewName}`

- Smoothly pans courtroom stands to the target view using the default duration.

`{courtPan:ViewName,Milliseconds}`

- Same as above with a custom duration.

`{courtSprite:Slot["Emotion"]}`

- Changes the sprite shown in a courtroom slot.

`{courtChar:Slot,CharacterName}`

- Reassigns which character occupies a courtroom slot.

`{changeCharacter:Character["Emotion"]}`

- Updates the current courtroom view to use the specified character and emotion.

`{changeCharacter:Character["Emotion"],ViewName}`

- Updates a specific courtroom view to use the specified character and emotion.

### 8.7 Cross-Examination Commands

`{startCE:CrossExaminationId}`

- Starts a cross-examination loop using the matching entry in `crossExaminations`.

`{returnToCE}`

- Returns to the currently active cross-examination loop.

`{returnToCE:StatementId}`

- Returns to the CE loop and positions the player on a specific statement if that id exists.

`{endCE}`

- Exits cross-examination mode.

`{replaceCEStatement:CEId,TargetStatementId,NewStatementId}`

- Replaces one active statement id with another inside the CE loop.

`{addCEStatement:CEId,Text,PressSection}`

- Parsed by the command system as a CE mutation command.

`{addCEStatement:CEId,Text,PressSection,PresentMap}`

- Same as above with an optional present map object.

Important note: `addCEStatement` is currently wired inconsistently between the parser, command executor, and cross-examination runtime. Treat it as experimental and verify it in a test scene before relying on it in production content.

## 9. Animation Timeline Format

`{playAnimation:Name}` loads `assets/animations/Name.json`.

Example structure:

```json
{
  "layers": ["character", "bunny", "overlay-img-aux"],
  "animationCss": "Don_break_melon.css",
  "timeline": {
    "0": [
      {
        "image": "img/characters/Don/Don/Don_Normal.webp",
        "targetId": "character"
      },
      {
        "image": "img/sprites/Bunny_walk_melon.webp",
        "class": "walk-in",
        "targetId": "bunny",
        "duration": 1810
      }
    ],
    "6500": {
      "sound": "audio/se/explosion.ogg"
    }
  }
}
```

Animation timeline notes:

- `layers`: DOM layer ids to create if they do not exist
- `animationCss`: either inline CSS text or a CSS filename under `assets/animations/`
- `timeline`: map of start times in milliseconds to one event or an array of events

Event fields:

- `image`: asset path relative to `assets/`
- `targetId`: layer id to update
- `class`: CSS class to apply to the layer
- `duration`: animation duration in milliseconds
- `sound`: sound key or asset path

## 10. Practical Authoring Rules

- Keep reusable behavior in engine code. If a feature needs a new inline command, add it to `js/parser.js` and its executor instead of inventing unsupported JSON syntax.
- Keep scene links case-relative and language-agnostic inside JSON.
- Use `Topics`, not `topics`.
- Keep investigation polygons normalized to `0-100` coordinates.
- Only use `{bgMove:*}` on positioned backgrounds.
- Remember that evidence and profile definitions merge across scene loads.
- If you add localized content, decide deliberately whether EN, ES, and JP files all need matching updates.

## 11. Manual Verification Checklist

After editing a scene, verify the following in the browser:

1. The scene loads over HTTP with the intended `case`, `lang`, and `scene` parameters.
2. Move links load the destination scene correctly.
3. Investigations trigger the expected labels and default empty-space label.
4. Any new commands run without leaving the typewriter stuck.
5. Single-screen mode still works for the affected scene if UI flow changed.
6. If you touched scene switching or language handling, test at least one non-English scene.

## 12. Current Caveats

- The UI text advertises a `V` shortcut for skipping video, but the global keyboard handler currently does not implement that key. Use the skip/play video button.
- `addCEStatement` appears to be incomplete or mismatched in the current runtime wiring. Test it carefully before using it in a real case.
- Because the engine uses shared globals and script load order instead of modules, unrelated changes can have side effects if you rename or reinitialize shared state.