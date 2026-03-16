console.log("Text Renderer Loaded");

let isWaitingForAnimation = false;

/**
 * Schedules shake events declared on a sprite animation.
 * Supported formats per event:
 * - [startMs, durationMs]
 * - { at: startMs, duration: durationMs }
 * - { time: startMs, duration: durationMs }
 */
function scheduleSpriteShakeEvents(animData) {
    if (!animData || !Array.isArray(animData.shake)) return;
    if (typeof triggerShake !== 'function') return;

    animData.shake.forEach((event) => {
        let startMs;
        let durationMs;

        if (Array.isArray(event)) {
            startMs = Number(event[0]);
            durationMs = Number(event[1]);
        } else if (event && typeof event === 'object') {
            startMs = Number(event.at ?? event.time ?? event.start ?? event.frame);
            durationMs = Number(event.duration ?? event.shake ?? event.length ?? event.ms);
        }

        if (!Number.isFinite(startMs) || !Number.isFinite(durationMs)) return;
        if (startMs < 0 || durationMs <= 0) return;

        setTimeout(() => {
            triggerShake(durationMs);
        }, startMs);
    });
}

/**
 * Schedules sound events declared on a sprite animation.
 * Supported formats per event:
 * - [startMs, soundKey]
 * - { at: startMs, sound: soundKey }
 * - { time: startMs, sound: soundKey }
 */
function scheduleSpriteSoundEvents(animData) {
    if (!animData || !Array.isArray(animData.sound)) return;

    animData.sound.forEach((event) => {
        let startMs;
        let soundKey;

        if (Array.isArray(event)) {
            startMs = Number(event[0]);
            soundKey = event[1];
        } else if (event && typeof event === 'object') {
            startMs = Number(event.at ?? event.time ?? event.start ?? event.frame);
            soundKey = event.sound ?? event.key ?? event.name;
        }

        if (!Number.isFinite(startMs) || startMs < 0) return;
        if (typeof soundKey !== 'string' || !soundKey.trim()) return;

        setTimeout(() => {
            if (typeof window.playSound === 'function') {
                window.playSound(soundKey);
            } else if (typeof playSound === 'function') {
                playSound(soundKey);
            }
        }, startMs);
    });
}

window.setTalkingAnimationState = function (state) {
    currentTalkingAnimationEnabled = state;
}

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
    // Try delegated script actions first
    const actionResult = executeScriptAction(segment);
    if (actionResult === 'STOP') return 'STOP';
    if (actionResult === true) return 'CONTINUE';

    // Handle Renderer-specific segments
    switch (segment.type) {
        case 'color':
            currentSpan = document.createElement('span');
            currentSpan.style.color = segment.value;
            textContent.appendChild(currentSpan);
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
        default:
            return 'UNHANDLED';
    }
}


function processNextChar() {
    if (segmentIndex >= segments.length) {
        isTyping = false;
        setSpriteState('default'); // Finished typing
        document.dispatchEvent(new Event('lineTypingCompleted'));
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
        character.style.transition = "opacity 1s ease-in-out";
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
    } else if (segment.type === 'showTextbox' || segment.type === 'hideTextbox') {
        textboxContainer.style.opacity = (segment.type === 'showTextbox') ? 1 : 0;
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
            scheduleSpriteShakeEvents(animData);
            scheduleSpriteSoundEvents(animData);
            segmentIndex++;
            typingInterval = setTimeout(processNextChar, animData.time);
        } else {
            segmentIndex++;
            processNextChar();
        }
    } else if (segment.type === 'playAnimation') {
        setSpriteState('default');
        isWaitingForAnimation = true;
        
        if (window.AnimationManager) {
            window.AnimationManager.play(segment.name).then(() => {
                if (isWaitingForAnimation) {
                    isWaitingForAnimation = false;
                    segmentIndex++;
                    processNextChar();
                }
            });
        } else {
             segmentIndex++;
             processNextChar();
        }
    } else if (segment.type === 'playVideo') {
        if (window.playTopVideoSequence) {
            setSpriteState('default');
            isTyping = false;
            window.playTopVideoSequence(segment.videoKey, () => {
                segmentIndex++;
                processNextChar();
            });
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

    const msg = document.createElement('h1');
    const hasCustomMessage = typeof gameOverMessage === 'string' && gameOverMessage.trim().length > 0 && gameOverMessage !== 'GAME OVER';
    msg.textContent = hasCustomMessage ? gameOverMessage : window.t('ui.theEnd', 'THE END');
    overlay.appendChild(msg);

    const restartBtn = document.createElement('button');
    restartBtn.textContent = window.t('ui.restart', 'Restart');
    restartBtn.onclick = () => {
        // Remove overlay
        overlay.remove();
        isInputBlocked = false;
        isTyping = false;

        // Reset Life
        if (typeof currentLife !== 'undefined') {
            currentLife = maxLife;
        }
        // Reset isGameOverPending
        window.isGameOverPending = false;

        // Jump to last checkpoint/section
        // Use lastCheckpointSection if available, otherwise use initialSectionName
        const targetSection = lastCheckpointSection || initialSectionName || currentSectionName;
        jumpToSection(targetSection);
    };
    overlay.appendChild(restartBtn);

    document.body.appendChild(overlay);
}

function finishTyping() {
    clearTimeout(typingInterval);
    isWaitingForAnimation = false;

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
        } else if (segment.type === 'showTextbox' || segment.type === 'hideTextbox') {
            textboxContainer.style.opacity = (segment.type === 'showTextbox') ? 1 : 0;
            segmentIndex++;
        } else if (segment.type === 'playAnimation') {
            segmentIndex++;
        } else if (segment.type === 'playVideo') {
            if (window.playTopVideoSequence) {
                isTyping = false;
                window.playTopVideoSequence(segment.videoKey, () => {
                    advanceDialogue(true);
                });
                return;
            }
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
    document.dispatchEvent(new Event('lineTypingCompleted'));
}

function updateDialogue(line) {
    if (typeof logDialogueHistory === 'function') {
        logDialogueHistory(line);
    }

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
