console.log("Parser Loaded");

// Define patterns globally to avoid recompilation
const patterns = [
    /\{p:(\d+)\}/,                                      // 1: Pause
    /\{color:([^}]+)\}/,                                // 2: Color
    /\{flash\}/,                                        // 0: Flash (Match[0] check)
    /\{sprite:([a-zA-Z0-9_]+)\["([^"]+)"\]\}/,          // 3,4: Sprite
    /\{skip:(\d+)\}/,                                   // 5: Skip
    /\{fadeInCharacter\}/,                              // 0: FadeIn
    /\{fadeOutCharacter\}/,                             // 0: FadeOut
    /\{showCharacter\}/,                                // 0: Show
    /\{hideCharacter\}/,                                // 0: Hide
    /\{bg:([a-zA-Z0-9_]+)\}/,                           // 6: Bg
    /\{jump:([a-zA-Z0-9_]+)\}/,                         // 7: Jump
    /\{jumpIf:([a-zA-Z0-9_]+),([a-zA-Z0-9_]+)(?:,([a-zA-Z0-9_]+))?\}/, // 8,9,10: JumpIf
    /\{setState:([a-zA-Z0-9_]+),([^}]+)\}/,             // 11,12: SetState
    /\{blip:(\d+)(?:,(true|false))?\}/,                 // 13,14: Blip (Type, ShouldSpeak)
    /\{center\}/,                                       // 0: Center
    /\{nl\}/,                                           // 0: NewLine
    /\{textSpeed:(\d+)\}/,                              // 15: TextSpeed
    /\{addEvidence:([a-zA-Z0-9_]+)(?:,([a-zA-Z0-9_]+))?\}/, // 16,17: AddEvidence (Key, ShowPopup)
    /\{addProfile:([a-zA-Z0-9_]+)(?:,([a-zA-Z0-9_]+))?\}/,  // 18,19: AddProfile (Key, ShowPopup)
    /\{topicUnlock:([a-zA-Z0-9_]+)\}/,                  // 20: TopicUnlock
    /\{sectionEnd\}/,                                   // 0: SectionEnd
    /\{playSound:([a-zA-Z0-9_]+)\}/,                    // 21: PlaySound
    /\{startBGM:([a-zA-Z0-9_]+)\}/,                     // 22: StartBGM
    /\{stopBGM(?::(true|false))?\}/,                    // 23: StopBGM (FadeOut)
    /\{option:([a-zA-Z0-9_]+)\}/,                       // 24: Option
    /\{lifeMod:(-?\d+)\}/,                              // 25: LifeMod
    /\{showLifeBar(?::(\d+))?\}/,                       // 26: ShowLifeBar
    /\{hideLifeBar\}/,                                  // 0: HideLifeBar (Match[0] check)
    /\{setGameOver:([a-zA-Z0-9_]+)\}/,                  // 27: SetGameOver
    /\{removeEvidence:([a-zA-Z0-9_]+)\}/,               // 28: RemoveEvidence
    /\{updateEvidence:([a-zA-Z0-9_]+),([a-zA-Z0-9_]+)(?:,(true|false))?\}/, // 29,30,31: UpdateEvidence (OldKey, NewKey, ShowPopup)
    /\{endGame\}/                                       // 0: EndGame (Match[0] check)
];
const masterRegex = new RegExp(patterns.map(p => p.source).join('|'), 'g');

function parseText(text) {
    const parsedSegments = [];
    masterRegex.lastIndex = 0; // Reset regex state
    let lastIndex = 0;
    let match;

    while ((match = masterRegex.exec(text)) !== null) {
        // Add text before the tag
        if (match.index > lastIndex) {
            parsedSegments.push({ type: 'text', content: text.substring(lastIndex, match.index) });
        }

        if (match[0] === '{flash}') { // Flash {flash}

            parsedSegments.push({ type: 'flash' });
        } else if (match[0] === '{hideLifeBar}') { // Hide Life Bar
            parsedSegments.push({ type: 'hideLifeBar' });
        } else if (match[0] === '{endGame}') { // End Game
            parsedSegments.push({ type: 'endGame' });
        } else if (match[0] === '{fadeInCharacter}') { // Fade In
            parsedSegments.push({ type: 'fadeIn' });
        } else if (match[0] === '{fadeOutCharacter}') { // Fade Out
            parsedSegments.push({ type: 'fadeOut' });
        } else if (match[0] === '{showCharacter}') { // Show (Instant)
            parsedSegments.push({ type: 'showCharacter' });
        } else if (match[0] === '{hideCharacter}') { // Hide (Instant)
            parsedSegments.push({ type: 'hideCharacter' });
        } else if (match[0] === '{sectionEnd}') { // Section End
            parsedSegments.push({ type: 'sectionEnd' });
        } else if (match[0] === '{center}') { // Center Text {center}
            parsedSegments.push({ type: 'center' });
        } else if (match[0] === '{nl}') { // New Line {nl}
            parsedSegments.push({ type: 'nl' });
        } else if (match[0].startsWith('{stopBGM')) { // Stop BGM {stopBGM} or {stopBGM:false}
            const fadeOut = match[23] !== 'false'; // Default to true
            parsedSegments.push({ type: 'stopBGM', fadeOut: fadeOut });
        } else if (match[1]) { // Pause {p:123}
            parsedSegments.push({ type: 'pause', duration: parseInt(match[1]) });
        } else if (match[2]) { // Color {color:red}
            parsedSegments.push({ type: 'color', value: match[2] });
        } else if (match[3] && match[4]) { // Sprite {sprite:Name["Key"]}
            parsedSegments.push({ type: 'sprite', charName: match[3], spriteKey: match[4] });
        } else if (match[5]) { // Skip {skip:1000}
            parsedSegments.push({ type: 'skip', duration: parseInt(match[5]) });
        } else if (match[6]) { // Background {bg:Name}
            parsedSegments.push({ type: 'bg', bgName: match[6] });
        } else if (match[7]) { // Jump {jump:Label}
            parsedSegments.push({ type: 'jump', label: match[7] });
        } else if (match[8] && match[9]) { // JumpIf {jumpIf:Cond,True,False(Optional)}
            parsedSegments.push({ type: 'jumpIf', condition: match[8], labelTrue: match[9], labelFalse: match[10] });
        } else if (match[11] && match[12]) { // SetState {setState:Key,Value}
            parsedSegments.push({ type: 'setState', key: match[11], value: match[12] });
        } else if (match[13]) { // Blip {blip:Type}
            const shouldSpeak = match[14] !== 'false'; // Default to true
            parsedSegments.push({ type: 'blip', value: parseInt(match[13]), shouldSpeak: shouldSpeak });
        } else if (match[15]) { // Text Speed {textSpeed:ms}
            parsedSegments.push({ type: 'textSpeed', value: parseInt(match[15]) });
        } else if (match[16]) { // Add Evidence {addEvidence:Key,ShowPopup}
            const showPopup = match[17] !== 'false'; // Default to true
            parsedSegments.push({ type: 'addEvidence', key: match[16], showPopup: showPopup });
        } else if (match[18]) { // Add Profile {addProfile:Key,ShowPopup}
            const showPopup = match[19] !== 'false'; // Default to true
            parsedSegments.push({ type: 'addProfile', key: match[18], showPopup: showPopup });
        } else if (match[20]) { // TopicUnlock {topicUnlock:ID}
            parsedSegments.push({ type: 'topicUnlock', topicId: match[20] });
        } else if (match[21]) { // PlaySound {playSound:Name}
            parsedSegments.push({ type: 'playSound', soundName: match[21] });
        } else if (match[22]) { // StartBGM {startBGM:Name}
            parsedSegments.push({ type: 'startBGM', musicName: match[22] });
        } else if (match[23]) { // Option {option:Key} (Note: check index, might be previous stopBGM group)
             /* Wait, stopBGM is /\{stopBGM(?::(true|false))?\}/ which is group 23.
                The previous regex list:
                22: StartBGM
                23: StopBGM (FadeOut) -> wait, group 23 is inside stopBGM
             */
             // Let's re-verify the indices.
             /*
                7: Jump
                8,9,10: JumpIf
                11,12: SetState
                13,14: Blip
                15: Text Speed (was 14)
                16,17: AddEvidence (was 15,16)
                18,19: AddProfile (was 17,18)
                20: TopicUnlock (was 19)
                21: PlaySound (was 20)
                22: StartBGM (was 21)
                23: StopBGM capture group inside (was 22) - wait, match[0].startsWith('{stopBGM') handles it manually usually?
                Ah, checks `match[0]` for `{stopBGM`.
                But the regex has a capture group: `(true|false)`.
                So `match` array will have that group at index 23.
                
                Let's look at the regex construction again.
                /\{stopBGM(?::(true|false))?\}/
                Yes, it has one capturing group.
                
                Wait, I need to check if previous unused groups affect the index.
                Pattern 22 (index in array, not capture group index) is:
                /\{stopBGM(?::(true|false))?\}/
                
                Previous capturing groups sum:
                1: Pause (1)
                2: Color (1)
                3,4: Sprite (2)
                5: Skip (1)
                6: Bg (1)
                7: Jump (1)
                8,9,10: JumpIf (3)
                11,12: SetState (2)
                13,14: Blip (2)  <-- CHANGED (+1)
                15: TextSpeed (1)
                16,17: AddEvidence (2)
                18,19: AddProfile (2)
                20: TopicUnlock (1)
                21: PlaySound (1)
                22: StartBGM (1)
                23: StopBGM (1)
                24: Option (1)
                25: LifeMod (1)
                26: ShowLifeBar (1)
                27: SetGameOver (1)

                So:
                startBGM is match[22].
                stopBGM capture is match[23].
                option is match[24].
                lifeMod is match[25].
                showLifeBar capture is match[26].
                setGameOver is match[27].
             */
             
            // Back to code:
        } else if (match[24]) { // Option {option:Key}
            parsedSegments.push({ type: 'option', optionKey: match[24] });
        } else if (match[25]) { // LifeMod {lifeMod:Amount}
            parsedSegments.push({ type: 'lifeMod', amount: parseInt(match[25]) });
        } else if (match[0].startsWith('{showLifeBar')) { // ShowLifeBar
            const penalty = match[26] ? parseInt(match[26]) : 0;
            parsedSegments.push({ type: 'showLifeBar', penalty: penalty });
        } else if (match[27]) { // SetGameOver {setGameOver:Label}
            parsedSegments.push({ type: 'setGameOver', label: match[27] });
        } else if (match[28]) { // RemoveEvidence {removeEvidence:Key}
            parsedSegments.push({ type: 'removeEvidence', key: match[28] });
        } else if (match[29] && match[30]) { // UpdateEvidence {updateEvidence:Old,New,Popup}
            const showPopup = match[31] !== 'false';
            parsedSegments.push({ type: 'updateEvidence', oldKey: match[29], newKey: match[30], showPopup: showPopup });
        }
        
        // I also need to update the `stopBGM` check because it relies on index 22 in valid code (was 22). Now it is 23.
        
        lastIndex = masterRegex.lastIndex;
    }
    // Add remaining text
    if (lastIndex < text.length) {
        parsedSegments.push({ type: 'text', content: text.substring(lastIndex) });
    }
    
    return parsedSegments;
}
