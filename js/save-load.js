console.log("Save/Load module loaded");

window.saveGame = function(slot = 1) {
    const saveData = {
        gameState: window.gameState || {},
        evidenceInventory: window.evidenceInventory || [],
        profilesInventory: window.profilesInventory || [],
        unlockedTopics: window.unlockedTopics || [],
        actionStates: window.actionStates || { examine: true, move: true, talk: true, present: true },
        currentLife: window.currentLife || 10,
        maxLife: window.maxLife || 10,
        currentCase: window.currentCase || "FlyHigh",
        currentLanguage: window.currentLanguage || "EN",
        currentSceneRequestPath: window.currentSceneRequestPath || "",
        currentSectionName: window.currentSectionName || "",
        currentLineIndex: window.currentLineIndex || 0,
        dialogueHistory: window.dialogueHistory || [],
        currentBackgroundKey: window.currentBackgroundKey || "",
        currentForegroundKey: typeof window.currentForegroundKey !== 'undefined' ? window.currentForegroundKey : "",
        currentCharacterName: window.currentCharacterName || "",
        currentAnimationKey: window.currentAnimationKey || "",
        characterIsVisible: typeof window.characterIsVisible !== 'undefined' ? window.characterIsVisible : true,
        currentBGMKey: typeof window.currentBGMKey !== 'undefined' ? window.currentBGMKey : null,
        lastCheckpointSection: window.lastCheckpointSection || "",
        isCourtRecordOpen: window.isCourtRecordOpen || false,
        timestamp: new Date().toISOString()
    };

    localStorage.setItem(`ace_attorney_save_${slot}`, JSON.stringify(saveData));
    
    // Maybe show a quick visual alert
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
        
        // 1. Close menus if open
        if (typeof hideConfigMenu === 'function' && !configMenu.classList.contains('hidden')) {
            hideConfigMenu();
        }
        if (typeof toggleCourtRecord === 'function' && isCourtRecordOpen) {
            toggleCourtRecord(); // Close it
        }

        // 2. Clear auto-play + timers
        if (typeof clearAutoPlayTimer === 'function') clearAutoPlayTimer();
        if (window.fastForwardInterval) clearInterval(window.fastForwardInterval);
        if (window.fastForwardTimeout) clearTimeout(window.fastForwardTimeout);
        isFastForwarding = false;
        
        // 3. Check if scene changed
        const sceneChanged = window.currentSceneRequestPath !== saveData.currentSceneRequestPath;
        const langChanged = window.currentLanguage !== saveData.currentLanguage;

        // Restore language config visually if it changed
        if (langChanged) {
            window.currentLanguage = saveData.currentLanguage;
            if (configLanguageSelect) configLanguageSelect.value = saveData.currentLanguage;
            if (typeof applyTranslationToUI === 'function') applyTranslationToUI();
        }

        if (sceneChanged || langChanged || !window.gameScript || Object.keys(window.gameScript).length === 0) {
            window.currentSceneRequestPath = saveData.currentSceneRequestPath;
            // Pass isLoadingSave = true
            await window.loadGameData(saveData.currentSceneRequestPath, null, true);
        }

        // 4. Restore Globals
        Object.assign(window.gameState, saveData.gameState);
        window.evidenceInventory = saveData.evidenceInventory;
        window.profilesInventory = saveData.profilesInventory;
        window.unlockedTopics = saveData.unlockedTopics;
        window.actionStates = saveData.actionStates;
        window.currentLife = saveData.currentLife;
        window.maxLife = saveData.maxLife;
        window.currentCase = saveData.currentCase;
        window.currentSectionName = saveData.currentSectionName;
        window.currentLineIndex = saveData.currentLineIndex;
        window.dialogueHistory = saveData.dialogueHistory;
        window.currentBackgroundKey = saveData.currentBackgroundKey;
        window.currentForegroundKey = saveData.currentForegroundKey;
        window.currentCharacterName = saveData.currentCharacterName;
        window.currentAnimationKey = saveData.currentAnimationKey;
        window.characterIsVisible = saveData.characterIsVisible;
        window.currentBGMKey = saveData.currentBGMKey;
        window.lastCheckpointSection = saveData.lastCheckpointSection;

        // 5. Restore Visuals & Audio
        if (typeof clearTopScreen === 'function') clearTopScreen();

        if (window.currentBackgroundKey) {
            changeBackground(window.currentBackgroundKey);
        }
        if (window.currentForegroundKey) {
            changeForeground(window.currentForegroundKey);
        }
        
        if (window.currentCharacterName && window.currentAnimationKey) {
            changeSprite(window.currentCharacterName, window.currentAnimationKey);
            if (window.characterIsVisible) {
                character.style.opacity = '1';
            } else {
                character.style.opacity = '0';
            }
        } else {
            character.style.opacity = '0'; // Hide fallback
        }

        if (window.currentBGMKey) {
            playBGM(window.currentBGMKey, false); // No fade in, restore immediately
        } else {
            if (typeof stopBGM === 'function') stopBGM(false); // Stop if there shouldn't be
        }

        if (typeof updateHealthUI === 'function') updateHealthUI(0, false);
        if (typeof window.updateActionButtons === 'function') window.updateActionButtons();
        
        // 6. Resume execution at the requested line
        isWaitingForAutoSkip = false;
        const initialSection = gameScript[currentSectionName];
        if (initialSection && initialSection[currentLineIndex]) {
            isScenePlaying = true;
            if (typeof updateSceneState === 'function') updateSceneState();
            updateDialogue(initialSection[currentLineIndex]);
        } else {
            console.error("Save state line not found in loaded script.");
        }

    } catch (e) {
        console.error("Failed to load save:", e);
        alert("Failed to load save data. It might be corrupted or outdated.");
    }
};
