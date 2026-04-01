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

    const saveData = typeof window.buildSaveDataSnapshot === 'function'
        ? window.buildSaveDataSnapshot()
        : {
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

        const missingCoreFns = [];
        if (typeof window.loadGameData !== 'function') missingCoreFns.push('loadGameData');
        if (typeof window.updateDialogue !== 'function') missingCoreFns.push('updateDialogue');

        if (missingCoreFns.length > 0) {
            console.error('Cannot load save: missing required functions:', missingCoreFns);
            alert('Cannot load save right now. Missing runtime hooks: ' + missingCoreFns.join(', '));
            return;
        }
        
        if (!saveData.currentSceneRequestPath || saveData.currentSceneRequestPath === "") {
            console.warn("Save file missing valid scene path.");
            alert("This save file appears to be empty or corrupted.");
            return;
        }

        // 1. Close menus if open.
        if (typeof window.closeOpenMenusForLoad === 'function') {
            window.closeOpenMenusForLoad();
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
        const langChanged = (typeof window.restoreLanguageForLoad === 'function')
            ? window.restoreLanguageForLoad(saveData)
            : (currentLanguage !== saveData.currentLanguage);

        if (sceneChanged || langChanged || !gameScript || Object.keys(gameScript).length === 0) {
            currentSceneRequestPath = saveData.currentSceneRequestPath;
            // Pass isLoadingSave = true
            await window.loadGameData(saveData.currentSceneRequestPath, null, true);
        }

        // 5. Restore globals + visuals
        if (typeof window.restoreCoreStateForLoad === 'function') {
            window.restoreCoreStateForLoad(saveData);
        }

        if (typeof window.restoreVisualStateForLoad === 'function') {
            window.restoreVisualStateForLoad();
        }
        
        // 6. Resume execution at the requested line
        const resumed = (typeof window.resumeDialogueForLoad === 'function')
            ? window.resumeDialogueForLoad(saveData)
            : false;

        if (!resumed) {
            console.error("Save state line not found in loaded script.");
            alert("Warning: Could not resolve saved script line.");
        }

    } catch (e) {
        console.error("Failed to load save:", e);
        alert("Failed to load save data. It might be corrupted or outdated.");
    }
};
