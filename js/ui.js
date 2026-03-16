console.log("UI Loaded");

let returnToConfigAfterHistory = false;

function setBottomScreenButtonsDisabled(disabled) {
    const buttons = document.querySelectorAll('#bottom-screen button');
    buttons.forEach((button) => {
        if (disabled) {
            if (button.dataset.videoDisabled === 'true') return;
            button.dataset.videoDisabled = 'true';
            button.dataset.prevDisabled = button.disabled ? '1' : '0';
            button.disabled = true;
            return;
        }

        if (button.dataset.videoDisabled !== 'true') return;
        button.disabled = button.dataset.prevDisabled === '1';
        delete button.dataset.videoDisabled;
        delete button.dataset.prevDisabled;
    });

    if (!disabled) {
        refreshTopBarButtonDisabledState();
    }
}

window.setBottomScreenButtonsDisabled = setBottomScreenButtonsDisabled;

function updateAutoplayIndicator() {
    if (!autoplayIndicator) return;

    autoplayIndicator.classList.toggle('active', isAutoPlayEnabled);
    autoplayIndicator.setAttribute('aria-pressed', isAutoPlayEnabled ? 'true' : 'false');
    autoplayIndicator.title = isAutoPlayEnabled
        ? window.t('ui.autoplayOn', 'Auto Play On (A)')
        : window.t('ui.autoplayOff', 'Auto Play Off (A)');
}

function setAutoplayEnabled(nextEnabled) {
    isAutoPlayEnabled = !!nextEnabled;

    updateAutoplayIndicator();

    if (typeof window.clearAutoPlayTimer === 'function') {
        window.clearAutoPlayTimer();
    }

    if (isAutoPlayEnabled && !isTyping && isScenePlaying && !isInputBlocked) {
        if (typeof window.scheduleAutoPlayAdvance === 'function') {
            window.scheduleAutoPlayAdvance();
        }
    }
}

function toggleAutoplay() {
    setAutoplayEnabled(!isAutoPlayEnabled);
}

function refreshTopBarButtonDisabledState() {
    const isConfigVisible = configMenu && !configMenu.classList.contains('hidden');
    const isHistoryVisible = historyMenu && !historyMenu.classList.contains('hidden');
    const shouldDisable = !!(isConfigVisible || isHistoryVisible);

    if (courtRecordBtn) courtRecordBtn.disabled = shouldDisable;
    if (configBtn) configBtn.disabled = shouldDisable;
}

function closeConfigMenu() {
    if (!configMenu) return;
    configMenu.classList.add('hidden');
    isInputBlocked = false;
    refreshTopBarButtonDisabledState();

    if (isAutoPlayEnabled && !isTyping && isScenePlaying) {
        if (typeof window.scheduleAutoPlayAdvance === 'function') {
            window.scheduleAutoPlayAdvance();
        }
    }
}

function renderHistoryEntries() {
    if (!historyList) return;

    historyList.innerHTML = '';
    const entries = (typeof window.getDialogueHistory === 'function') ? window.getDialogueHistory() : [];

    if (!entries.length) {
        const empty = document.createElement('div');
        empty.className = 'history-empty';
        empty.textContent = window.t('ui.noHistory', 'No dialogue history yet.');
        historyList.appendChild(empty);
        return;
    }

    entries.slice().reverse().forEach((entry) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'history-entry';

        const nameEl = document.createElement('div');
        nameEl.className = 'history-name';
        nameEl.textContent = entry.name;

        const textEl = document.createElement('div');
        textEl.className = 'history-text';
        textEl.textContent = entry.text;

        wrapper.appendChild(nameEl);
        wrapper.appendChild(textEl);
        historyList.appendChild(wrapper);
    });
}

function openHistoryMenu(fromConfig = false) {
    if (!historyMenu) return;

    if (typeof window.clearAutoPlayTimer === 'function') {
        window.clearAutoPlayTimer();
    }

    returnToConfigAfterHistory = fromConfig;

    if (fromConfig && configMenu) {
        configMenu.classList.add('hidden');
    }

    renderHistoryEntries();
    historyMenu.classList.remove('hidden');
    isInputBlocked = true;
    refreshTopBarButtonDisabledState();
}

function closeHistoryMenu(restoreConfig = true) {
    if (!historyMenu) return;

    historyMenu.classList.add('hidden');

    if (restoreConfig && returnToConfigAfterHistory && configMenu) {
        returnToConfigAfterHistory = false;
        configMenu.classList.remove('hidden');
        isInputBlocked = true;
        refreshTopBarButtonDisabledState();
        return;
    }

    returnToConfigAfterHistory = false;

    isInputBlocked = false;
    refreshTopBarButtonDisabledState();

    if (isAutoPlayEnabled && !isTyping && isScenePlaying) {
        if (typeof window.scheduleAutoPlayAdvance === 'function') {
            window.scheduleAutoPlayAdvance();
        }
    }
}

function syncConfigMenuControls() {

    updateAutoplayIndicator();

    if (configLanguageSelect && typeof window.getGameLanguage === 'function') {
        configLanguageSelect.value = window.getGameLanguage();
    }

    if (configAutoSpeedRadios && configAutoSpeedRadios.length > 0) {
        configAutoSpeedRadios.forEach((radio) => {
            radio.checked = radio.value === autoPlaySpeedPreset;
        });
    }
}

function openConfigMenu() {
    if (!configMenu) return;

    if (typeof window.clearAutoPlayTimer === 'function') {
        window.clearAutoPlayTimer();
    }

    syncConfigMenuControls();
    configMenu.classList.remove('hidden');
    isInputBlocked = true;
    refreshTopBarButtonDisabledState();
}

if (configBtn) {
    configBtn.addEventListener('click', () => {
        if (configMenu && !configMenu.classList.contains('hidden')) {
            closeConfigMenu();
        } else {
            openConfigMenu();
        }
    });
}

if (configCloseBtn) {
    configCloseBtn.addEventListener('click', () => {
        closeConfigMenu();
    });
}

if (configHistoryBtn) {
    configHistoryBtn.addEventListener('click', () => {
        openHistoryMenu(true);
    });
}

if (historyCloseBtn) {
    historyCloseBtn.addEventListener('click', () => {
        closeHistoryMenu();
    });
}

document.addEventListener('historyUpdated', () => {
    if (historyMenu && !historyMenu.classList.contains('hidden')) {
        renderHistoryEntries();
    }
});

document.addEventListener('uiTextUpdated', () => {
    updateAutoplayIndicator();
    if (historyMenu && !historyMenu.classList.contains('hidden')) {
        renderHistoryEntries();
    }
});

if (autoplayIndicator) {
    autoplayIndicator.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleAutoplay();
    });
}

if (configLanguageSelect) {
    configLanguageSelect.addEventListener('change', async () => {
        const selectedLanguage = configLanguageSelect.value;

        closeHistoryMenu(false);
        closeConfigMenu();

        if (typeof window.setGameLanguage === 'function') {
            await window.setGameLanguage(selectedLanguage);
        }
    });
}

if (configAutoSpeedRadios && configAutoSpeedRadios.length > 0) {
    configAutoSpeedRadios.forEach((radio) => {
        radio.addEventListener('change', () => {
            if (!radio.checked) return;
            if (typeof window.setAutoPlaySpeedPreset === 'function') {
                window.setAutoPlaySpeedPreset(radio.value);
            }

            if (typeof window.clearAutoPlayTimer === 'function') {
                window.clearAutoPlayTimer();
            }

            if (isAutoPlayEnabled && !isTyping && isScenePlaying && !isInputBlocked) {
                if (typeof window.scheduleAutoPlayAdvance === 'function') {
                    window.scheduleAutoPlayAdvance();
                }
            }
        });
    });
}

// Shared logic for scene state only

// Function to handle Option Selection Menu
window.renderOptionsMenu = function(optionKey) {
    const optionData = optionsDB[optionKey];
    if (!optionData) {
        console.error("Option data not found for key: " + optionKey);
        isTyping = false; 
        return;
    }

    // Reuse topicMenu as the container for options
    topicMenu.classList.remove('hidden');
    // Hide other overlapping menus if any
    investigationMenu.classList.add('hidden');
    investigationPanel.classList.add('hidden');
    
    // Hide Advance Button
    advanceBtn.classList.add('hidden');
    
    // Block interaction
    isInputBlocked = true;

    topicMenu.innerHTML = ''; // Clear previous content

    // Create a Header
    if (optionData.text) {
        const header = document.createElement('div');
        header.className = 'options-header';
        header.textContent = optionData.text;
        topicMenu.appendChild(header);
    }

    // Render Buttons
    if (optionData.options && Array.isArray(optionData.options)) {
        optionData.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'topic-button'; // Reuse existing button class
            btn.textContent = opt.text;
            
            btn.addEventListener('click', () => {
                // Unblock interaction
                isInputBlocked = false;

                // Hide menu
                topicMenu.classList.add('hidden');
                
                // Jump to the selected label
                if (window.jumpToSection) {
                    jumpToSection(opt.label);
                }
            });

            topicMenu.appendChild(btn);
        });
    }
}

// Listen for scene state changes
document.addEventListener('sceneStateChanged', (e) => {
    const isPlaying = e.detail.isPlaying;
    if (!isPlaying && typeof window.clearAutoPlayTimer === 'function') {
        window.clearAutoPlayTimer();
    }

    if (!isPlaying) {
        closeConfigMenu();
        closeHistoryMenu(false);
    }

    refreshTopBarButtonDisabledState();

    if (isPlaying) {
        textboxContainer.classList.remove('hidden');
        investigationMenu.classList.add('hidden');
        moveMenu.classList.add('hidden');
        topicMenu.classList.add('hidden');
        advanceBtn.classList.remove('hidden');
        investigationPanel.classList.add('hidden');
        bottomTopBar.classList.remove('hidden'); // Ensure top bar is visible during dialogue
        gameContainer.classList.remove('investigating');
    } else {
        textboxContainer.classList.add('hidden');
        advanceBtn.classList.add('hidden');
        
        // Hide Life Bar on scene end
        if (typeof hideLifeBar === 'function') hideLifeBar();
        
        if (isExamining) {

            // Return to examine mode
            investigationMenu.classList.add('hidden');
            investigationPanel.classList.remove('hidden');
            topicMenu.classList.add('hidden');
            bottomTopBar.classList.add('hidden'); // Hide top bar in examine mode
            gameContainer.classList.add('investigating');
            renderInvestigation(); // Refresh background and points
        } else {
            // Show Main Menu by default
            investigationMenu.classList.remove('hidden');
            topicMenu.classList.add('hidden');
            investigationPanel.classList.add('hidden');
            bottomTopBar.classList.remove('hidden'); // Ensure top bar is visible in menu
        }
    }
});

refreshTopBarButtonDisabledState();
updateAutoplayIndicator();

// Advance Button Logic
function startFastForward(e) {
    if (e.type === 'touchstart') e.preventDefault(); // Prevent ghost clicks
    
    // Immediate advance on click
    advanceDialogue(true);

    if (isFastForwarding) return;

    // Start delay timer for fast forward
    fastForwardTimeout = setTimeout(() => {
        isFastForwarding = true;
        advanceBtn.textContent = "▶▶";
        
        // Loop
        fastForwardInterval = setInterval(() => {
            advanceDialogue(true);
        }, 100);
    }, 500);
}

function stopFastForward() {
    if (fastForwardTimeout) {
        clearTimeout(fastForwardTimeout);
        fastForwardTimeout = null;
    }

    isFastForwarding = false;
    advanceBtn.textContent = "▶";
    if (fastForwardInterval) {
        clearInterval(fastForwardInterval);
        fastForwardInterval = null;
    }
}

advanceBtn.addEventListener('mousedown', startFastForward);
advanceBtn.addEventListener('mouseup', stopFastForward);
advanceBtn.addEventListener('mouseleave', stopFastForward);

// Touch support
advanceBtn.addEventListener('touchstart', startFastForward, { passive: false });
advanceBtn.addEventListener('touchend', stopFastForward);
advanceBtn.addEventListener('touchcancel', stopFastForward);

// Topic logic moved to topics.js

/* --- Single Screen Mode Logic --- */
let isSingleScreenMode = false;
let activeScreen = 'top'; // 'top' or 'bottom'

function updateScreenVisibility() {
    const topScreen = document.getElementById('game-container');
    const bottomScreen = document.getElementById('bottom-screen');
    const wrapper = document.getElementById('main-wrapper');

    if (isSingleScreenMode) {
        wrapper.classList.add('single-screen-mode');
        if (activeScreen === 'top') {
            topScreen.classList.remove('inactive-screen');
            bottomScreen.classList.add('inactive-screen');
        } else {
            topScreen.classList.add('inactive-screen');
            bottomScreen.classList.remove('inactive-screen');
        }
    } else {
        wrapper.classList.remove('single-screen-mode');
        topScreen.classList.remove('inactive-screen');
        bottomScreen.classList.remove('inactive-screen');
    }
}

function toggleScreenMode() {
    isSingleScreenMode = !isSingleScreenMode;
    // Default to top screen when entering single mode
    if (isSingleScreenMode) {
        activeScreen = 'top';
    }
    updateScreenVisibility();
}

function switchScreen() {
    if (!isSingleScreenMode) return;
    activeScreen = (activeScreen === 'top') ? 'bottom' : 'top';
    updateScreenVisibility();
}

window.toggleScreenMode = toggleScreenMode;
window.switchScreen = switchScreen;
