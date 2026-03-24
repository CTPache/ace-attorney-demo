// js/save-load/helpers.js
// Shared helper functions for save/load orchestration.
console.log("Save/Load Helpers loaded");

window.buildSaveDataSnapshot = function() {
    return {
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
        currentBlipType: typeof currentBlipType !== 'undefined' ? currentBlipType : 1,
        lastCheckpointSection: typeof lastCheckpointSection !== 'undefined' ? lastCheckpointSection : "",
        isCourtRecordOpen: typeof isCourtRecordOpen !== 'undefined' ? isCourtRecordOpen : false,
        timestamp: new Date().toISOString()
    };
};

window.closeOpenMenusForLoad = function() {
    if (typeof window.closeInnermostMenu === 'function') {
        let guard = 0;
        while (window.closeInnermostMenu() && guard < 10) {
            guard += 1;
        }
        return;
    }

    if (typeof closeConfigMenu === 'function' && typeof configMenu !== 'undefined' && configMenu && !configMenu.classList.contains('hidden')) {
        closeConfigMenu();
    }

    if (typeof evidenceContainer !== 'undefined' && evidenceContainer && !evidenceContainer.classList.contains('hidden')) {
        if (typeof btnEvidenceBack !== 'undefined' && btnEvidenceBack) {
            btnEvidenceBack.click();
        } else if (typeof courtRecordBtn !== 'undefined' && courtRecordBtn) {
            courtRecordBtn.click();
        }
    }
};

window.restoreLanguageForLoad = function(saveData) {
    const langChanged = currentLanguage !== saveData.currentLanguage;

    if (langChanged) {
        currentLanguage = saveData.currentLanguage;
        if (typeof configLanguageSelect !== 'undefined' && configLanguageSelect) {
            configLanguageSelect.value = saveData.currentLanguage;
        }
        if (typeof applyTranslationToUI === 'function') {
            applyTranslationToUI();
        }
    }

    return langChanged;
};

window.restoreCoreStateForLoad = function(saveData) {
    for (const key in gameState) delete gameState[key];
    Object.assign(gameState, saveData.gameState || {});

    evidenceInventory = saveData.evidenceInventory || [];
    profilesInventory = saveData.profilesInventory || [];
    unlockedTopics = saveData.unlockedTopics || [];
    actionStates = saveData.actionStates || { examine: true, move: true, talk: true, present: true };
    currentLife = saveData.currentLife;
    maxLife = saveData.maxLife;
    currentCase = saveData.currentCase;
    currentSectionName = saveData.currentSectionName;
    currentLineIndex = saveData.currentLineIndex;
    dialogueHistory = saveData.dialogueHistory || [];
    currentBackgroundKey = saveData.currentBackgroundKey;
    currentForegroundKey = saveData.currentForegroundKey;
    currentCharacterName = saveData.currentCharacterName;
    currentAnimationKey = saveData.currentAnimationKey;
    characterIsVisible = saveData.characterIsVisible;
    currentBGMKey = saveData.currentBGMKey;
    currentBlipType = saveData.currentBlipType !== undefined ? saveData.currentBlipType : 1;
    lastCheckpointSection = saveData.lastCheckpointSection;
};

window.restoreVisualStateForLoad = function() {
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
    } else if (charEl) {
        charEl.style.opacity = '0';
    }

    if (currentBGMKey) {
        playBGM(currentBGMKey, false);
    } else if (typeof stopBGM === 'function') {
        stopBGM(false);
    }

    if (typeof updateHealthUI === 'function') updateHealthUI(0, false);
    if (typeof updateActionButtons === 'function') updateActionButtons();
};

window.resumeDialogueForLoad = function(saveData) {
    if (typeof isWaitingForAutoSkip !== 'undefined') isWaitingForAutoSkip = false;
    isScenePlaying = saveData.isScenePlaying !== undefined ? saveData.isScenePlaying : true;

    const savedSection = gameScript[currentSectionName];

    if (!isScenePlaying) {
        if (typeof jumpToSection === 'function' && initialSectionName && gameScript[initialSectionName]) {
            jumpToSection(initialSectionName);
        } else if (typeof updateSceneState === 'function') {
            updateSceneState();
        }
        return true;
    }

    if (savedSection && savedSection[currentLineIndex]) {
        if (typeof updateSceneState === 'function') updateSceneState();
        updateDialogue(savedSection[currentLineIndex]);
        return true;
    }

    return false;
};
