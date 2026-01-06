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

/**
 * Handles segments that have identical logic in both "typing" and "instant/skip" modes.
 * Returns 'CONTINUE' if handled and execution should proceed.
 * Returns 'STOP' if execution should stop (game end).
 * Returns 'UNHANDLED' if the segment requires specific timing/flow logic.
 */
function processCommonSegment(segment) {
    switch (segment.type) {
        case 'color':
            currentSpan = document.createElement('span');
            currentSpan.style.color = segment.value;
            textContent.appendChild(currentSpan);
            return 'CONTINUE';
        case 'bg':
            changeBackground(segment.bgName);
            return 'CONTINUE';
        case 'setState':
            setGameState(segment.key, segment.value);
            return 'CONTINUE';
        case 'blip':
            currentBlipType = segment.value;
            if (segment.shouldSpeak !== undefined) {
                currentTalkingAnimationEnabled = segment.shouldSpeak;
            } else {
                currentTalkingAnimationEnabled = true; // Default to true if not specified? 
                // Or retain state? 
                // The request implies it's a parameter of the command.
                // Usually {blip} changes the *sound*.
                // Should {blip:1} reset silent mode?
                // Probably yes. "reuse the blip control code".
                // So {blip:1} -> sound 1, talking ON.
                // {blip:1,false} -> sound 1, talking OFF.
                currentTalkingAnimationEnabled = true;
            }
            if (segment.shouldSpeak === false) currentTalkingAnimationEnabled = false;

            return 'CONTINUE';
        case 'center':
            textContent.style.textAlign = 'center';
            return 'CONTINUE';
        case 'nl':
            textContent.appendChild(document.createElement('br'));
            const newSpan = document.createElement('span');
            if (currentSpan) {
                newSpan.style.cssText = currentSpan.style.cssText;
            }
            currentSpan = newSpan;
            textContent.appendChild(currentSpan);
            return 'CONTINUE';
        case 'textSpeed':
            currentTextSpeed = segment.value;
            return 'CONTINUE';
        case 'addEvidence':
            if (evidenceDB[segment.key] && !evidenceInventory.includes(segment.key)) {
                evidenceInventory.push(segment.key);
                gameState['evidence_' + segment.key] = true;
                console.log(`Added evidence: ${segment.key}`);
                if (segment.showPopup) {
                    const event = new CustomEvent('evidenceAdded', { detail: { key: segment.key } });
                    document.dispatchEvent(event);
                }
            }
            return 'CONTINUE';
        case 'removeEvidence':
            const removeIndex = evidenceInventory.indexOf(segment.key);
            if (removeIndex > -1) {
                evidenceInventory.splice(removeIndex, 1);
                delete gameState['evidence_' + segment.key];
                console.log(`Removed evidence: ${segment.key}`);
            }
            return 'CONTINUE';
        case 'updateEvidence':
            // Remove old
            const updateIndex = evidenceInventory.indexOf(segment.oldKey);
            if (updateIndex > -1) {
                evidenceInventory.splice(updateIndex, 1);
                delete gameState['evidence_' + segment.oldKey];
            }
            // Add new
            if (evidenceDB[segment.newKey] && !evidenceInventory.includes(segment.newKey)) {
                evidenceInventory.push(segment.newKey);
                gameState['evidence_' + segment.newKey] = true;
                console.log(`Updated evidence ${segment.oldKey} to ${segment.newKey}`);
                if (segment.showPopup) {
                    const event = new CustomEvent('evidenceAdded', { detail: { key: segment.newKey } });
                    document.dispatchEvent(event);
                }
            }
            return 'CONTINUE';
        case 'addProfile':
            if (profilesDB[segment.key] && !profilesInventory.includes(segment.key)) {
                profilesInventory.push(segment.key);
                console.log(`Added profile: ${segment.key}`);
                if (segment.showPopup) {
                    const event = new CustomEvent('profileAdded', { detail: { key: segment.key } });
                    document.dispatchEvent(event);
                }
            }
            return 'CONTINUE';
        case 'topicUnlock':
            if (!unlockedTopics.includes(segment.topicId)) {
                unlockedTopics.push(segment.topicId);
                console.log(`Unlocked topic: ${segment.topicId}`);
            }
            return 'CONTINUE';
        case 'sectionEnd':
            showTopicsOnEnd = true;
            return 'CONTINUE';
        case 'playSound':
            playSound(segment.soundName);
            return 'CONTINUE';
        case 'startBGM':
            playBGM(segment.musicName);
            return 'CONTINUE';
        case 'stopBGM':
            stopBGM(segment.fadeOut);
            return 'CONTINUE';
        case 'lifeMod':
            if (window.modifyLife) window.modifyLife(segment.amount);
            return 'CONTINUE';
        case 'showLifeBar':
            if (window.showLifeBar) window.showLifeBar(segment.penalty);
            return 'CONTINUE';
        case 'hideLifeBar':
            if (window.hideLifeBar) window.hideLifeBar();
            return 'CONTINUE';
        case 'setGameOver':
            gameOverLabel = segment.label;
            return 'CONTINUE';
        case 'endGame':
            showEndGameOverlay();
            isTyping = false;
            setSpriteState('default');
            return 'STOP';
        default:
            return 'UNHANDLED';
    }
}

function handleFlowControl(segment) {
    // Only intercept flow control segments
    const flowTypes = ['jump', 'jumpIf', 'option'];
    if (!flowTypes.includes(segment.type)) {
        return false;
    }

    if (window.isGameOverPending) {
         jumpToSection(gameOverLabel);
         return true; // Flow interrupted
    }

    if (segment.type === 'jump') {
        jumpToSection(segment.label);
        return true;
    } else if (segment.type === 'jumpIf') {
        if (gameState[segment.condition]) {
            jumpToSection(segment.labelTrue);
            return true;
        } else if (segment.labelFalse) {
            jumpToSection(segment.labelFalse);
            return true;
        } else {
             // Condition false and no false-label -> Continue to next segment
             return false;
        }
    } else if (segment.type === 'option') {
        // Stop typing, don't advance segment or char
        isTyping = false; 
        setSpriteState('default');
        
        // Render the options menu
        if (window.renderOptionsMenu) {
            window.renderOptionsMenu(segment.optionKey);
        }
        return true;
    }
    return false;
}

function processNextChar() {
    if (segmentIndex >= segments.length) {
        isTyping = false;
        setSpriteState('default'); // Finished typing
        return;
    }

    const segment = segments[segmentIndex];
    const commonResult = processCommonSegment(segment);

    if (commonResult === 'STOP') return;
    if (commonResult === 'CONTINUE') {
        segmentIndex++;
        // Use timeout to allow UI updates / break stack
        typingInterval = setTimeout(processNextChar, 0); 
        return;
    }

    // Handle Timed/Animated/Flow Segments
    if (segment.type === 'text') {
        if (currentTalkingAnimationEnabled) {
             setSpriteState('talking');
        }
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
        setSpriteState('default');
        segmentIndex++;
        typingInterval = setTimeout(processNextChar, segment.duration);
    } else if (segment.type === 'flash') {
        setSpriteState('default');
        triggerFlash();
        segmentIndex++;
        typingInterval = setTimeout(processNextChar, 200);
    } else if (segment.type === 'fadeIn' || segment.type === 'fadeOut') {
        if (segment.type === 'fadeIn') {
            if (segmentIndex + 1 < segments.length && segments[segmentIndex + 1].type === 'sprite') {
                const nextSeg = segments[segmentIndex + 1];
                changeSprite(nextSeg.charName, nextSeg.spriteKey);
                segmentIndex++; 
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
        void character.offsetWidth;
        character.style.transition = "";
        segmentIndex++;
        processNextChar();
    } else if (segment.type === 'sprite') {
        // Explicitly show character (mimic {showCharacter})
        character.style.transition = "none";
        character.style.opacity = 1;
        void character.offsetWidth;
        character.style.transition = "";

        changeSprite(segment.charName, segment.spriteKey);
        const charData = characters[segment.charName];
        const animData = charData ? charData[segment.spriteKey] : null;
        if (animData && animData.time) {
             segmentIndex++;
             typingInterval = setTimeout(processNextChar, animData.time);
        } else {
             segmentIndex++;
             processNextChar();
        }
    } else if (segment.type === 'skip') {
        isWaitingForAutoSkip = true;
        setSpriteState('default');
        isTyping = false;
        clearTimeout(typingInterval); // Stop any pending typing
        setTimeout(() => {
            advanceDialogue(true);
        }, segment.duration);
    } else if (segment.type === 'jump' || segment.type === 'jumpIf' || segment.type === 'option') {
        if (!handleFlowControl(segment)) {
            segmentIndex++;
            processNextChar();
        }
    }
}

function showEndGameOverlay() {
    if (document.getElementById('end-game-overlay')) return;

    // Stop fast forwarding if it's active
    if (typeof isFastForwarding !== 'undefined') {
        isFastForwarding = false;
    }
    if (typeof fastForwardInterval !== 'undefined' && fastForwardInterval) {
        clearInterval(fastForwardInterval);
    }
    // Block further inputs properly
    if (typeof isInputBlocked !== 'undefined') {
        isInputBlocked = true;
    }

    const overlay = document.createElement('div');
    overlay.id = 'end-game-overlay';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.color = 'white';
    overlay.style.flexDirection = 'column';
    overlay.style.zIndex = '2000';

    const msg = document.createElement('h1');
    msg.textContent = "THE END";
    overlay.appendChild(msg);

    const restartBtn = document.createElement('button');
    restartBtn.textContent = "Restart";
    restartBtn.style.padding = '10px 20px';
    restartBtn.style.fontSize = '24px';
    restartBtn.style.marginTop = '20px';
    restartBtn.style.cursor = 'pointer';
    restartBtn.onclick = () => location.reload();
    overlay.appendChild(restartBtn);

    document.body.appendChild(overlay);
}

function finishTyping() {
    clearTimeout(typingInterval);

    while (segmentIndex < segments.length) {
        const segment = segments[segmentIndex];

        // 1. Try Common Segment
        const commonResult = processCommonSegment(segment);
        if (commonResult === 'STOP') return;
        if (commonResult === 'CONTINUE') {
            segmentIndex++;
            continue;
        }

        // 2. Try Flow Control
        if (handleFlowControl(segment)) {
            return; // Stopped by flow control (jump/option)
        }

        // 3. Handle specific Instant/Skip Logic
        if (segment.type === 'text') {
            currentSpan.textContent += segment.content.substring(charIndex);
            charIndex = 0;
            segmentIndex++;
        } else if (segment.type === 'flash') {
            triggerFlash();
            segmentIndex++;
        } else if (segment.type === 'sprite') {
             // Instant sprite change + Show Character
            character.style.transition = "none";
            character.style.opacity = 1;
            void character.offsetWidth;
            character.style.transition = "";
            
            changeSprite(segment.charName, segment.spriteKey);
            segmentIndex++; 
        } else if (segment.type === 'fadeIn' || segment.type === 'fadeOut') {
            // Instant fade
            character.style.transition = "none";
            character.style.opacity = (segment.type === 'fadeIn') ? 1 : 0;
            void character.offsetWidth;
            character.style.transition = "";
            segmentIndex++;
        } else if (segment.type === 'showCharacter' || segment.type === 'hideCharacter') {
            // Instant toggle
            character.style.transition = "none";
            character.style.opacity = (segment.type === 'showCharacter') ? 1 : 0;
            void character.offsetWidth;
            character.style.transition = "";
            segmentIndex++;
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
        } else if (segment.type === 'pause') {
            // Ignore pauses in skip mode
            segmentIndex++;
        } else {
             // Any unhandled keys (should be none significant)
             segmentIndex++;
        }
    }

    isTyping = false;
    setSpriteState('default'); // End of all text
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
