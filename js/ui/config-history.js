// js/ui/config-history.js
// Handles config menu, history menu, autoplay indicator and related UI controls.
console.log("UI Config/History Loaded");

let returnToConfigAfterHistory = false;
let isTitleConfigMode = false;
const SETTINGS_STORAGE_KEY = 'ace_attorney_settings';

function getAvailableSettingsLanguages() {
    return (configLanguageSelect && configLanguageSelect.options)
        ? Array.from(configLanguageSelect.options).map((option) => String(option.value || '').toUpperCase()).filter(Boolean)
        : ['EN', 'ES', 'JP'];
}

function normalizePersistedSettings(rawSettings = {}) {
    const validSpeedPresets = ['slow', 'normal', 'fast'];
    const nextSpeed = String(rawSettings.autoPlaySpeedPreset || autoPlaySpeedPreset || 'normal').toLowerCase();
    const nextLanguage = String(rawSettings.language || currentLanguage || 'EN').toUpperCase();
    const validLanguages = getAvailableSettingsLanguages();

    return {
        autoPlaySpeedPreset: validSpeedPresets.includes(nextSpeed) ? nextSpeed : 'normal',
        isAutoPlayEnabled: !!rawSettings.isAutoPlayEnabled,
        language: validLanguages.includes(nextLanguage) ? nextLanguage : (validLanguages[0] || 'EN')
    };
}

function readPersistedSettings() {
    try {
        const settingsString = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (!settingsString) {
            return normalizePersistedSettings({});
        }

        const parsedSettings = JSON.parse(settingsString);
        return normalizePersistedSettings(parsedSettings && typeof parsedSettings === 'object' ? parsedSettings : {});
    } catch (error) {
        console.warn('Failed to read persisted settings:', error);
        return normalizePersistedSettings({});
    }
}

function savePersistedSettings(partialSettings = {}) {
    const nextSettings = normalizePersistedSettings({
        ...readPersistedSettings(),
        ...(partialSettings && typeof partialSettings === 'object' ? partialSettings : {})
    });

    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
    } catch (error) {
        console.warn('Failed to save persisted settings:', error);
    }

    return nextSettings;
}

window.getPersistedSettings = readPersistedSettings;
window.savePersistedSettings = savePersistedSettings;
window.applyPersistedSettings = function() {
    const settings = readPersistedSettings();

    if (typeof window.setAutoPlaySpeedPreset === 'function') {
        window.setAutoPlaySpeedPreset(settings.autoPlaySpeedPreset);
    } else {
        autoPlaySpeedPreset = settings.autoPlaySpeedPreset;
    }

    isAutoPlayEnabled = settings.isAutoPlayEnabled;
    currentLanguage = settings.language;

    if (configLanguageSelect) {
        configLanguageSelect.value = settings.language;
    }

    return settings;
};

function updateAutoplayIndicator() {
    if (!autoplayIndicator) return;

    if (typeof isScenePlaying !== 'undefined') {
        autoplayIndicator.classList.toggle('hidden', !isScenePlaying);
    }

    autoplayIndicator.classList.toggle('active', isAutoPlayEnabled);
    autoplayIndicator.setAttribute('aria-pressed', isAutoPlayEnabled ? 'true' : 'false');
    autoplayIndicator.title = isAutoPlayEnabled
        ? window.t('ui.autoplayOn', 'Auto Play On (A)')
        : window.t('ui.autoplayOff', 'Auto Play Off (A)');
}

function setAutoplayEnabled(nextEnabled) {
    isAutoPlayEnabled = !!nextEnabled;

    if (typeof window.savePersistedSettings === 'function') {
        window.savePersistedSettings({ isAutoPlayEnabled: isAutoPlayEnabled });
    }

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
    const wasTitleContext = isTitleConfigMode || isTitleScreenVisible();
    configMenu.classList.add('hidden');
    setConfigMenuContext(false);
    isInputBlocked = false;
    refreshTopBarButtonDisabledState();

    if (wasTitleContext && typeof window.hideActionMenus === 'function') {
        window.hideActionMenus();
    }

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

function isTitleScreenVisible() {
    const titleTop = document.getElementById('title-screen-top');
    return !!(titleTop && !titleTop.classList.contains('hidden'));
}

function setConfigMenuContext(fromTitle) {
    if (!configMenu) return;
    isTitleConfigMode = !!fromTitle;
    configMenu.classList.toggle('title-config-mode', isTitleConfigMode);
}

function openConfigMenu(fromTitle = null) {
    if (!configMenu) return;

    if (typeof window.clearAutoPlayTimer === 'function') {
        window.clearAutoPlayTimer();
    }

    const shouldUseTitleMode = typeof fromTitle === 'boolean' ? fromTitle : isTitleScreenVisible();
    setConfigMenuContext(shouldUseTitleMode);

    if (shouldUseTitleMode && typeof window.hideActionMenus === 'function') {
        window.hideActionMenus();
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
        if (isTitleConfigMode) return;
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

        if (typeof window.savePersistedSettings === 'function') {
            window.savePersistedSettings({ language: selectedLanguage });
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

            if (typeof window.savePersistedSettings === 'function') {
                window.savePersistedSettings({ autoPlaySpeedPreset: radio.value });
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

if (document.getElementById("config-save-btn")) {
    document.getElementById("config-save-btn").addEventListener("click", () => { window.saveGame(1); });
}
if (document.getElementById("config-load-btn")) {
    document.getElementById("config-load-btn").addEventListener("click", () => { window.loadGame(1); });
}

if (typeof window.applyPersistedSettings === 'function') {
    window.applyPersistedSettings();
}

refreshTopBarButtonDisabledState();
syncConfigMenuControls();

window.toggleAutoplay = toggleAutoplay;
window.openConfigMenu = openConfigMenu;
window.closeConfigMenu = closeConfigMenu;
window.openHistoryMenu = openHistoryMenu;
window.closeHistoryMenu = closeHistoryMenu;
window.refreshTopBarButtonDisabledState = refreshTopBarButtonDisabledState;

// Full screen button logic
if (typeof configFullscreenBtn !== 'undefined' && configFullscreenBtn) {
    configFullscreenBtn.addEventListener('click', () => {
        const elem = document.documentElement;
        if (!document.fullscreenElement) {
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.mozRequestFullScreen) { /* Firefox */
                elem.mozRequestFullScreen();
            } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
                elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) { /* IE/Edge */
                elem.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    });
}
