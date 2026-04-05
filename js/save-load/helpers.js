// js/save-load/helpers.js
// Shared helper functions for save/load orchestration.
console.log("Save/Load Helpers loaded");

function cloneForSave(value, fallback) {
    try {
        return JSON.parse(JSON.stringify(value ?? fallback));
    } catch (error) {
        console.warn('Could not serialize save data value:', error);
        return fallback;
    }
}

function getDefaultActionStates() {
    return { examine: true, move: true, talk: true, present: true };
}

function getDialogueDisplaySnapshot() {
    const savedHtml = (typeof textContent !== 'undefined' && textContent)
        ? textContent.innerHTML
        : '';
    const savedTextAlign = (typeof textContent !== 'undefined' && textContent)
        ? (textContent.style.textAlign || getComputedStyle(textContent).textAlign || 'left')
        : 'left';
    const savedTextboxOpacity = (typeof textboxContainer !== 'undefined' && textboxContainer)
        ? parseFloat(getComputedStyle(textboxContainer).opacity || '1')
        : 1;
    const nameTextElement = (typeof nameTag !== 'undefined' && nameTag)
        ? nameTag.querySelector('.name-tag-text')
        : null;
    const savedSpeakerName = nameTextElement
        ? nameTextElement.textContent || ''
        : ((typeof nameTag !== 'undefined' && nameTag) ? (nameTag.textContent || '') : '');
    const hasNameTag = !!(
        typeof nameTag !== 'undefined'
        && nameTag
        && nameTag.style.display !== 'none'
        && String(savedSpeakerName || '').trim()
    );
    const lineCompleted = !(
        (typeof isTyping !== 'undefined' && isTyping)
        || (typeof isWaitingForAnimation !== 'undefined' && isWaitingForAnimation)
        || (typeof isWaitingForAutoSkip !== 'undefined' && isWaitingForAutoSkip)
    );

    return {
        html: savedHtml,
        speakerName: savedSpeakerName,
        hasNameTag,
        textAlign: savedTextAlign,
        textboxOpacity: Number.isFinite(savedTextboxOpacity) ? savedTextboxOpacity : 1,
        lineCompleted
    };
}

window.prepareStableSaveState = function() {
    if (typeof clearAutoPlayTimer === 'function') {
        clearAutoPlayTimer();
    }

    if (typeof isTyping !== 'undefined' && isTyping && typeof finishTyping === 'function') {
        finishTyping();
    }

    return {
        dialogueDisplay: getDialogueDisplaySnapshot()
    };
};

window.setLoadTransitionMaskVisible = function(isVisible) {
    const targets = [
        typeof gameContainer !== 'undefined' ? gameContainer : null,
        document.getElementById('bottom-screen')
    ];

    targets.forEach((element) => {
        if (!element) return;
        element.classList.toggle('load-transition-blackout', !!isVisible);
    });
};

window.restoreDialogueDisplayForLoad = function(dialogueDisplay = {}) {
    if (typeof typingInterval !== 'undefined' && typingInterval) {
        clearTimeout(typingInterval);
        typingInterval = null;
    }

    if (typeof isTyping !== 'undefined') isTyping = false;
    if (typeof isWaitingForAutoSkip !== 'undefined') isWaitingForAutoSkip = false;

    if (typeof textboxContainer !== 'undefined' && textboxContainer) {
        const opacity = Number.isFinite(dialogueDisplay.textboxOpacity)
            ? dialogueDisplay.textboxOpacity
            : 1;
        textboxContainer.style.opacity = String(opacity);
        textboxContainer.classList.toggle('no-name', !dialogueDisplay.hasNameTag);
    }

    if (typeof nameTag !== 'undefined' && nameTag) {
        const speakerName = String(dialogueDisplay.speakerName || '');
        const hasName = !!dialogueDisplay.hasNameTag && !!speakerName.trim();

        if (hasName) {
            setNameTagText(speakerName);
            nameTag.style.display = '';
            nameTag.style.opacity = '1';
            if (typeof fitNameTagText === 'function') {
                fitNameTagText();
                requestAnimationFrame(fitNameTagText);
            }
        } else {
            nameTag.style.display = 'none';
            nameTag.style.opacity = '';
            nameTag.style.setProperty('--name-tag-text-scale-x', '1');
        }
    }

    if (typeof textContent !== 'undefined' && textContent) {
        textContent.style.textAlign = dialogueDisplay.textAlign || 'left';
        textContent.innerHTML = typeof dialogueDisplay.html === 'string'
            ? dialogueDisplay.html
            : '';
    }
};

window.buildSaveDataSnapshot = function() {
    const stabilizedUiState = (typeof window.prepareStableSaveState === 'function')
        ? window.prepareStableSaveState()
        : { dialogueDisplay: getDialogueDisplaySnapshot() };
    const dialogueDisplaySnapshot = cloneForSave(stabilizedUiState.dialogueDisplay, {
        html: '',
        speakerName: '',
        hasNameTag: false,
        textAlign: 'left',
        textboxOpacity: 1,
        lineCompleted: false
    });
    const courtRecordSnapshot = (typeof window.getCourtRecordSnapshot === 'function')
        ? window.getCourtRecordSnapshot()
        : {
            isOpen: typeof isCourtRecordOpen !== 'undefined' ? !!isCourtRecordOpen : false,
            tab: 'evidence',
            isPresentingMode: typeof isPresentingMode !== 'undefined' ? !!isPresentingMode : false
        };

    const liveLifeBar = document.getElementById('life-bar-container');
    const isLifeBarVisible = !!(liveLifeBar && !liveLifeBar.classList.contains('hidden'));

    return {
        schemaVersion: 2,
        gameState: cloneForSave(gameState || {}, {}),
        evidenceInventory: cloneForSave(evidenceInventory || [], []),
        profilesInventory: cloneForSave(profilesInventory || [], []),
        unlockedTopics: cloneForSave(unlockedTopics || [], []),
        actionStates: cloneForSave(actionStates || getDefaultActionStates(), getDefaultActionStates()),
        currentLife: typeof currentLife !== 'undefined' ? currentLife : 10,
        maxLife: typeof maxLife !== 'undefined' ? maxLife : 10,
        currentCase: typeof currentCase !== 'undefined' ? currentCase : "FlyHigh",
        currentLanguage: typeof currentLanguage !== 'undefined' ? currentLanguage : "EN",
        currentSceneRequestPath: typeof currentSceneRequestPath !== 'undefined' ? currentSceneRequestPath : "",
        currentSectionName: typeof currentSectionName !== 'undefined' ? currentSectionName : "",
        isScenePlaying: typeof isScenePlaying !== 'undefined' ? isScenePlaying : true,
        currentLineIndex: typeof currentLineIndex !== 'undefined' ? currentLineIndex : 0,
        dialogueHistory: cloneForSave(dialogueHistory || [], []),
        currentBackgroundKey: typeof currentBackgroundKey !== 'undefined' ? currentBackgroundKey : "",
        currentForegroundKey: typeof currentForegroundKey !== 'undefined' ? currentForegroundKey : "",
        currentCharacterName: typeof currentCharacterName !== 'undefined' ? currentCharacterName : "",
        currentAnimationKey: typeof currentAnimationKey !== 'undefined' ? currentAnimationKey : "",
        characterIsVisible: typeof characterIsVisible !== 'undefined' ? !!characterIsVisible : true,
        currentBGMKey: typeof currentBGMKey !== 'undefined' ? currentBGMKey : null,
        currentBlipType: typeof currentBlipType !== 'undefined' ? currentBlipType : 1,
        lastCheckpointSection: typeof lastCheckpointSection !== 'undefined' ? lastCheckpointSection : "",
        isCourtRecordOpen: typeof isCourtRecordOpen !== 'undefined' ? !!isCourtRecordOpen : false,
        definitions: {
            evidenceDB: cloneForSave(typeof evidenceDB !== 'undefined' ? evidenceDB : {}, {}),
            profilesDB: cloneForSave(typeof profilesDB !== 'undefined' ? profilesDB : {}, {})
        },
        courtroom: cloneForSave(
            (typeof window.getCourtroomSnapshot === 'function')
                ? window.getCourtroomSnapshot()
                : { isActive: typeof isCourtMode !== 'undefined' ? !!isCourtMode : false },
            { isActive: false }
        ),
        crossExamination: cloneForSave(
            (window.CrossExamination && typeof window.CrossExamination.buildSnapshot === 'function')
                ? window.CrossExamination.buildSnapshot()
                : { isActive: !!(window.CrossExamination && window.CrossExamination.isCEMode) },
            { isActive: false }
        ),
        media: cloneForSave(
            (typeof window.getMediaSnapshot === 'function')
                ? window.getMediaSnapshot()
                : {},
            {}
        ),
        uiState: {
            courtRecord: cloneForSave(courtRecordSnapshot, { isOpen: false, tab: 'evidence', isPresentingMode: false }),
            dialogueDisplay: cloneForSave(dialogueDisplaySnapshot, {
                html: '',
                speakerName: '',
                hasNameTag: false,
                textAlign: 'left',
                textboxOpacity: 1,
                lineCompleted: false
            }),
            isExamining: typeof isExamining !== 'undefined' ? !!isExamining : false,
            isTextSkipEnabled: typeof isTextSkipEnabled !== 'undefined' ? !!isTextSkipEnabled : true,
            gameOverLabel: typeof gameOverLabel !== 'undefined' ? gameOverLabel : 'GameOver',
            isGameOverPending: !!window.isGameOverPending,
            isLifeBarVisible: isLifeBarVisible
        },
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

window.inferLegacyCourtroomSnapshotForLoad = function(saveData = {}) {
    const hasCourtroomData = courtroomDB && typeof courtroomDB === 'object' && Object.keys(courtroomDB).length > 0;
    if (!hasCourtroomData) {
        return null;
    }

    const courtSlots = ['defense', 'witness', 'prosecution', 'judge', 'cocounsel', 'gallery'];
    const standSlots = ['defense', 'witness', 'prosecution'];
    const normalizeSlot = (value) => String(value || '').trim().toLowerCase();
    const sectionName = saveData.currentSectionName || currentSectionName || '';
    const section = Array.isArray(gameScript[sectionName]) ? gameScript[sectionName] : [];
    const maxIndex = Math.min(
        typeof saveData.currentLineIndex === 'number' ? Math.max(0, Math.trunc(saveData.currentLineIndex)) : 0,
        Math.max(0, section.length - 1)
    );

    const slotState = {};
    const definedSlots = (courtroomDB && courtroomDB.slots && typeof courtroomDB.slots === 'object')
        ? courtroomDB.slots
        : {};

    courtSlots.forEach((slot) => {
        slotState[slot] = {
            character: (definedSlots[slot] && definedSlots[slot].character) || null,
            emotion: null
        };
    });

    let inferredView = null;
    let inferredActiveSlot = null;
    let sawCourtCommand = false;

    for (let i = 0; i <= maxIndex; i += 1) {
        const line = section[i];
        const rawText = (line && typeof line.text === 'string') ? line.text : '';
        if (!rawText) continue;

        rawText.replace(/\{courtView:([a-zA-Z0-9_]+)\}/g, (_, viewName) => {
            const normalizedView = normalizeSlot(viewName);
            if (normalizedView) {
                inferredView = normalizedView;
                inferredActiveSlot = normalizedView;
                sawCourtCommand = true;
            }
            return _;
        });

        rawText.replace(/\{courtPan:([a-zA-Z0-9_]+)(?:,[^}]*)?\}/g, (_, slotName) => {
            const normalizedSlot = normalizeSlot(slotName);
            if (normalizedSlot) {
                inferredView = normalizedSlot;
                inferredActiveSlot = normalizedSlot;
                sawCourtCommand = true;
            }
            return _;
        });

        rawText.replace(/\{courtChar:([a-zA-Z0-9_]+),([a-zA-Z0-9_]+)\}/g, (_, slotName, characterName) => {
            const normalizedSlot = normalizeSlot(slotName);
            if (slotState[normalizedSlot]) {
                slotState[normalizedSlot].character = characterName || null;
                sawCourtCommand = true;
            }
            return _;
        });

        rawText.replace(/\{courtSprite:([a-zA-Z0-9_]+)\["([^"]+)"\]\}/g, (_, slotName, emotion) => {
            const normalizedSlot = normalizeSlot(slotName);
            if (slotState[normalizedSlot]) {
                slotState[normalizedSlot].emotion = emotion || null;
                inferredActiveSlot = normalizedSlot || inferredActiveSlot;
                sawCourtCommand = true;
            }
            return _;
        });

        rawText.replace(/\{changeCharacter:([a-zA-Z0-9_]+)\["([^"]+)"\](?:,([a-zA-Z0-9_]+))?\}/g, (_, characterName, emotion, viewName) => {
            const targetSlot = normalizeSlot(viewName) || normalizeSlot(inferredView) || normalizeSlot(inferredActiveSlot);
            if (slotState[targetSlot]) {
                slotState[targetSlot].character = characterName || slotState[targetSlot].character;
                slotState[targetSlot].emotion = emotion || slotState[targetSlot].emotion;
                inferredActiveSlot = targetSlot;
                sawCourtCommand = true;
            }
            return _;
        });
    }

    if (!inferredView) {
        const backgroundKey = String(saveData.currentBackgroundKey || currentBackgroundKey || '');
        const normalizedBackgroundKey = backgroundKey.toLowerCase();

        if (normalizedBackgroundKey === 'courtoverview') {
            inferredView = 'overview';
        } else if (normalizedBackgroundKey === 'courtjudge') {
            inferredView = 'judge';
        } else if (normalizedBackgroundKey === 'courtcocounsel') {
            inferredView = 'cocounsel';
        } else if (normalizedBackgroundKey === 'courtgallery') {
            inferredView = 'gallery';
        } else if (normalizedBackgroundKey === 'courtstands') {
            const currentCharName = saveData.currentCharacterName || currentCharacterName || '';
            const matchedStand = standSlots.find((slot) => slotState[slot] && slotState[slot].character === currentCharName);
            inferredView = matchedStand || inferredActiveSlot || 'witness';
        }
    }

    if (!inferredActiveSlot) {
        inferredActiveSlot = inferredView;
    }

    if (slotState[inferredActiveSlot]) {
        if (!slotState[inferredActiveSlot].character && (saveData.currentCharacterName || currentCharacterName)) {
            slotState[inferredActiveSlot].character = saveData.currentCharacterName || currentCharacterName;
        }
        if (!slotState[inferredActiveSlot].emotion && (saveData.currentAnimationKey || currentAnimationKey)) {
            slotState[inferredActiveSlot].emotion = saveData.currentAnimationKey || currentAnimationKey;
        }
    }

    const looksLikeCourtroomSave = sawCourtCommand
        || !!inferredView
        || /^court/i.test(String(saveData.currentBackgroundKey || currentBackgroundKey || ''));

    if (!looksLikeCourtroomSave) {
        return null;
    }

    return {
        isActive: true,
        currentView: inferredView || 'overview',
        activeSlot: inferredActiveSlot || inferredView || null,
        slotState
    };
};

window.restoreCoreStateForLoad = function(saveData = {}) {
    const savedDefinitions = (saveData.definitions && typeof saveData.definitions === 'object')
        ? saveData.definitions
        : {};
    const savedUiState = (saveData.uiState && typeof saveData.uiState === 'object')
        ? saveData.uiState
        : {};
    const savedCourtRecord = (savedUiState.courtRecord && typeof savedUiState.courtRecord === 'object')
        ? savedUiState.courtRecord
        : {};

    for (const key in gameState) delete gameState[key];
    Object.assign(gameState, (saveData.gameState && typeof saveData.gameState === 'object') ? saveData.gameState : {});

    evidenceDB = {
        ...evidenceDB,
        ...((savedDefinitions.evidenceDB && typeof savedDefinitions.evidenceDB === 'object') ? savedDefinitions.evidenceDB : {})
    };
    profilesDB = {
        ...profilesDB,
        ...((savedDefinitions.profilesDB && typeof savedDefinitions.profilesDB === 'object') ? savedDefinitions.profilesDB : {})
    };

    evidenceInventory = Array.isArray(saveData.evidenceInventory) ? [...saveData.evidenceInventory] : [];
    profilesInventory = Array.isArray(saveData.profilesInventory) ? [...saveData.profilesInventory] : [];
    unlockedTopics = Array.isArray(saveData.unlockedTopics) ? [...saveData.unlockedTopics] : [];
    actionStates = (saveData.actionStates && typeof saveData.actionStates === 'object')
        ? saveData.actionStates
        : getDefaultActionStates();
    currentLife = (typeof saveData.currentLife === 'number') ? saveData.currentLife : 10;
    maxLife = (typeof saveData.maxLife === 'number') ? saveData.maxLife : 10;
    currentCase = saveData.currentCase || currentCase || 'FlyHigh';
    currentSectionName = saveData.currentSectionName || currentSectionName || '';
    currentLineIndex = (typeof saveData.currentLineIndex === 'number')
        ? Math.max(0, Math.trunc(saveData.currentLineIndex))
        : 0;
    dialogueHistory = Array.isArray(saveData.dialogueHistory) ? [...saveData.dialogueHistory] : [];
    currentBackgroundKey = saveData.currentBackgroundKey || '';
    currentForegroundKey = saveData.currentForegroundKey || '';
    currentCharacterName = saveData.currentCharacterName || '';
    currentAnimationKey = saveData.currentAnimationKey || '';
    characterIsVisible = saveData.characterIsVisible !== undefined ? !!saveData.characterIsVisible : true;
    currentBGMKey = saveData.currentBGMKey || null;
    currentBlipType = saveData.currentBlipType !== undefined ? saveData.currentBlipType : 1;
    lastCheckpointSection = saveData.lastCheckpointSection || '';

    isCourtRecordOpen = savedCourtRecord.isOpen !== undefined
        ? !!savedCourtRecord.isOpen
        : !!saveData.isCourtRecordOpen;
    isPresentingMode = savedCourtRecord.isPresentingMode !== undefined
        ? !!savedCourtRecord.isPresentingMode
        : false;
    isExamining = savedUiState.isExamining !== undefined ? !!savedUiState.isExamining : false;
    isInputBlocked = false;
    if (savedUiState.isTextSkipEnabled !== undefined) {
        isTextSkipEnabled = !!savedUiState.isTextSkipEnabled;
    }
    if (typeof savedUiState.gameOverLabel === 'string' && savedUiState.gameOverLabel.trim()) {
        gameOverLabel = savedUiState.gameOverLabel;
    }
    window.isGameOverPending = !!savedUiState.isGameOverPending;
};

window.restoreVisualStateForLoad = function(saveData = {}) {
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

    if (typeof window.restoreCourtroomSnapshot === 'function') {
        const courtroomSnapshot = (saveData.courtroom && saveData.courtroom.isActive)
            ? saveData.courtroom
            : ((typeof window.inferLegacyCourtroomSnapshotForLoad === 'function')
                ? window.inferLegacyCourtroomSnapshotForLoad(saveData)
                : null);

        if (courtroomSnapshot && courtroomSnapshot.isActive) {
            window.restoreCourtroomSnapshot(courtroomSnapshot);
        }
    }

    if (currentBGMKey) {
        playBGM(currentBGMKey, false);
    } else if (typeof stopBGM === 'function') {
        stopBGM(false);
    }

    if (saveData.media && typeof window.restoreMediaSnapshot === 'function') {
        window.restoreMediaSnapshot(saveData.media);
    }

    if (typeof window.updateLifeBar === 'function') {
        window.updateLifeBar(0);
    }
    if (saveData.uiState && saveData.uiState.isLifeBarVisible) {
        if (typeof window.showLifeBar === 'function') {
            window.showLifeBar(0);
        }
    } else if (typeof window.hideLifeBar === 'function') {
        window.hideLifeBar();
    }

    if (typeof updateActionButtons === 'function') updateActionButtons();
};

window.resumeDialogueForLoad = function(saveData = {}) {
    const savedUiState = (saveData.uiState && typeof saveData.uiState === 'object')
        ? saveData.uiState
        : {};
    const savedCourtRecord = (savedUiState.courtRecord && typeof savedUiState.courtRecord === 'object')
        ? savedUiState.courtRecord
        : null;
    const savedDialogueDisplay = (savedUiState.dialogueDisplay && typeof savedUiState.dialogueDisplay === 'object')
        ? savedUiState.dialogueDisplay
        : null;
    const shouldRestoreDialogueDisplay = !!(
        savedDialogueDisplay
        && savedDialogueDisplay.lineCompleted
        && typeof window.restoreDialogueDisplayForLoad === 'function'
    );

    if (typeof isWaitingForAutoSkip !== 'undefined') isWaitingForAutoSkip = false;
    isScenePlaying = saveData.isScenePlaying !== undefined ? !!saveData.isScenePlaying : true;

    let ceRestored = false;
    if (saveData.crossExamination
        && saveData.crossExamination.isActive
        && window.CrossExamination
        && typeof window.CrossExamination.restoreSnapshot === 'function') {
        ceRestored = window.CrossExamination.restoreSnapshot(saveData.crossExamination, {
            replayCurrentStatement: !shouldRestoreDialogueDisplay
        });

        if (ceRestored && saveData.crossExamination.isLoopActive !== false) {
            if (shouldRestoreDialogueDisplay) {
                window.restoreDialogueDisplayForLoad(savedDialogueDisplay);
            }
            if (savedCourtRecord && typeof window.restoreCourtRecordSnapshot === 'function') {
                window.restoreCourtRecordSnapshot(savedCourtRecord);
            }
            return true;
        }
    }

    const savedSection = gameScript[currentSectionName];

    if (!isScenePlaying) {
        if (typeof jumpToSection === 'function' && initialSectionName && gameScript[initialSectionName]) {
            jumpToSection(initialSectionName);
        } else if (typeof updateSceneState === 'function') {
            updateSceneState();
        }

        if (savedCourtRecord && typeof window.restoreCourtRecordSnapshot === 'function') {
            window.restoreCourtRecordSnapshot(savedCourtRecord);
        }
        return true;
    }

    if (savedSection && savedSection[currentLineIndex]) {
        if (typeof updateSceneState === 'function') updateSceneState();

        if (shouldRestoreDialogueDisplay) {
            window.restoreDialogueDisplayForLoad(savedDialogueDisplay);
        } else {
            updateDialogue(savedSection[currentLineIndex]);
        }

        if (savedCourtRecord && typeof window.restoreCourtRecordSnapshot === 'function') {
            window.restoreCourtRecordSnapshot(savedCourtRecord);
        }
        return true;
    }

    if (!ceRestored && typeof jumpToSection === 'function' && lastCheckpointSection && gameScript[lastCheckpointSection]) {
        jumpToSection(lastCheckpointSection);

        if (savedCourtRecord && typeof window.restoreCourtRecordSnapshot === 'function') {
            window.restoreCourtRecordSnapshot(savedCourtRecord);
        }
        return true;
    }

    return false;
};
