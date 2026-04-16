
let isWaitingForAnimation = false;
let activeCharacterFadeTarget = null;

function syncTopBarTextRenderingState() {
    if (typeof window.refreshTopBarButtonDisabledState === 'function') {
        window.refreshTopBarButtonDisabledState();
    }
}

function setNameTagText(name) {
    if (!nameTag) return;

    let textEl = nameTag.querySelector('.name-tag-text');
    if (!textEl) {
        nameTag.textContent = '';
        textEl = document.createElement('span');
        textEl.className = 'name-tag-text';
        nameTag.appendChild(textEl);
    }

    textEl.textContent = name || '';
}

function fitNameTagText() {
    if (!nameTag) return;

    const textEl = nameTag.querySelector('.name-tag-text');
    if (!textEl) return;

    nameTag.style.setProperty('--name-tag-text-scale-x', '1');
    textEl.style.transform = 'none'; // Temporarily kill transform explicitly

    // Force synchronous reflow so scrollWidth is accurately measured at scale = 1
    void textEl.offsetWidth;

    const style = getComputedStyle(nameTag);
    const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    let availableWidth = nameTag.clientWidth - paddingX;
    let requiredWidth = textEl.scrollWidth;

    textEl.style.transform = ''; // Restore CSS transform rule

    if (!availableWidth || !requiredWidth) return;

    const ratio = Math.min(1, availableWidth / requiredWidth);
    nameTag.style.setProperty('--name-tag-text-scale-x', String(ratio));
}

window.setNameTagText = setNameTagText;
window.fitNameTagText = fitNameTagText;
window.addEventListener('resize', fitNameTagText);

if (typeof ResizeObserver !== 'undefined' && typeof gameContainer !== 'undefined') {
    const layoutObserver = new ResizeObserver(() => {
        requestAnimationFrame(fitNameTagText);
    });
    layoutObserver.observe(gameContainer);
    if (nameTag) layoutObserver.observe(nameTag);
}

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
    if (typingInterval) clearTimeout(typingInterval);
    isTyping = true;
    syncTopBarTextRenderingState();
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
function shouldPreserveBackgroundForCourtView(startIndex) {
    if (!Array.isArray(segments)) return false;

    for (let i = startIndex + 1; i < segments.length; i++) {
        const nextSegment = segments[i];
        if (!nextSegment) continue;

        if (nextSegment.type === 'bg' || nextSegment.type === 'fadeBg') {
            return true;
        }

        if ([
            'text',
            'pause',
            'flash',
            'jump',
            'jumpIf',
            'option',
            'startCE',
            'returnToCE',
            'endCE'
        ].includes(nextSegment.type)) {
            break;
        }
    }

    return false;
}

function processCommonSegment(segment) {
    if (segment && segment.type === 'courtView') {
        segment.preserveBackground = shouldPreserveBackgroundForCourtView(segmentIndex);
    }

    // Let timed courtroom sprite swaps be handled by the renderer loop so
    // `time`, `sound`, and `shake` metadata behaves like regular sprite tags.
    if (segment.type !== 'courtSprite') {
        const actionResult = executeScriptAction(segment);
        if (actionResult === 'STOP') return 'STOP';
        if (actionResult === true) return 'CONTINUE';
    }

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

function isFadeSegment(segment) {
    if (!segment) return false;
    return [
        'fadeIn',
        'fadeOut',
        'fadeBg',
        'fadeOutBg',
        'fadeInBg',
        'fadeFg',
        'fadeOutFg',
        'fadeInFg'
    ].includes(segment.type);
}

function processFadeBatch() {
    let i = segmentIndex;
    let maxWait = 0;
    const shouldSkipFadeDurations = typeof isFastForwarding !== 'undefined' && !!isFastForwarding;

    while (i < segments.length && isFadeSegment(segments[i])) {
        const segment = segments[i];

        if (segment.type === 'fadeIn' || segment.type === 'fadeOut') {
            const charFadeDuration = shouldSkipFadeDurations ? 0 : (segment.duration || 1000);
            const isFadeIn = segment.type === 'fadeIn';
            let handledCourt = false;

            if (typeof window.fadeCurrentCourtSpriteContainer === 'function') {
                handledCourt = window.fadeCurrentCourtSpriteContainer(charFadeDuration, isFadeIn);
            }

            if (!handledCourt) {
                if (isFadeIn) {
                    character.style.transition = 'none';
                    character.style.opacity = '0';
                    void character.offsetWidth;
                }
                character.style.transition = `opacity ${charFadeDuration}ms ease-in-out`;
                if (isFadeIn) {
                    if (i + 1 < segments.length && segments[i + 1].type === 'sprite') {
                        const nextSeg = segments[i + 1];
                        changeSprite(nextSeg.charName, nextSeg.spriteKey);
                        i++;
                    }
                    character.style.opacity = '1';
                    activeCharacterFadeTarget = '1';
                    characterIsVisible = true;
                } else {
                    character.style.opacity = '0';
                    activeCharacterFadeTarget = '0';
                    characterIsVisible = false;
                }
            } else {
                // If handled by court mode, just consume the next sprite seg if it exists for fadeIn
                if (isFadeIn && i + 1 < segments.length && segments[i + 1].type === 'sprite') {
                    const nextSeg = segments[i + 1];
                    changeSprite(nextSeg.charName, nextSeg.spriteKey);
                    i++;
                }
            }
            maxWait = Math.max(maxWait, charFadeDuration);
        } else if (segment.type === 'fadeBg') {
            const bgFadeDuration = shouldSkipFadeDurations ? 0 : (segment.duration || 400);
            if (window.fadeBackground) {
                window.fadeBackground(segment.bgName, bgFadeDuration);
                maxWait = Math.max(maxWait, bgFadeDuration * 2);
            } else {
                changeBackground(segment.bgName);
            }
        } else if (segment.type === 'fadeOutBg') {
            const bgFadeDuration = shouldSkipFadeDurations ? 0 : (segment.duration || 400);
            if (window.fadeOutBackground) {
                window.fadeOutBackground(bgFadeDuration);
                maxWait = Math.max(maxWait, bgFadeDuration);
            } else if (typeof backgroundElement !== 'undefined' && backgroundElement) {
                backgroundElement.style.opacity = '0';
            }
        } else if (segment.type === 'fadeInBg') {
            const bgFadeDuration = shouldSkipFadeDurations ? 0 : (segment.duration || 400);
            if (window.fadeInBackground) {
                window.fadeInBackground(bgFadeDuration);
                maxWait = Math.max(maxWait, bgFadeDuration);
            } else if (typeof backgroundElement !== 'undefined' && backgroundElement) {
                backgroundElement.style.opacity = '1';
            }
        } else if (segment.type === 'fadeFg') {
            const fgFadeDuration = shouldSkipFadeDurations ? 0 : (segment.duration || 400);
            if (window.fadeForeground) {
                window.fadeForeground(segment.fgName, fgFadeDuration);
                maxWait = Math.max(maxWait, fgFadeDuration * 2);
            } else {
                changeForeground(segment.fgName);
            }
        } else if (segment.type === 'fadeOutFg') {
            const fgFadeDuration = shouldSkipFadeDurations ? 0 : (segment.duration || 400);
            if (window.fadeOutForeground) {
                window.fadeOutForeground(fgFadeDuration);
                maxWait = Math.max(maxWait, fgFadeDuration);
            } else if (typeof foregroundElement !== 'undefined' && foregroundElement) {
                foregroundElement.style.opacity = '0';
            }
        } else if (segment.type === 'fadeInFg') {
            const fgFadeDuration = shouldSkipFadeDurations ? 0 : (segment.duration || 400);
            if (window.fadeInForeground) {
                window.fadeInForeground(fgFadeDuration);
                maxWait = Math.max(maxWait, fgFadeDuration);
            } else if (typeof foregroundElement !== 'undefined' && foregroundElement) {
                foregroundElement.style.opacity = '1';
            }
        }

        i++;
    }

    segmentIndex = i;

    if (maxWait > 0) {
        typingInterval = setTimeout(processNextChar, maxWait);
    } else {
        processNextChar();
    }
}

function completeActiveCharacterFadeInstant() {
    if (activeCharacterFadeTarget === null) return;
    character.style.transition = 'none';
    character.style.opacity = activeCharacterFadeTarget;
    void character.offsetWidth;
    character.style.transition = '';
    activeCharacterFadeTarget = null;
}

function finishFadeBatchInstant() {
    let i = segmentIndex;

    while (i < segments.length && isFadeSegment(segments[i])) {
        const segment = segments[i];

        if (segment.type === 'fadeIn' || segment.type === 'fadeOut') {
            const isFadeIn = segment.type === 'fadeIn';
            let handledCourt = false;
            
            if (typeof window.fadeCurrentCourtSpriteContainer === 'function') {
                handledCourt = window.fadeCurrentCourtSpriteContainer(0, isFadeIn);
            }

            if (!handledCourt) {
                character.style.transition = 'none';
                if (isFadeIn) {
                    if (i + 1 < segments.length && segments[i + 1].type === 'sprite') {
                        const nextSeg = segments[i + 1];
                        changeSprite(nextSeg.charName, nextSeg.spriteKey);
                        i++;
                    }
                    character.style.opacity = 1;
                    characterIsVisible = true;
                } else {
                    character.style.opacity = 0;
                    characterIsVisible = false;
                }
                void character.offsetWidth;
                character.style.transition = '';
            } else {
                if (isFadeIn && i + 1 < segments.length && segments[i + 1].type === 'sprite') {
                    const nextSeg = segments[i + 1];
                    changeSprite(nextSeg.charName, nextSeg.spriteKey);
                    i++;
                }
            }
        } else if (segment.type === 'fadeBg') {
            if (window.fadeBackground) window.fadeBackground(segment.bgName, 0);
            else changeBackground(segment.bgName);
        } else if (segment.type === 'fadeOutBg') {
            if (window.fadeOutBackground) window.fadeOutBackground(0);
        } else if (segment.type === 'fadeInBg') {
            if (window.fadeInBackground) window.fadeInBackground(0);
        } else if (segment.type === 'fadeFg') {
            changeForeground(segment.fgName);
            if (typeof foregroundElement !== 'undefined' && foregroundElement) {
                foregroundElement.style.transition = 'none';
                foregroundElement.style.opacity = '1';
            }
        } else if (segment.type === 'fadeOutFg') {
            if (typeof foregroundElement !== 'undefined' && foregroundElement) {
                foregroundElement.style.transition = 'none';
                foregroundElement.style.opacity = '0';
            }
        } else if (segment.type === 'fadeInFg') {
            if (typeof foregroundElement !== 'undefined' && foregroundElement) {
                foregroundElement.style.transition = 'none';
                foregroundElement.style.opacity = '1';
            }
        }

        i++;
    }

    segmentIndex = i;
}


function processNextChar() {
    if (segmentIndex >= segments.length) {
        isTyping = false;
        syncTopBarTextRenderingState();
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

    if (isFadeSegment(segment)) {
        processFadeBatch();
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
    } else if (segment.type === 'showCharacter' || segment.type === 'hideCharacter') {
        const isVisible = (segment.type === 'showCharacter');
        let handledCourt = false;

        if (typeof window.setCurrentCourtSpriteContainerVisibility === 'function') {
            handledCourt = window.setCurrentCourtSpriteContainerVisibility(isVisible);
        }

        if (!handledCourt) {
            character.style.transition = "none";
            character.style.opacity = isVisible ? 1 : 0;
            void character.offsetWidth;
            character.style.transition = "";
        }

        characterIsVisible = isVisible;
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
        characterIsVisible = true;
        void character.offsetWidth;
        character.style.transition = "";

        changeSprite(segment.charName, segment.spriteKey);
        const charData = characters[segment.charName];
        const animData = charData ? charData[segment.spriteKey] : null;
        const animDuration = Number(animData && animData.time);
        if (Number.isFinite(animDuration) && animDuration > 0) {
            scheduleSpriteShakeEvents(animData);
            scheduleSpriteSoundEvents(animData);
            segmentIndex++;
            typingInterval = setTimeout(processNextChar, animDuration);
        } else {
            segmentIndex++;
            processNextChar();
        }
    } else if (segment.type === 'courtSprite') {
        const animData = window.setCourtSlotSprite
            ? window.setCourtSlotSprite(segment.slot, segment.emotion)
            : null;
        const animDuration = Number(animData && animData.time);

        if (Number.isFinite(animDuration) && animDuration > 0) {
            scheduleSpriteShakeEvents(animData);
            scheduleSpriteSoundEvents(animData);
            segmentIndex++;
            typingInterval = setTimeout(processNextChar, animDuration);
        } else {
            segmentIndex++;
            processNextChar();
        }
    } else if (isFadeSegment(segment)) {
        processFadeBatch();
    } else if (segment.type === 'playAnimation') {
        setSpriteState('default');
        isWaitingForAnimation = true;
        syncTopBarTextRenderingState();
        
        if (window.AnimationManager) {
            window.AnimationManager.play(segment.name).then(() => {
                if (isWaitingForAnimation) {
                    isWaitingForAnimation = false;
                    syncTopBarTextRenderingState();
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
            syncTopBarTextRenderingState();
            window.playTopVideoSequence(segment.videoKey, () => {
                segmentIndex++;
                processNextChar();

                // If the video segment completed the line, auto-advance immediately
                // so natural video end behaves the same as skipping.
                if (segmentIndex >= segments.length && !isTyping) {
                    advanceDialogue(true);
                }
            });
        } else {
            segmentIndex++;
            processNextChar();
        }
    } else if (segment.type === 'skip') {
        isWaitingForAutoSkip = true;
        setSpriteState('default');
        isTyping = false;
        syncTopBarTextRenderingState();
        clearTimeout(typingInterval); // Stop any pending typing
        setTimeout(() => {
            isWaitingForAutoSkip = false;
            syncTopBarTextRenderingState();
            advanceDialogue(true);
        }, segment.duration);
    } else if (segment.type === 'courtPan') {
        let dur = segment.duration || 400;
        if (typeof isFastForwarding !== 'undefined' && isFastForwarding) {
            dur = 0;
        }
        if (window.panToStand) {
            window.panToStand(segment.view, dur);
        }
        segmentIndex++;
        typingInterval = setTimeout(processNextChar, dur);
    } else if (segment.type === 'jump' || segment.type === 'jumpIf' || segment.type === 'option' || segment.type === 'present') {
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
    if (isWaitingForAnimation) {
        return;
    }

    clearTimeout(typingInterval);
    isWaitingForAnimation = false;
    completeActiveCharacterFadeInstant();

    if (typeof window.completePendingVisualTransitions === 'function') {
        window.completePendingVisualTransitions();
    }
    if (typeof window.completeActiveVisualOpacityTransitionsInstant === 'function') {
        window.completeActiveVisualOpacityTransitionsInstant();
    }
    if (typeof window.completeActiveCourtroomFadeInstant === 'function') {
        window.completeActiveCourtroomFadeInstant();
    }
    if (typeof window.completeActiveBgmFadeInstant === 'function') {
        window.completeActiveBgmFadeInstant();
    }

    if (typeof window.snapBackgroundToPositionInstant === 'function') {
        window.snapBackgroundToPositionInstant();
    }
    if (typeof window.snapCourtPanInstant === 'function') {
        window.snapCourtPanInstant();
    }

    while (segmentIndex < segments.length) {
        const segment = segments[segmentIndex];

        // 1. Try Common Segment
        const commonResult = processCommonSegment(segment);
        if (commonResult === 'STOP') return;
        if (commonResult === 'CONTINUE') {
            segmentIndex++;
            continue;
        }

        if (isFadeSegment(segment)) {
            finishFadeBatchInstant();
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
            characterIsVisible = true;
            void character.offsetWidth;
            character.style.transition = "";

            changeSprite(segment.charName, segment.spriteKey);
            segmentIndex++;
        } else if (segment.type === 'courtSprite') {
            if (window.setCourtSlotSprite) {
                window.setCourtSlotSprite(segment.slot, segment.emotion);
            }
            segmentIndex++;
        } else if (segment.type === 'showCharacter' || segment.type === 'hideCharacter') {
            // Instant toggle
            const isVisible = (segment.type === 'showCharacter');
            let handledCourt = false;

            if (typeof window.setCurrentCourtSpriteContainerVisibility === 'function') {
                handledCourt = window.setCurrentCourtSpriteContainerVisibility(isVisible);
            }

            if (!handledCourt) {
                character.style.transition = "none";
                character.style.opacity = isVisible ? 1 : 0;
                void character.offsetWidth;
                character.style.transition = "";
            }

            characterIsVisible = isVisible;
            activeCharacterFadeTarget = null;
            segmentIndex++;
        } else if (segment.type === 'showTextbox' || segment.type === 'hideTextbox') {
            textboxContainer.style.opacity = (segment.type === 'showTextbox') ? 1 : 0;
            segmentIndex++;
        } else if (segment.type === 'playAnimation') {
            segmentIndex++;
        } else if (segment.type === 'playVideo') {
            if (window.playTopVideoSequence) {
                isTyping = false;
                syncTopBarTextRenderingState();
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
            syncTopBarTextRenderingState();
            setTimeout(() => {
                isWaitingForAutoSkip = false;
                syncTopBarTextRenderingState();
                advanceDialogue(true); // Force advance
            }, segment.duration);
            return; // Stop processing further segments
        } else if (segment.type === 'pause') {
            // Ignore pauses in skip mode
            segmentIndex++;
        } else if (segment.type === 'courtPan') {
            // Instant pan during skip/fast-forward
            if (window.panToStand) {
                window.panToStand(segment.view, 0);
            }
            segmentIndex++;
        } else {
            // Any unhandled keys (should be none significant)
            segmentIndex++;
        }
    }

    isTyping = false;
    syncTopBarTextRenderingState();
    setSpriteState('default'); // End of all text
    document.dispatchEvent(new Event('lineTypingCompleted'));
}

function updateDialogue(line) {
    if (textContent.textContent.trim().length > 0) {
        const currentDisplayedName = nameTag
            ? ((nameTag.querySelector('.name-tag-text')?.textContent) || nameTag.textContent || '').trim()
            : '';
        window.lastLineHTML = textContent.innerHTML;
        window.lastLineName = currentDisplayedName || '';
    }

    if (typeof logDialogueHistory === 'function') {
        logDialogueHistory(line);
    }

    if (line.name) {
        setNameTagText(line.name);
        nameTag.style.display = '';
        nameTag.style.opacity = '1';
        textboxContainer.classList.remove('no-name');
        fitNameTagText();
        requestAnimationFrame(fitNameTagText);
    } else {
        nameTag.style.display = 'none';
        nameTag.style.opacity = '';
        nameTag.style.setProperty('--name-tag-text-scale-x', '1');
        textboxContainer.classList.add('no-name');
    }
    // Reset Text Color to default
    textContent.style.color = "white";
    // Reset Text Alignment to default
    textContent.style.textAlign = "left";
    // Reset Text Speed to default
    currentTextSpeed = defaultTextSpeed;
    typeWriter(line.text);
}
