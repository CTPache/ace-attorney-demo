console.log("Save/Load module loaded");

window.saveGame = function(slot = 1) {
    if (!currentSceneRequestPath || currentSceneRequestPath === "") {
        console.warn("Attempted to save from a non-game state.");
        const message = (typeof window.t === 'function') 
            ? window.t('ui.saveError', 'Cannot save from this menu!') 
            : 'Cannot save right now!';
        alert(message);
        return;
    }

    const saveData = {
        gameState: gameState || {},
        evidenceInventory: evidenceInventory || [],
        profilesInventory: profilesInventory || [],
        unlockedTopics: unlockedTopics || [],
        actionStates: actionStates || { examine: true, move: true, talk: true, present: true },
        currentLife: typeof currentLife !== 'undefined' ? currentLife : 10,
        maxLife: typeof maxLife !== 'undefined' ? maxLife : 10,
        currentCase: typeof currentCase !== 'undefined' ? currentCase : "FlyHigh",
        currentLanguage: typeof currentLanguage !== 'undefined' ? currentLanguage : "EN",
        currentSceneRequestPath: typeof currentSceneRequestPath !== 'undefined' ? currentSceneRequestPath : "",
        currentSectionName: typeof currentSectionName !== 'undefined' ? currentSectionName : "",
        isScenePlaying: typeof isScenePlaying !== 'undefined' ? isScenePlaying : true,
        currentLineIndex: typeof currentLineIndex !== 'undefined' ? currentLineIndex : 0,
        dialogueHistory: typeof dialogueHistory !== 'undefined' ? dialogueHistory : [],
        currentBackgroundKey: typeof currentBackgroundKey !== 'undefined' ? currentBackgroundKey : "",
        currentForegroundKey: typeof currentForegroundKey !== 'undefined' ? currentForegroundKey : "",
        currentCharacterName: typeof currentCharacterName !== 'undefined' ? currentCharacterName : "",
        currentAnimationKey: typeof currentAnimationKey !== 'undefined' ? currentAnimationKey : "",
        characterIsVisible: typeof characterIsVisible !== 'undefined' ? characterIsVisible : true,
        currentBGMKey: typeof currentBGMKey !== 'undefined' ? currentBGMKey : null,
        lastCheckpointSection: typeof lastCheckpointSection !== 'undefined' ? lastCheckpointSection : "",
        isCourtRecordOpen: typeof isCourtRecordOpen !== 'undefined' ? isCourtRecordOpen : false,
        timestamp: new Date().toISOString()
    };

    localStorage.setItem(`ace_attorney_save_${slot}`, JSON.stringify(saveData));
    
    const message = (typeof window.t === 'function') 
        ? window.t('ui.saveSuccess', 'Game Saved!') 
        : 'Game Saved!';
    alert(message);
};

window.loadGame = async function(slot = 1) {
    const saveString = localStorage.getItem(`ace_attorney_save_${slot}`);
    if (!saveString) {
        const message = (typeof window.t === 'function') 
            ? window.t('ui.noSaveData', 'No save data found in slot.') 
            : 'No save data found.';
        alert(message);
        return;
    }

    try {
        const saveData = JSON.parse(saveString);
        
        if (!saveData.currentSceneRequestPath || saveData.currentSceneRequestPath === "") {
            console.warn("Save file missing valid scene path.");
            alert("This save file appears to be empty or corrupted.");
            return;
        }

        // 1. Close menus if open
        if (typeof hideConfigMenu === 'function' && typeof configMenu !== 'undefined' && !configMenu.classList.contains('hidden')) {
            hideConfigMenu();
        }
        if (typeof toggleCourtRecord === 'function' && typeof isCourtRecordOpen !== 'undefined' && isCourtRecordOpen) {
            toggleCourtRecord(); // Close it
        }

        // Fix visibility of game screens when loading from Title Screen
        if (typeof window.hideTitleScreen === 'function') window.hideTitleScreen();
        if (typeof window.hideCaseSelect === 'function') window.hideCaseSelect();

        // 2. Clear auto-play + timers
        if (typeof clearAutoPlayTimer === 'function') clearAutoPlayTimer();
        if (typeof fastForwardInterval !== 'undefined' && fastForwardInterval) clearInterval(fastForwardInterval);
        if (typeof fastForwardTimeout !== 'undefined' && fastForwardTimeout) clearTimeout(fastForwardTimeout);
        if (typeof isFastForwarding !== 'undefined') isFastForwarding = false;
        
        // 3. Clear Active Screens BEFORE restoring globals so our vars aren't overridden
        if (typeof clearTopScreen === 'function') clearTopScreen();

        // 4. Check if scene changed
        const sceneChanged = currentSceneRequestPath !== saveData.currentSceneRequestPath;
        const langChanged = currentLanguage !== saveData.currentLanguage;

        // Restore language config visually if it changed
        if (langChanged) {
            currentLanguage = saveData.currentLanguage;
            if (typeof configLanguageSelect !== 'undefined' && configLanguageSelect) configLanguageSelect.value = saveData.currentLanguage;
            if (typeof applyTranslationToUI === 'function') applyTranslationToUI();
        }

        if (sceneChanged || langChanged || !gameScript || Object.keys(gameScript).length === 0) {
            currentSceneRequestPath = saveData.currentSceneRequestPath;
            // Pass isLoadingSave = true
            await window.loadGameData(saveData.currentSceneRequestPath, null, true);
        }

        // 5. Restore Globals (Direct assignment, not window.*)
        for (const key in gameState) delete gameState[key];
        Object.assign(gameState, saveData.gameState);
        
        evidenceInventory = saveData.evidenceInventory;
        profilesInventory = saveData.profilesInventory;
        unlockedTopics = saveData.unlockedTopics;
        actionStates = saveData.actionStates;
        currentLife = saveData.currentLife;
        maxLife = saveData.maxLife;
        currentCase = saveData.currentCase;
        currentSectionName = saveData.currentSectionName;
        currentLineIndex = saveData.currentLineIndex;
        dialogueHistory = saveData.dialogueHistory;
        currentBackgroundKey = saveData.currentBackgroundKey;
        currentForegroundKey = saveData.currentForegroundKey;
        currentCharacterName = saveData.currentCharacterName;
        currentAnimationKey = saveData.currentAnimationKey;
        characterIsVisible = saveData.characterIsVisible;
        currentBGMKey = saveData.currentBGMKey;
        lastCheckpointSection = saveData.lastCheckpointSection;

        // 6. Restore Visuals & Audio mappings
        if (currentBackgroundKey) {
            changeBackground(currentBackgroundKey);
        }
        if (currentForegroundKey) {
            changeForeground(currentForegroundKey);
        }
        
        const charEl = document.getElementById('character');
        if (currentCharacterName && currentAnimationKey) {
            changeSprite(currentCharacterName, currentAnimationKey);
            if (charEl) {
                charEl.classList.remove('fade-out');
                charEl.style.transition = 'none';
                charEl.style.opacity = characterIsVisible ? '1' : '0';
                void charEl.offsetWidth;
                charEl.style.transition = '';
            }
        } else {
             if (charEl) charEl.style.opacity = '0';
        }

        if (currentBGMKey) {
            // Replay properly instead of skipping fade
            playBGM(currentBGMKey, false);
        } else {
            if (typeof stopBGM === 'function') stopBGM(false); // Stop if there shouldn't be
        }

        if (typeof updateHealthUI === 'function') updateHealthUI(0, false);
        if (typeof updateActionButtons === 'function') updateActionButtons();
        
        // 7. Resume execution at the requested line
        if (typeof isWaitingForAutoSkip !== 'undefined') isWaitingForAutoSkip = false;
        
        isScenePlaying = saveData.isScenePlaying !== undefined ? saveData.isScenePlaying : true;

const savedSection = gameScript[currentSectionName];

        if (!isScenePlaying) {
            // Not mid-dialogue: re-run the scene's initialSection so the
            // background, character, and BGM are set up, then it will land
            // on the investigation menu via {sectionEnd}.
            if (typeof jumpToSection === 'function' && initialSectionName && gameScript[initialSectionName]) {
                jumpToSection(initialSectionName);
            } else if (typeof updateSceneState === 'function') {
                updateSceneState();
            }
        } else if (savedSection && savedSection[currentLineIndex]) {
            if (typeof updateSceneState === 'function') updateSceneState();
            updateDialogue(savedSection[currentLineIndex]);
        } else {
            console.error("Save state line not found in loaded script.");
            alert("Warning: Could not resolve saved script line.");
        }

    } catch (e) {
        console.error("Failed to load save:", e);
        alert("Failed to load save data. It might be corrupted or outdated.");
    }
};
