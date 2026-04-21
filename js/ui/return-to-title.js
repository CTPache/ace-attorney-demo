// js/ui/return-to-title.js
// Handles return-to-title confirmation and full gameplay teardown.
console.log("UI Return To Title Loaded");

function bindReturnToTitleEvents() {
    const configReturnTitleBtn = document.getElementById('config-return-title-btn');
    if (!configReturnTitleBtn || configReturnTitleBtn.dataset.boundReturnToTitle === 'true') {
        return;
    }

    configReturnTitleBtn.dataset.boundReturnToTitle = 'true';
    configReturnTitleBtn.addEventListener('click', () => {
        const confirmMsg = typeof window.t === 'function'
            ? window.t('ui.returnToTitleConfirm', 'Return to title screen? All unsaved progress will be lost.')
            : 'Return to title screen? All unsaved progress will be lost.';
        
        showConfirm(confirmMsg, () => {
            closeConfigMenu();
            if (typeof window.returnToTitle === 'function') {
                window.returnToTitle();
            }
        });
    });
}

bindReturnToTitleEvents();
window.bindReturnToTitleEvents = bindReturnToTitleEvents;

window.returnToTitle = function(message) {
    if (message) showAlert(message);
    // 1. Stop all timers (auto-play, typing, fast-forward)
    if (typeof window.clearAutoPlayTimer === 'function') window.clearAutoPlayTimer();
    if (typeof typingInterval !== 'undefined' && typingInterval) { clearTimeout(typingInterval); typingInterval = null; }
    if (typeof fastForwardInterval !== 'undefined' && fastForwardInterval) { clearInterval(fastForwardInterval); fastForwardInterval = null; }
    if (typeof fastForwardTimeout !== 'undefined' && fastForwardTimeout) { clearTimeout(fastForwardTimeout); fastForwardTimeout = null; }

    // 2. Reset typing / renderer state
    isTyping = false;
    isWaitingForAutoSkip = false;
    isFastForwarding = false;
    if (typeof isWaitingForAnimation !== 'undefined') isWaitingForAnimation = false;
    if (typeof showTopicsOnEnd !== 'undefined') showTopicsOnEnd = false;
    segments = []; segmentIndex = 0; charIndex = 0; currentSpan = null;

    // 3. Stop all CSS/WebP animation sequences
    if (window.AnimationManager) window.AnimationManager.cleanup();

    // 4. Stop all audio (BGM, SFX, blips, video)
    if (typeof window.stopAllSceneAudio === 'function') window.stopAllSceneAudio();

    // 5. Clear top-screen visuals
    if (typeof clearTopScreen === 'function') clearTopScreen();
    if (typeof backgroundElement !== 'undefined' && backgroundElement) {
        backgroundElement.style.transition = 'none';
        backgroundElement.style.opacity = '1';
    }
    if (typeof foregroundElement !== 'undefined' && foregroundElement) {
        foregroundElement.style.transition = 'none';
        foregroundElement.style.opacity = '1';
    }

    // 6. Hide all gameplay menus and reset UI flags
    if (typeof hideActionMenus === 'function') hideActionMenus();
    if (typeof window.hideLifeBar === 'function') window.hideLifeBar();
    const evidencePopupEl = document.getElementById('evidence-popup');
    if (evidencePopupEl) evidencePopupEl.classList.add('hidden');
    if (typeof textboxContainer !== 'undefined' && textboxContainer) textboxContainer.style.opacity = '1';

    isInputBlocked = false;
    isCourtRecordOpen = false;
    isPresentingMode = false;
    isExamining = false;
    isAutoPlayEnabled = false;
    isScenePlaying = false;
    window.isGameOverPending = false;

    // Remove game-over overlay if it was displayed
    const endOverlay = document.getElementById('end-game-overlay');
    if (endOverlay) endOverlay.remove();

    // 7. Flush all scene / gameplay data
    characters = {}; backgrounds = {}; foregrounds = {};
    evidenceDB = {}; evidenceInventory = [];
    profilesDB = {}; profilesInventory = [];
    topicsDB = {}; unlockedTopics = [];
    investigations = {}; optionsDB = {};
    soundsDB = {}; musicDB = {}; videosDB = {};
    sceneMoveLocations = [];
    gameScript = {};
    for (const key in gameState) delete gameState[key];

    // Reset all progression/tracking variables
    initialSectionName = '';
    currentSectionName = '';
    lastCheckpointSection = '';
    currentLineIndex = 0;
    currentSceneRequestPath = '';
    currentSceneResolvedPath = '';
    currentBackgroundKey = '';
    currentForegroundKey = '';
    currentCharacterName = '';
    currentAnimationKey = '';
    characterIsVisible = true;
    currentBGM = null;
    currentBGMKey = null;
    currentBlipType = 1;
    currentTextSpeed = typeof defaultTextSpeed !== 'undefined' ? defaultTextSpeed : 30;
    gameOverLabel = 'GameOver';
    currentLife = 10;
    maxLife = 10;
    dialogueHistory = [];
    actionStates = { examine: true, move: true, talk: true, present: true };

    // 8. Show the title screen
    if (typeof window.initTitleScreen === 'function') window.initTitleScreen();
};
