console.log("Engine Loaded");

let showTopicsOnEnd = false;

function jumpToSection(sectionName) {
    if (gameScript[sectionName]) {
        currentSectionName = sectionName;
        currentLineIndex = 0;
        showTopicsOnEnd = false; // Reset flag
        updateDialogue(gameScript[sectionName][0]);
    } else {
        console.error(`Section ${sectionName} not found!`);
    }
}

function setGameState(key, value) {
    if (value === "true") value = true;
    else if (value === "false") value = false;
    else if (!isNaN(value)) value = parseFloat(value);
    
    gameState[key] = value;
    console.log(`State updated: ${key} = ${value}`);
}

function typeWriter(text) {
    isTyping = true;
    textContent.innerHTML = ""; // Clear content

    // Create initial span
    currentSpan = document.createElement('span');
    textContent.appendChild(currentSpan);

    // Parse text for tags
    segments = [];
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
        /\{topicUnlock:([a-zA-Z0-9_]+)\}/,                  // 17: TopicUnlock
        /\{showTopics\}/                                    // 0: ShowTopics
    ];
    const regex = new RegExp(patterns.map(p => p.source).join('|'), 'g');
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        // Add text before the tag
        if (match.index > lastIndex) {
            segments.push({ type: 'text', content: text.substring(lastIndex, match.index) });
        }

        if (match[0] === '{flash}') { // Flash {flash}
            segments.push({ type: 'flash' });
        } else if (match[0] === '{fadeInCharacter}') { // Fade In
            segments.push({ type: 'fadeIn' });
        } else if (match[0] === '{fadeOutCharacter}') { // Fade Out
            segments.push({ type: 'fadeOut' });
        } else if (match[0] === '{showCharacter}') { // Show (Instant)
            segments.push({ type: 'showCharacter' });
        } else if (match[0] === '{hideCharacter}') { // Hide (Instant)
            segments.push({ type: 'hideCharacter' });
        } else if (match[0] === '{showTopics}') { // Show Topics
            segments.push({ type: 'showTopics' });
        } else if (match[0] === '{center}') { // Center Text {center}
            segments.push({ type: 'center' });
        } else if (match[0] === '{nl}') { // New Line {nl}
            segments.push({ type: 'nl' });
        } else if (match[1]) { // Pause {p:123}
            segments.push({ type: 'pause', duration: parseInt(match[1]) });
        } else if (match[2]) { // Color {color:red}
            segments.push({ type: 'color', value: match[2] });
        } else if (match[3] && match[4]) { // Sprite {sprite:Name["Key"]}
            segments.push({ type: 'sprite', charName: match[3], spriteKey: match[4] });
        } else if (match[5]) { // Skip {skip:1000}
            segments.push({ type: 'skip', duration: parseInt(match[5]) });
        } else if (match[6]) { // Background {bg:Name}
            segments.push({ type: 'bg', bgName: match[6] });
        } else if (match[7]) { // Jump {jump:Label}
            segments.push({ type: 'jump', label: match[7] });
        } else if (match[8] && match[9] && match[10]) { // JumpIf {jumpIf:Cond,True,False}
            segments.push({ type: 'jumpIf', condition: match[8], labelTrue: match[9], labelFalse: match[10] });
        } else if (match[11] && match[12]) { // SetState {setState:Key,Value}
            segments.push({ type: 'setState', key: match[11], value: match[12] });
        } else if (match[13]) { // Blip {blip:Type}
            segments.push({ type: 'blip', value: parseInt(match[13]) });
        } else if (match[14]) { // Text Speed {textSpeed:ms}
            segments.push({ type: 'textSpeed', value: parseInt(match[14]) });
        } else if (match[15]) { // Add Evidence {addEvidence:Key,ShowPopup}
            const showPopup = match[16] !== 'false'; // Default to true
            segments.push({ type: 'addEvidence', key: match[15], showPopup: showPopup });
        } else if (match[17]) { // TopicUnlock {topicUnlock:ID}
            segments.push({ type: 'topicUnlock', topicId: match[17] });
        }

        lastIndex = regex.lastIndex;
    }
    // Add remaining text
    if (lastIndex < text.length) {
        segments.push({ type: 'text', content: text.substring(lastIndex) });
    }

    segmentIndex = 0;
    charIndex = 0;

    processNextChar();
}

function processNextChar() {
    if (segmentIndex >= segments.length) {
        isTyping = false;
        setSpriteState('default'); // Finished typing
        return;
    }

    const segment = segments[segmentIndex];

    if (segment.type === 'text') {
        setSpriteState('talking'); // Start talking
        if (charIndex < segment.content.length) {
            currentSpan.textContent += segment.content.charAt(charIndex);
            playBlip();
            charIndex++;
            typingInterval = setTimeout(processNextChar, currentTextSpeed);
        } else {
            segmentIndex++;
            charIndex = 0;
            processNextChar();
        }
    } else if (segment.type === 'pause') {
        setSpriteState('default'); // Pause talking
        segmentIndex++;
        typingInterval = setTimeout(processNextChar, segment.duration);
    } else if (segment.type === 'color') {
        currentSpan = document.createElement('span');
        currentSpan.style.color = segment.value;
        textContent.appendChild(currentSpan);
        segmentIndex++;
        processNextChar();
    } else if (segment.type === 'flash') {
        setSpriteState('default');
        triggerFlash();
        segmentIndex++;
        typingInterval = setTimeout(processNextChar, 200);
    } else if (segment.type === 'fadeIn' || segment.type === 'fadeOut') {
        if (segment.type === 'fadeIn') {
            // Check if next segment is a sprite change and apply it immediately
            if (segmentIndex + 1 < segments.length && segments[segmentIndex + 1].type === 'sprite') {
                const nextSeg = segments[segmentIndex + 1];
                changeSprite(nextSeg.charName, nextSeg.spriteKey);
                segmentIndex++; // Skip the sprite segment so it's not processed again
            }
            character.style.opacity = 1;
        } else {
            character.style.opacity = 0;
        }
        segmentIndex++;
        typingInterval = setTimeout(processNextChar, 1000);
    } else if (segment.type === 'showCharacter' || segment.type === 'hideCharacter') {
        character.style.transition = "none";
        character.style.opacity = (segment.type === 'showCharacter') ? 1 : 0;
        void character.offsetWidth; // Trigger reflow
        character.style.transition = ""; // Restore transition
        segmentIndex++;
        processNextChar();
    } else if (segment.type === 'bg') {
        changeBackground(segment.bgName);
        segmentIndex++;
        processNextChar();
    } else if (segment.type === 'sprite') {
        changeSprite(segment.charName, segment.spriteKey);

        // Check if this animation has a duration (time)
        const charData = characters[segment.charName];
        const animData = charData ? charData[segment.spriteKey] : null;

        if (animData && animData.time) {
            // Treat as a pause
            segmentIndex++;
            typingInterval = setTimeout(processNextChar, animData.time);
        } else {
            // Continue immediately
            segmentIndex++;
            processNextChar();
        }
    } else if (segment.type === 'skip') {
        isWaitingForAutoSkip = true;
        setSpriteState('default');
        isTyping = false; // Stop typing indicator
        setTimeout(() => {
            isWaitingForAutoSkip = false;
            advanceDialogue(true); // Force advance
        }, segment.duration);
    } else if (segment.type === 'jump') {
        jumpToSection(segment.label);
        return; // Stop processing current line
    } else if (segment.type === 'jumpIf') {
        if (gameState[segment.condition]) {
            jumpToSection(segment.labelTrue);
        } else {
            jumpToSection(segment.labelFalse);
        }
        return; // Stop processing current line
    } else if (segment.type === 'setState') {
        setGameState(segment.key, segment.value);
        segmentIndex++;
        processNextChar();
    } else if (segment.type === 'blip') {
        currentBlipType = segment.value;
        segmentIndex++;
        processNextChar();
    } else if (segment.type === 'center') {
        textContent.style.textAlign = 'center';
        segmentIndex++;
        processNextChar();
    } else if (segment.type === 'nl') {
        textContent.appendChild(document.createElement('br'));
        // Create a new span to continue text, preserving style if possible
        const newSpan = document.createElement('span');
        if (currentSpan) {
            newSpan.style.cssText = currentSpan.style.cssText;
        }
        currentSpan = newSpan;
        textContent.appendChild(currentSpan);
        segmentIndex++;
        processNextChar();
    } else if (segment.type === 'textSpeed') {
        currentTextSpeed = segment.value;
        segmentIndex++;
        processNextChar();
    } else if (segment.type === 'addEvidence') {
        if (evidenceDB[segment.key] && !evidenceInventory.includes(segment.key)) {
            evidenceInventory.push(segment.key);
            console.log(`Added evidence: ${segment.key}`);
            
            // Dispatch event for UI updates if showPopup is true
            if (segment.showPopup) {
                const event = new CustomEvent('evidenceAdded', { detail: { key: segment.key } });
                document.dispatchEvent(event);
            }
        }
        segmentIndex++;
        processNextChar();
    } else if (segment.type === 'topicUnlock') {
        if (!unlockedTopics.includes(segment.topicId)) {
            unlockedTopics.push(segment.topicId);
            console.log(`Unlocked topic: ${segment.topicId}`);
        }
        segmentIndex++;
        processNextChar();
    } else if (segment.type === 'showTopics') {
        showTopicsOnEnd = true;
        segmentIndex++;
        processNextChar();
    }
}

function finishTyping() {
    clearTimeout(typingInterval);

    while (segmentIndex < segments.length) {
        const segment = segments[segmentIndex];

        if (segment.type === 'text') {
            currentSpan.textContent += segment.content.substring(charIndex);
            charIndex = 0;
        } else if (segment.type === 'color') {
            currentSpan = document.createElement('span');
            currentSpan.style.color = segment.value;
            textContent.appendChild(currentSpan);
        } else if (segment.type === 'flash') {
            triggerFlash();
        } else if (segment.type === 'sprite') {
            changeSprite(segment.charName, segment.spriteKey);
        } else if (segment.type === 'bg') {
            changeBackground(segment.bgName);
        } else if (segment.type === 'fadeIn' || segment.type === 'fadeOut') {
            character.style.transition = "none";
            character.style.opacity = (segment.type === 'fadeIn') ? 1 : 0;
            void character.offsetWidth;
            character.style.transition = "";
        } else if (segment.type === 'showCharacter' || segment.type === 'hideCharacter') {
            character.style.transition = "none";
            character.style.opacity = (segment.type === 'showCharacter') ? 1 : 0;
            void character.offsetWidth;
            character.style.transition = "";
        } else if (segment.type === 'skip') {
            // Found a skip tag during fast-forward
            isWaitingForAutoSkip = true;
            setSpriteState('default');
            isTyping = false;
            setTimeout(() => {
                isWaitingForAutoSkip = false;
                advanceDialogue(true); // Force advance
            }, segment.duration);
            return; // Stop processing further segments
        } else if (segment.type === 'jump') {
            jumpToSection(segment.label);
            return;
        } else if (segment.type === 'jumpIf') {
            if (gameState[segment.condition]) {
                jumpToSection(segment.labelTrue);
            } else {
                jumpToSection(segment.labelFalse);
            }
            return;
        } else if (segment.type === 'setState') {
            setGameState(segment.key, segment.value);
        } else if (segment.type === 'blip') {
            currentBlipType = segment.value;
        } else if (segment.type === 'center') {
            textContent.style.textAlign = 'center';
        } else if (segment.type === 'nl') {
            textContent.appendChild(document.createElement('br'));
            const newSpan = document.createElement('span');
            if (currentSpan) {
                newSpan.style.cssText = currentSpan.style.cssText;
            }
            currentSpan = newSpan;
            textContent.appendChild(currentSpan);
        } else if (segment.type === 'textSpeed') {
            currentTextSpeed = segment.value;
        } else if (segment.type === 'addEvidence') {
            if (evidenceDB[segment.key] && !evidenceInventory.includes(segment.key)) {
                evidenceInventory.push(segment.key);
                console.log(`Added evidence: ${segment.key}`);
            }
        } else if (segment.type === 'topicUnlock') {
            if (!unlockedTopics.includes(segment.topicId)) {
                unlockedTopics.push(segment.topicId);
            }
        } else if (segment.type === 'showTopics') {
            showTopicsOnEnd = true;
        }
        segmentIndex++;
    }
    isTyping = false;
    setSpriteState('default'); // Ensure default when finished
}

function updateDialogue(line) {
    if (line.name) {
        nameTag.textContent = line.name;
        nameTag.style.opacity = "1";
        currentCharacterName = line.name; // Track current character
    } else {
        nameTag.style.opacity = "0";
        currentCharacterName = null;
    }
    // Reset Text Color to default
    textContent.style.color = "white";
    // Reset Text Alignment to default
    textContent.style.textAlign = "left";
    // Reset Text Speed to default
    currentTextSpeed = defaultTextSpeed;
    typeWriter(line.text);
}

function advanceDialogue(force = false) {
    // Dispatch event to notify UI (e.g., hide popups)
    document.dispatchEvent(new Event('dialogueAdvanced'));

    // If waiting for auto-skip and not forced, block user input
    if (isWaitingForAutoSkip && force !== true) return;

    if (isTyping) {
        // If currently typing, finish immediately
        finishTyping();
    } else {
        // Move to next line
        currentLineIndex++;
        const currentSection = gameScript[currentSectionName];

        if (currentSection && currentLineIndex < currentSection.length) {
            const line = currentSection[currentLineIndex];
            updateDialogue(line);
        } else {
            console.log("End of section");
            if (showTopicsOnEnd) {
                // Dispatch event to show topic menu
                document.dispatchEvent(new Event('showTopicMenu'));
            }
        }
    }
}

function startGame() {
    const initialSection = gameScript[currentSectionName];
    if (initialSection && initialSection.length > 0) {
        // Check if the first line contains a sprite command but NO fade-in command
        // If so, we must force the character to be visible immediately
        const hasSprite = /\{sprite:[^}]+\}/.test(initialSection[0].text);
        const hasFadeIn = initialSection[0].text.includes('{fadeInCharacter}');
        
        if (hasSprite && !hasFadeIn) {
            character.style.transition = "none";
            character.style.opacity = "1";
            void character.offsetWidth; // Trigger reflow
            character.style.transition = ""; // Restore transition
        }
        updateDialogue(initialSection[0]);
    }
}
