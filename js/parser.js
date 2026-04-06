
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
    /\{jumpIf:([^,}]+),([a-zA-Z0-9_]+)(?:,([a-zA-Z0-9_]+))?\}/, // 8,9,10: JumpIf
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
    /\{checkpoint:([a-zA-Z0-9_]+)\}/,                   // 32: Checkpoint
    /\{playAnimation:([a-zA-Z0-9_]+)\}/,                // 33: PlayAnimation
    /\{hideTextbox\}/,                                  // 0: HideTextbox
    /\{showTextbox\}/,                                  // 0: ShowTextbox
    /\{fg:([a-zA-Z0-9_]+)\}/,                           // 34: Foreground
    /\{shake:(\d+)\}/,                                  // 35: Shake
    /\{playVideo:([a-zA-Z0-9_]+)\}/,                    // 36: PlayVideo
    /\{stopVideo\}/,                                    // 0: StopVideo
    /\{endGame\}/,                                      // 0: EndGame (Match[0] check)
    /\{fadeBg:([a-zA-Z0-9_]+)(?:,(\d+))?\}/,           // 37,38: Fade Bg (Name, Duration)
    /\{fadeOutBg(?::(\d+))?\}/,                        // 39: Fade Out Bg Duration
    /\{fadeInBg(?::(\d+))?\}/,                         // 40: Fade In Bg Duration
    /\{fadeFg:([a-zA-Z0-9_]+)(?:,(\d+))?\}/,           // 41,42: Fade Fg (Name, Duration)
    /\{fadeOutFg(?::(\d+))?\}/,                        // 43: Fade Out Fg Duration
    /\{fadeInFg(?::(\d+))?\}/,                         // 44: Fade In Fg Duration
    /\{fadeInCharacter:(\d+)\}/,                       // 45: Fade In Character Duration
    /\{fadeOutCharacter:(\d+)\}/,                      // 46: Fade Out Character Duration
    /\{bgMove:([a-zA-Z0-9_]+)(?:,(\d+))?\}/,         // 47,48: Background Move (Position, Duration)
    /\{setAction:([a-zA-Z]+),(true|false)\}/,          // 49,50: SetAction (Name, Visibility)
    /\{startBGM:([a-zA-Z0-9_]+),((?:true|false)(?:,(?:true|false))?)\}/, // 51,52: StartBGM with FadeIn[,Force]
    /\{courtView:([a-zA-Z0-9_]+)\}/,                   // 53: CourtView (ViewName)
    /\{courtPan:([a-zA-Z0-9_]+)(?:,(\d+))?\}/,        // 54,55: CourtPan (ViewName, Duration)
    /\{courtSprite:([a-zA-Z0-9_]+)\["([^"]+)"\]\}/,    // 56,57: CourtSprite (Slot, Emotion)
    /\{courtChar:([a-zA-Z0-9_]+),([a-zA-Z0-9_]+)\}/,   // 58,59: CourtChar (Slot, CharacterName)
    /\{changeCharacter:([a-zA-Z0-9_]+)\["([^"]+)"\](?:,([a-zA-Z0-9_]+))?\}/, // 60,61,62: ChangeCharacter (Character, Emotion, View)
    /\{startCE:([a-zA-Z0-9_]+)\}/,                      // 63: StartCE (ID)
    /\{returnToCE(?::([a-zA-Z0-9_]+))?\}/,                             // 64: ReturnToCE (StatementId)
    /\{endCE\}/,                                        // 0: EndCE
    /\{addCEStatement:([a-zA-Z0-9_]+),([^,]+),([a-zA-Z0-9_]+)(?:,([^}]+))?\}/, // 65,66,67,68: AddCEStatement (ceId, text, press, present)
    /\{replaceCEStatement:([a-zA-Z0-9_]+),([a-zA-Z0-9_]+),([a-zA-Z0-9_]+)\}/,                  // 69,70,71: ReplaceCEStatement (ceId, targetId, newId)
    /\{loadScene:([A-Za-z0-9_./\-]+)(?:,([a-zA-Z0-9_]+))?\}/,                                   // 72,73: LoadScene (Path, StartSection)
    /\{setSkipEnabled:(true|false)\}/,                                                           // 74: SetSkipEnabled
    /\{showEvidenceIcon:(left|right),([a-zA-Z0-9_]+)\}/,                                         // 75,76: ShowEvidenceIcon (Position, Item)
    /\{hideEvidenceIcon\}/                                                                       // 0: HideEvidenceIcon
];
const masterRegex = new RegExp(patterns.map(p => p.source).join('|'), 'g');

function parseCEPresentPayload(rawPayload) {
    if (!rawPayload) return null;

    try {
        return JSON.parse(rawPayload.replace(/'/g, '"'));
    } catch (error) {
        console.warn('Invalid addCEStatement present payload:', rawPayload, error);
        return null;
    }
}

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
        } else if (match[0] === '{stopVideo}') { // Stop Video
            parsedSegments.push({ type: 'stopVideo' });
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
        } else if (match[8] && match[9]) { // JumpIf {jumpIf:ConditionExpr,True,False(Optional)}
            parsedSegments.push({ type: 'jumpIf', condition: match[8].trim(), labelTrue: match[9], labelFalse: match[10] });
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
        } else if (match[32]) { // Checkpoint {checkpoint:SectionName}
            parsedSegments.push({ type: 'checkpoint', sectionName: match[32] });
        } else if (match[33]) { // PlayAnimation
            parsedSegments.push({ type: 'playAnimation', name: match[33] });
        } else if (match[0] === '{hideTextbox}') { // Hide Textbox
            parsedSegments.push({ type: 'hideTextbox' });
        } else if (match[0] === '{showTextbox}') { // Show Textbox
            parsedSegments.push({ type: 'showTextbox' });
        } else if (match[34]) { // Foreground {fg:Name}
            parsedSegments.push({ type: 'fg', fgName: match[34] });
        } else if (match[35]) { // Shake {shake:frames}
            parsedSegments.push({ type: 'shake', duration: parseInt(match[35]) });
        } else if (match[36]) { // Play Video {playVideo:Key}
            parsedSegments.push({ type: 'playVideo', videoKey: match[36] });
        } else if (match[37]) { // Fade Background {fadeBg:Name,Duration}
            parsedSegments.push({ type: 'fadeBg', bgName: match[37], duration: match[38] ? parseInt(match[38]) : 400 });
        } else if (match[0].startsWith('{fadeOutBg')) { // Fade Out Background {fadeOutBg:Duration}
            parsedSegments.push({ type: 'fadeOutBg', duration: match[39] ? parseInt(match[39]) : 400 });
        } else if (match[0].startsWith('{fadeInBg')) { // Fade In Background {fadeInBg:Duration}
            parsedSegments.push({ type: 'fadeInBg', duration: match[40] ? parseInt(match[40]) : 400 });
        } else if (match[41]) { // Fade Foreground {fadeFg:Name,Duration}
            parsedSegments.push({ type: 'fadeFg', fgName: match[41], duration: match[42] ? parseInt(match[42]) : 400 });
        } else if (match[0].startsWith('{fadeOutFg')) { // Fade Out Foreground {fadeOutFg:Duration}
            parsedSegments.push({ type: 'fadeOutFg', duration: match[43] ? parseInt(match[43]) : 400 });
        } else if (match[0].startsWith('{fadeInFg')) { // Fade In Foreground {fadeInFg:Duration}
            parsedSegments.push({ type: 'fadeInFg', duration: match[44] ? parseInt(match[44]) : 400 });
        } else if (match[45]) { // Fade In Character {fadeInCharacter:Duration}
            parsedSegments.push({ type: 'fadeIn', duration: parseInt(match[45]) });
        } else if (match[46]) { // Fade Out Character {fadeOutCharacter:Duration}
            parsedSegments.push({ type: 'fadeOut', duration: parseInt(match[46]) });
        } else if (match[47]) { // Background Move {bgMove:position,duration}
            parsedSegments.push({ type: 'bgMove', position: match[47], duration: match[48] ? parseInt(match[48]) : 400 });
        } else if (match[49]) { // Set Action {setAction:Name,Bool}
            parsedSegments.push({ type: 'setAction', actionName: match[49], isEnabled: match[50] === 'true' });
        } else if (match[51]) { // StartBGM with FadeIn/Force {startBGM:Name,true|false[,true|false]}
            const bgmFlags = match[52].split(',');
            parsedSegments.push({
                type: 'startBGM',
                musicName: match[51],
                fadeIn: bgmFlags[0] === 'true',
                force: bgmFlags[1] === 'true'
            });
        } else if (match[53]) { // CourtView {courtView:ViewName}
            parsedSegments.push({ type: 'courtView', view: match[53] });
        } else if (match[54]) { // CourtPan {courtPan:ViewName,Duration}
            parsedSegments.push({ type: 'courtPan', view: match[54], duration: match[55] ? parseInt(match[55]) : 400 });
        } else if (match[56] && match[57]) { // CourtSprite {courtSprite:Slot["Emotion"]}
            parsedSegments.push({ type: 'courtSprite', slot: match[56], emotion: match[57] });
        } else if (match[58] && match[59]) { // CourtChar {courtChar:Slot,CharacterName}
            parsedSegments.push({ type: 'courtChar', slot: match[58], characterName: match[59] });
        } else if (match[60] && match[61]) { // ChangeCharacter {changeCharacter:Character["Emotion"][,view]}
            parsedSegments.push({ type: 'changeCharacter', characterName: match[60], emotion: match[61], view: match[62] || null });
        } else if (match[63]) { // StartCE {startCE:ID}
            parsedSegments.push({ type: 'startCE', ceId: match[63] });
        } else if (match[0].startsWith('{returnToCE')) { // ReturnToCE
            parsedSegments.push({ type: 'returnToCE', statementId: match[64] || null });
        } else if (match[0] === '{endCE}') { // EndCE
            parsedSegments.push({ type: 'endCE' });
        } else if (match[65]) { // AddCEStatement
            parsedSegments.push({ 
                type: 'addCEStatement', 
                ceId: match[65], 
                text: match[66], 
                press: match[67], 
                present: parseCEPresentPayload(match[68])
            });
        } else if (match[69]) { // ReplaceCEStatement
            parsedSegments.push({ 
                type: 'replaceCEStatement', 
                ceId: match[69], 
                targetId: match[70], 
                newId: match[71]
            });
        } else if (match[72]) { // LoadScene {loadScene:path[,Section]}
            parsedSegments.push({
                type: 'loadScene',
                scenePath: match[72],
                sectionName: match[73] || null
            });
        } else if (match[74]) { // SetSkipEnabled {setSkipEnabled:true|false}
            parsedSegments.push({
                type: 'setSkipEnabled',
                enabled: match[74] === 'true'
            });
        } else if (match[75]) { // ShowEvidenceIcon
            parsedSegments.push({
                type: 'showEvidenceIcon',
                position: match[75],
                evidenceKey: match[76]
            });
        } else if (match[0] === '{hideEvidenceIcon}') {
            parsedSegments.push({ type: 'hideEvidenceIcon' });
        } else if (match[0] === '{endGame}') { // End Game
            parsedSegments.push({ type: 'endGame' });
        }

        lastIndex = masterRegex.lastIndex;
    }
    // Add remaining text
    if (lastIndex < text.length) {
        parsedSegments.push({ type: 'text', content: text.substring(lastIndex) });
    }

    return parsedSegments;
}
