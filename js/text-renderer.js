console.log("Text Renderer Loaded");

function typeWriter(text) {
    isTyping = true;
    textContent.innerHTML = ""; // Clear content

    // Create initial span
    currentSpan = document.createElement('span');
    textContent.appendChild(currentSpan);

    // Parse text using the parser module
    segments = parseText(text);

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
    } else if (segment.type === 'sectionEnd') {
        showTopicsOnEnd = true;
        segmentIndex++;
        processNextChar();
    } else if (segment.type === 'option') {
        // Stop typing, don't advance segment or char
        isTyping = false; 
        setSpriteState('default');
        
        // Render the options menu
        if (window.renderOptionsMenu) {
            window.renderOptionsMenu(segment.optionKey);
        }
        
        // We do strictly NOTHING else. The button click will trigger jumpToSection.
        return; 
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
    } else if (segment.type === 'addProfile') {
        if (profilesDB[segment.key] && !profilesInventory.includes(segment.key)) {
            profilesInventory.push(segment.key);
            console.log(`Added profile: ${segment.key}`);
            
            // Dispatch event for UI updates if showPopup is true
            if (segment.showPopup) {
                const event = new CustomEvent('profileAdded', { detail: { key: segment.key } });
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
    } else if (segment.type === 'playSound') {
        playSound(segment.soundName);
        segmentIndex++;
        processNextChar();
    } else if (segment.type === 'startBGM') {
        playBGM(segment.musicName);
        segmentIndex++;
        processNextChar();
    } else if (segment.type === 'stopBGM') {
        stopBGM(segment.fadeOut);
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
        } else if (segment.type === 'addProfile') {
            if (profilesDB[segment.key] && !profilesInventory.includes(segment.key)) {
                profilesInventory.push(segment.key);
                console.log(`Added profile: ${segment.key}`);
            }
        } else if (segment.type === 'topicUnlock') {
            if (!unlockedTopics.includes(segment.topicId)) {
                unlockedTopics.push(segment.topicId);
            }
        } else if (segment.type === 'sectionEnd') {
            showTopicsOnEnd = true;
        } else if (segment.type === 'playSound') {
            playSound(segment.soundName);
        } else if (segment.type === 'startBGM') {
            playBGM(segment.musicName);
        } else if (segment.type === 'stopBGM') {
            stopBGM(segment.fadeOut);
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
