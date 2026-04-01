
let showTopicsOnEnd = false;

function isAutoPlayBlockedByCrossExamination() {
    return !!(
        window.CrossExamination &&
        window.CrossExamination.isCEMode &&
        window.CrossExamination.isLoopActive
    );
}

function clearAutoPlayTimer() {
    if (autoPlayTimeout) {
        clearTimeout(autoPlayTimeout);
        autoPlayTimeout = null;
    }
}

function getAutoPlayDelayMs() {
    const renderedLength = (textContent.textContent || '').trim().length;
    const extra = Math.min(autoPlayMaxExtraDelay, renderedLength * autoPlayPerCharDelay);
    return autoPlayBaseDelay + extra;
}

function setAutoPlaySpeedPreset(preset) {
    if (preset === 'slow') {
        autoPlaySpeedPreset = 'slow';
        autoPlayBaseDelay = 1000;
        autoPlayPerCharDelay = 15;
        autoPlayMaxExtraDelay = 2000;
    } else if (preset === 'fast') {
        autoPlaySpeedPreset = 'fast';
        autoPlayBaseDelay = 200;
        autoPlayPerCharDelay = 5;
        autoPlayMaxExtraDelay = 1000;
    } else {
        autoPlaySpeedPreset = 'normal';
        autoPlayBaseDelay = 800;
        autoPlayPerCharDelay = 10;
        autoPlayMaxExtraDelay = 1500;
    }
}

function extractPrintableDialogueText(rawText) {
    if (typeof rawText !== 'string' || !rawText.length) return '';

    const parsed = parseText(rawText);
    let plainText = '';

    parsed.forEach((segment) => {
        if (segment.type === 'text') {
            plainText += segment.content;
        } else if (segment.type === 'nl') {
            plainText += '\n';
        }
    });

    return plainText.replace(/\r/g, '').trim();
}

function logDialogueHistory(line) {
    if (!line || typeof line !== 'object') return;

    const printableText = extractPrintableDialogueText(line.text || '');
    if (!printableText || !printableText.replace(/\s/g, '').length) return;

    const entry = {
        name: (typeof line.name === 'string' && line.name.trim()) ? line.name.trim() : ' ',
        text: printableText
    };

    dialogueHistory.push(entry);
    if (dialogueHistory.length > maxDialogueHistoryEntries) {
        dialogueHistory.shift();
    }

    document.dispatchEvent(new Event('historyUpdated'));
}

function scheduleAutoPlayAdvance() {
    clearAutoPlayTimer();

    if (!isAutoPlayEnabled) return;
    if (!isScenePlaying) return;
    if (isInputBlocked) return;
    if (isTyping) return;
    if (isWaitingForAutoSkip) return;
    if (isAutoPlayBlockedByCrossExamination()) return;

    autoPlayTimeout = setTimeout(() => {
        autoPlayTimeout = null;

        if (!isAutoPlayEnabled) return;
        if (!isScenePlaying) return;
        if (isInputBlocked) return;
        if (isTyping) return;
        if (isWaitingForAutoSkip) return;
        if (isAutoPlayBlockedByCrossExamination()) return;

        advanceDialogue(true);
    }, getAutoPlayDelayMs());
}

window.scheduleAutoPlayAdvance = scheduleAutoPlayAdvance;
window.clearAutoPlayTimer = clearAutoPlayTimer;
window.setAutoPlaySpeedPreset = setAutoPlaySpeedPreset;
window.getDialogueHistory = () => dialogueHistory.slice();
window.clearDialogueHistory = () => {
    dialogueHistory = [];
    document.dispatchEvent(new Event('historyUpdated'));
};

document.addEventListener('lineTypingCompleted', () => {
    scheduleAutoPlayAdvance();
});

function jumpToSection(sectionName) {
    clearAutoPlayTimer();

    if (gameScript[sectionName]) {
        currentSectionName = sectionName;
        currentLineIndex = 0;
        showTopicsOnEnd = false; // Reset flag
        
        if (window.CrossExamination && window.CrossExamination.isCEMode) {
            window.CrossExamination.setLoopActive(false);
        }

        isScenePlaying = true;
        updateSceneState();

        updateDialogue(gameScript[sectionName][0]);
    } else {
        console.error(`Section ${sectionName} not found!`);
    }
}

function handlePresentEvidence(evidenceId) {
    
    // Determine the scene prefix (e.g., "Demo" or "Case1_Part1")
    // This allows for context-sensitive responses.
    const prefix = gameState['scenePrefix'] ? gameState['scenePrefix'] + "_" : "";
    
    const specificSection = `${prefix}evidence_${evidenceId}`;
    const defaultSection = `${prefix}evidence_default`;
    const globalDefault = `evidence_default`;

    if (gameScript[specificSection]) {
        jumpToSection(specificSection);
    } else if (gameScript[defaultSection]) {
        jumpToSection(defaultSection);
    } else if (gameScript[globalDefault]) {
        jumpToSection(globalDefault);
    } else {
        console.warn(`No evidence response found for ${evidenceId}`);
        console.warn(`Checked: ${specificSection}, ${defaultSection}, ${globalDefault}`);
    }
}

function setGameState(key, value) {
    if (value === "true") value = true;
    else if (value === "false") value = false;
    else if (!isNaN(value)) value = parseFloat(value);
    
    gameState[key] = value;
}

function advanceDialogue(force = false) {
    clearAutoPlayTimer();

    // Check if input is blocked (e.g., options menu open)
    if (isInputBlocked) return;

    // Dispatch event to notify UI (e.g., hide popups)
    document.dispatchEvent(new Event('dialogueAdvanced'));

    // If waiting for auto-skip and not forced, block user input
    if (isWaitingForAutoSkip && force !== true) return;

    // If forced (e.g., from {skip}), stop waiting
    if (force === true) isWaitingForAutoSkip = false;

    if (isTyping) {
        // If currently typing, finish immediately
        finishTyping();
    } else if (window.CrossExamination && window.CrossExamination.isCEMode && window.CrossExamination.isLoopActive) {
        // If in Cross-Examination mode and the loop is active, advance to next statement
        window.CrossExamination.next();
    } else {
        // Move to next line
        currentLineIndex++;
        const currentSection = gameScript[currentSectionName];

        if (currentSection && currentLineIndex < currentSection.length) {
            const line = currentSection[currentLineIndex];
            updateDialogue(line);
        } else {
            clearAutoPlayTimer();
            
            // Check if game end is already visible (prevent restart loop)
            if (document.getElementById('end-game-overlay')) {
                return;
            }

            if (window.isGameOverPending) {
                jumpToSection(gameOverLabel);
                return;
            }

            if (showTopicsOnEnd) {
                isScenePlaying = false;
                updateSceneState();
                // Dispatch event to show topic menu
                document.dispatchEvent(new Event('showTopicMenu'));
            } else {
                isScenePlaying = false;
                updateSceneState();
            }
        }
    }
}

function updateSceneState() {
    document.dispatchEvent(new CustomEvent('sceneStateChanged', { detail: { isPlaying: isScenePlaying } }));
}

function clearTopScreen() {
    // Background
    if (backgroundElement) {
        backgroundElement.style.backgroundImage = 'none';
        backgroundElement.style.backgroundColor = '';
    }
    // Foreground
    if (foregroundElement) {
        foregroundElement.style.backgroundImage = 'none';
    }
    // Character sprite
    if (character) {
        character.style.transition = 'none';
        character.style.opacity = '0';
        character.src = '/';
        void character.offsetWidth;
        character.style.transition = '';
    }
    // Stop and hide any playing video
    if (typeof window.stopTopVideoSequence === 'function') {
        window.stopTopVideoSequence(false);
    }
    if (topVideo) {
        topVideo.classList.add('hidden');
    }
    // Clear flash overlay
    if (flashOverlay) {
        flashOverlay.classList.remove('flashing');
        flashOverlay.style.opacity = '0';
    }
    // Reset text box content
    if (nameTag) { nameTag.textContent = ''; nameTag.style.display = 'none'; nameTag.style.opacity = ''; }
    if (textboxContainer) textboxContainer.classList.add('no-name');
    if (textContent) textContent.innerHTML = '';
    // Clean up courtroom layers
    if (typeof window.cleanupCourtroom === 'function') {
        window.cleanupCourtroom();
    }
    // Reset internal tracking state
    currentCharacterName = '';
    currentAnimationKey = '';
    currentBackgroundKey = '';
}

window.clearTopScreen = clearTopScreen;

function startGame() {
    clearAutoPlayTimer();

    isScenePlaying = true;
    updateSceneState();
    
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
