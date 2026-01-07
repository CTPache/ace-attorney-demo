console.log("Engine Loaded");

let showTopicsOnEnd = false;

function jumpToSection(sectionName) {
    if (gameScript[sectionName]) {
        currentSectionName = sectionName;
        currentLineIndex = 0;
        showTopicsOnEnd = false; // Reset flag
        
        isScenePlaying = true;
        updateSceneState();

        updateDialogue(gameScript[sectionName][0]);
    } else {
        console.error(`Section ${sectionName} not found!`);
    }
}

function handlePresentEvidence(evidenceId) {
    console.log(`Presenting evidence: ${evidenceId}`);
    
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
    console.log(`State updated: ${key} = ${value}`);
}

function advanceDialogue(force = false) {
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
    } else {
        // Move to next line
        currentLineIndex++;
        const currentSection = gameScript[currentSectionName];

        if (currentSection && currentLineIndex < currentSection.length) {
            const line = currentSection[currentLineIndex];
            updateDialogue(line);
        } else {
            console.log("End of section");
            
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

function startGame() {
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
