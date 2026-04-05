// js/ui/config-history.js
// Handles config menu, history menu, autoplay indicator and related UI controls.
console.log("UI Config/History Loaded");

let returnToConfigAfterHistory = false;
let isTitleConfigMode = false;
const SETTINGS_STORAGE_KEY = 'ace_attorney_settings';

function getAvailableSettingsLanguages() {
    const languageSelect = document.getElementById('config-language-select') || configLanguageSelect;
    return (languageSelect && languageSelect.options)
        ? Array.from(languageSelect.options).map((option) => String(option.value || '').toUpperCase()).filter(Boolean)
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

function getCurrentConfigMenuSettings() {
    const liveLanguageSelect = document.getElementById('config-language-select') || configLanguageSelect;
    const selectedSpeedRadio = document.querySelector('input[name="auto-speed"]:checked');

    return normalizePersistedSettings({
        autoPlaySpeedPreset: selectedSpeedRadio ? selectedSpeedRadio.value : autoPlaySpeedPreset,
        isAutoPlayEnabled,
        language: liveLanguageSelect
            ? liveLanguageSelect.value
            : (typeof window.getGameLanguage === 'function' ? window.getGameLanguage() : currentLanguage)
    });
}

function persistCurrentConfigMenuSettings() {
    return savePersistedSettings(getCurrentConfigMenuSettings());
}

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

function ensureConfigHistoryMenuMounted(elementId, templateId) {
    if (typeof window.ensureLazyElementMounted === 'function') {
        window.ensureLazyElementMounted(elementId, templateId, '#bottom-main-window');
    }
    if (typeof window.refreshDOMGlobals === 'function') {
        window.refreshDOMGlobals();
    }
    bindConfigHistoryEvents();
    if (typeof window.bindReturnToTitleEvents === 'function') {
        window.bindReturnToTitleEvents();
    }
}

function bindConfigHistoryEvents() {
    const liveConfigCloseBtn = document.getElementById('config-close-btn');
    if (liveConfigCloseBtn && liveConfigCloseBtn.dataset.boundConfigHistory !== 'true') {
        liveConfigCloseBtn.dataset.boundConfigHistory = 'true';
        liveConfigCloseBtn.addEventListener('click', () => {
            closeConfigMenu();
        });
    }

    const liveConfigHistoryBtn = document.getElementById('config-history-btn');
    if (liveConfigHistoryBtn && liveConfigHistoryBtn.dataset.boundConfigHistory !== 'true') {
        liveConfigHistoryBtn.dataset.boundConfigHistory = 'true';
        liveConfigHistoryBtn.addEventListener('click', () => {
            if (isTitleConfigMode) return;
            openHistoryMenu(true);
        });
    }

    const liveHistoryCloseBtn = document.getElementById('history-close-btn');
    if (liveHistoryCloseBtn && liveHistoryCloseBtn.dataset.boundConfigHistory !== 'true') {
        liveHistoryCloseBtn.dataset.boundConfigHistory = 'true';
        liveHistoryCloseBtn.addEventListener('click', () => {
            closeHistoryMenu();
        });
    }

    const liveLanguageSelect = document.getElementById('config-language-select');
    if (liveLanguageSelect && liveLanguageSelect.dataset.boundConfigHistory !== 'true') {
        liveLanguageSelect.dataset.boundConfigHistory = 'true';
        liveLanguageSelect.addEventListener('change', async () => {
            const selectedLanguage = liveLanguageSelect.value;

            if (typeof window.setGameLanguage === 'function') {
                await window.setGameLanguage(selectedLanguage, { reloadScene: !isTitleConfigMode });
            }

            syncConfigMenuControls();
        });
    }

    document.querySelectorAll('input[name="auto-speed"]').forEach((radio) => {
        if (radio.dataset.boundConfigHistory === 'true') return;
        radio.dataset.boundConfigHistory = 'true';
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

    const saveBtn = document.getElementById('config-save-btn');
    if (saveBtn && saveBtn.dataset.boundConfigHistory !== 'true') {
        saveBtn.dataset.boundConfigHistory = 'true';
        saveBtn.addEventListener('click', () => { window.saveGame(1); });
    }

    const loadBtn = document.getElementById('config-load-btn');
    if (loadBtn && loadBtn.dataset.boundConfigHistory !== 'true') {
        loadBtn.dataset.boundConfigHistory = 'true';
        loadBtn.addEventListener('click', () => { window.loadGame(1); });
    }

    const fullscreenBtn = document.getElementById('config-fullscreen-btn');
    if (fullscreenBtn && fullscreenBtn.dataset.boundConfigHistory !== 'true') {
        fullscreenBtn.dataset.boundConfigHistory = 'true';
        fullscreenBtn.addEventListener('click', () => {
            const elem = document.documentElement;
            if (!document.fullscreenElement) {
                if (elem.requestFullscreen) {
                    elem.requestFullscreen();
                } else if (elem.mozRequestFullScreen) {
                    elem.mozRequestFullScreen();
                } else if (elem.webkitRequestFullscreen) {
                    elem.webkitRequestFullscreen();
                } else if (elem.msRequestFullscreen) {
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
}

function refreshTopBarButtonDisabledState() {
    const liveConfigMenu = document.getElementById('config-menu') || configMenu;
    const liveHistoryMenu = document.getElementById('history-menu') || historyMenu;
    const isConfigVisible = liveConfigMenu && !liveConfigMenu.classList.contains('hidden');
    const isHistoryVisible = liveHistoryMenu && !liveHistoryMenu.classList.contains('hidden');
    const isTextBusy = !!(
        (typeof isTyping !== 'undefined' && isTyping)
        || (typeof isWaitingForAnimation !== 'undefined' && isWaitingForAnimation)
        || (typeof isWaitingForAutoSkip !== 'undefined' && isWaitingForAutoSkip)
    );
    const shouldDisable = !!(isConfigVisible || isHistoryVisible || isTextBusy);

    if (courtRecordBtn) courtRecordBtn.disabled = shouldDisable;
    if (configBtn) configBtn.disabled = shouldDisable;
}

function closeConfigMenu() {
    const liveConfigMenu = document.getElementById('config-menu') || configMenu;
    if (!liveConfigMenu) return;

    persistCurrentConfigMenuSettings();

    const wasTitleContext = isTitleConfigMode || isTitleScreenVisible();
    liveConfigMenu.classList.add('hidden');
    if (typeof window.shelveLazyElement === 'function') {
        window.shelveLazyElement('config-menu');
    }
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
    const liveHistoryList = document.getElementById('history-list') || historyList;
    if (!liveHistoryList) return;

    liveHistoryList.innerHTML = '';
    const entries = (typeof window.getDialogueHistory === 'function') ? window.getDialogueHistory() : [];

    if (!entries.length) {
        const empty = document.createElement('div');
        empty.className = 'history-empty';
        empty.textContent = window.t('ui.noHistory', 'No dialogue history yet.');
        liveHistoryList.appendChild(empty);
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
        liveHistoryList.appendChild(wrapper);
    });
}

function openHistoryMenu(fromConfig = false) {
    ensureConfigHistoryMenuMounted('history-menu', 'history-menu-template');

    const liveHistoryMenu = document.getElementById('history-menu') || historyMenu;
    const liveConfigMenu = document.getElementById('config-menu') || configMenu;
    if (!liveHistoryMenu) return;

    if (typeof window.clearAutoPlayTimer === 'function') {
        window.clearAutoPlayTimer();
    }

    returnToConfigAfterHistory = fromConfig;

    if (fromConfig && liveConfigMenu) {
        liveConfigMenu.classList.add('hidden');
    }

    renderHistoryEntries();
    liveHistoryMenu.classList.remove('hidden');
    isInputBlocked = true;
    refreshTopBarButtonDisabledState();
}

function closeHistoryMenu(restoreConfig = true) {
    const liveHistoryMenu = document.getElementById('history-menu') || historyMenu;
    const liveConfigMenu = document.getElementById('config-menu') || configMenu;
    if (!liveHistoryMenu) return;

    liveHistoryMenu.classList.add('hidden');
    if (typeof window.shelveLazyElement === 'function') {
        window.shelveLazyElement('history-menu');
    }

    if (restoreConfig && returnToConfigAfterHistory && liveConfigMenu) {
        returnToConfigAfterHistory = false;
        liveConfigMenu.classList.remove('hidden');
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

    const liveLanguageSelect = document.getElementById('config-language-select') || configLanguageSelect;
    if (liveLanguageSelect && typeof window.getGameLanguage === 'function') {
        liveLanguageSelect.value = window.getGameLanguage();
    }

    const liveAutoSpeedRadios = document.querySelectorAll('input[name="auto-speed"]');
    if (liveAutoSpeedRadios && liveAutoSpeedRadios.length > 0) {
        liveAutoSpeedRadios.forEach((radio) => {
            radio.checked = radio.value === autoPlaySpeedPreset;
        });
    }
}

function isTitleScreenVisible() {
    const titleTop = document.getElementById('title-screen-top');
    return !!(titleTop && !titleTop.classList.contains('hidden'));
}

function setConfigMenuContext(fromTitle) {
    const liveConfigMenu = document.getElementById('config-menu') || configMenu;
    if (!liveConfigMenu) return;

    isTitleConfigMode = !!fromTitle;
    liveConfigMenu.classList.toggle('title-config-mode', isTitleConfigMode);

    const liveLanguageSelect = document.getElementById('config-language-select') || configLanguageSelect;
    const liveLanguageRow = liveLanguageSelect ? liveLanguageSelect.closest('.config-row') : null;
    if (liveLanguageRow) {
        liveLanguageRow.classList.toggle('hidden', !isTitleConfigMode);
    }
    if (liveLanguageSelect) {
        liveLanguageSelect.disabled = !isTitleConfigMode;
        liveLanguageSelect.setAttribute('aria-hidden', (!isTitleConfigMode).toString());
    }
}

function openConfigMenu(fromTitle = null) {
    ensureConfigHistoryMenuMounted('config-menu', 'config-menu-template');

    const liveConfigMenu = document.getElementById('config-menu') || configMenu;
    if (!liveConfigMenu) return;

    if (typeof window.clearAutoPlayTimer === 'function') {
        window.clearAutoPlayTimer();
    }

    const shouldUseTitleMode = typeof fromTitle === 'boolean' ? fromTitle : isTitleScreenVisible();
    setConfigMenuContext(shouldUseTitleMode);

    if (shouldUseTitleMode && typeof window.hideActionMenus === 'function') {
        window.hideActionMenus();
    }

    syncConfigMenuControls();
    liveConfigMenu.classList.remove('hidden');
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

bindConfigHistoryEvents();

document.addEventListener('historyUpdated', () => {
    if (historyMenu && !historyMenu.classList.contains('hidden')) {
        renderHistoryEntries();
    }
});

document.addEventListener('uiTextUpdated', () => {
    updateAutoplayIndicator();
    syncConfigMenuControls();
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

