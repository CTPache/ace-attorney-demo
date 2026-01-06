console.log("Parser Loaded");

function parseText(text) {
    const parsedSegments = [];
    // WARNING: The order of patterns determines the capture group indices (match[1], match[2], etc.)
    // If you add or reorder patterns with capture groups, you MUST update the index references below.
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
        /\{jumpIf:([a-zA-Z0-9_]+),([a-zA-Z0-9_]+),([a-zA-Z0-9_]+)\}/, // 8,9,10: JumpIf
        /\{setState:([a-zA-Z0-9_]+),([^}]+)\}/,             // 11,12: SetState
        /\{blip:(\d+)\}/,                                   // 13: Blip
        /\{center\}/,                                       // 0: Center
        /\{nl\}/,                                           // 0: NewLine
        /\{textSpeed:(\d+)\}/,                              // 14: TextSpeed
        /\{addEvidence:([a-zA-Z0-9_]+)(?:,([a-zA-Z0-9_]+))?\}/, // 15,16: AddEvidence (Key, ShowPopup)
        /\{addProfile:([a-zA-Z0-9_]+)(?:,([a-zA-Z0-9_]+))?\}/,  // 17,18: AddProfile (Key, ShowPopup)
        /\{topicUnlock:([a-zA-Z0-9_]+)\}/,                  // 19: TopicUnlock
        /\{sectionEnd\}/,                                   // 0: SectionEnd
        /\{playSound:([a-zA-Z0-9_]+)\}/,                    // 20: PlaySound
        /\{startBGM:([a-zA-Z0-9_]+)\}/,                     // 21: StartBGM
        /\{stopBGM(?::(true|false))?\}/,                    // 22: StopBGM (FadeOut)
        /\{option:([a-zA-Z0-9_]+)\}/                        // 23: Option
    ];
    const regex = new RegExp(patterns.map(p => p.source).join('|'), 'g');
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        // Add text before the tag
        if (match.index > lastIndex) {
            parsedSegments.push({ type: 'text', content: text.substring(lastIndex, match.index) });
        }

        if (match[0] === '{flash}') { // Flash {flash}
            parsedSegments.push({ type: 'flash' });
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
            const fadeOut = match[22] !== 'false'; // Default to true
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
        } else if (match[8] && match[9] && match[10]) { // JumpIf {jumpIf:Cond,True,False}
            parsedSegments.push({ type: 'jumpIf', condition: match[8], labelTrue: match[9], labelFalse: match[10] });
        } else if (match[11] && match[12]) { // SetState {setState:Key,Value}
            parsedSegments.push({ type: 'setState', key: match[11], value: match[12] });
        } else if (match[13]) { // Blip {blip:Type}
            parsedSegments.push({ type: 'blip', value: parseInt(match[13]) });
        } else if (match[14]) { // Text Speed {textSpeed:ms}
            parsedSegments.push({ type: 'textSpeed', value: parseInt(match[14]) });
        } else if (match[15]) { // Add Evidence {addEvidence:Key,ShowPopup}
            const showPopup = match[16] !== 'false'; // Default to true
            parsedSegments.push({ type: 'addEvidence', key: match[15], showPopup: showPopup });
        } else if (match[17]) { // Add Profile {addProfile:Key,ShowPopup}
            const showPopup = match[18] !== 'false'; // Default to true
            parsedSegments.push({ type: 'addProfile', key: match[17], showPopup: showPopup });
        } else if (match[19]) { // TopicUnlock {topicUnlock:ID}
            parsedSegments.push({ type: 'topicUnlock', topicId: match[19] });
        } else if (match[20]) { // PlaySound {playSound:Name}
            parsedSegments.push({ type: 'playSound', soundName: match[20] });
        } else if (match[21]) { // StartBGM {startBGM:Name}
            parsedSegments.push({ type: 'startBGM', musicName: match[21] });
        } else if (match[23]) { // Option {option:Key}
            parsedSegments.push({ type: 'option', optionKey: match[23] });
        }

        lastIndex = regex.lastIndex;
    }
    // Add remaining text
    if (lastIndex < text.length) {
        parsedSegments.push({ type: 'text', content: text.substring(lastIndex) });
    }
    
    return parsedSegments;
}
