console.log("Localization Loaded");

const UI_TEXT_PATH = 'assets/i18n/ui-text.json';
const FALLBACK_LANGUAGE_CODES = ['EN', 'ES', 'JP'];
const RESERVED_UI_TEXT_KEYS = ['scene', 'languageNames'];
let uiTextDB = {};
let sceneUITextDB = {};
let uiLanguageNamesDB = {};
let currentSceneTranslationKey = '';

function normalizeLanguageCode(languageCode) {
    return String(languageCode || 'EN').toUpperCase();
}

window.getAvailableLanguageCodes = function() {
    const codes = Object.keys(uiTextDB)
        .filter((key) => !RESERVED_UI_TEXT_KEYS.includes(key))
        .map((key) => String(key).toUpperCase())
        .filter(Boolean);

    return codes.length > 0 ? codes : [...FALLBACK_LANGUAGE_CODES];
};

window.getLanguageDisplayName = function(languageCode) {
    const normalized = normalizeLanguageCode(languageCode);
    const configured = uiLanguageNamesDB[normalized] || uiLanguageNamesDB[languageCode];

    if (typeof configured === 'string' && configured.trim()) {
        return configured.trim();
    }

    const tag = normalized.toLowerCase();
    try {
        const localized = new Intl.DisplayNames([tag], { type: 'language' }).of(tag);
        if (localized && localized.toLowerCase() !== tag) {
            return localized.charAt(0).toUpperCase() + localized.slice(1);
        }
    } catch (error) {
        // Intl unavailable or the code is not a valid language tag; fall back to the raw code.
    }

    return normalized;
};

function collectLanguageSelects() {
    const selects = Array.from(document.querySelectorAll('#config-language-select'));
    const template = document.getElementById('config-menu-template');

    if (template && template.content) {
        selects.push(...Array.from(template.content.querySelectorAll('#config-language-select')));
    }

    return selects;
}

window.syncLanguageOptions = function() {
    const desired = window.getAvailableLanguageCodes().map((code) => ({
        code,
        label: window.getLanguageDisplayName(code)
    }));

    collectLanguageSelects().forEach((select) => {
        const current = Array.from(select.options).map((option) => ({
            code: String(option.value || '').toUpperCase(),
            label: option.textContent
        }));
        const isUpToDate = current.length === desired.length
            && desired.every((entry, index) => entry.code === current[index].code && entry.label === current[index].label);

        if (isUpToDate) return;

        const previousValue = String(select.value || '').toUpperCase();
        select.textContent = '';

        desired.forEach((entry) => {
            const option = document.createElement('option');
            option.value = entry.code;
            option.textContent = entry.label;
            select.appendChild(option);
        });

        if (desired.some((entry) => entry.code === previousValue)) {
            select.value = previousValue;
        }
    });
};

function getLanguagePack(languageCode) {
    const normalized = normalizeLanguageCode(languageCode);
    return uiTextDB[normalized] || uiTextDB.EN || {};
}

function getSceneLanguagePack(languageCode) {
    const normalized = normalizeLanguageCode(languageCode);
    return sceneUITextDB[normalized] || sceneUITextDB.EN || {};
}

function getSceneOverrideValue(languageCode, key) {
    if (!currentSceneTranslationKey) return null;

    const scenePack = getSceneLanguagePack(languageCode);
    const exactScene = scenePack[currentSceneTranslationKey];
    if (exactScene && typeof exactScene[key] === 'string') {
        return exactScene[key];
    }

    const sceneBaseName = currentSceneTranslationKey.includes('/')
        ? currentSceneTranslationKey.split('/').pop()
        : currentSceneTranslationKey;
    const baseScene = scenePack[sceneBaseName];
    if (baseScene && typeof baseScene[key] === 'string') {
        return baseScene[key];
    }

    return null;
}

function formatUIText(template, params) {
    if (typeof template !== 'string') return '';
    if (!params || typeof params !== 'object') return template;

    return template.replace(/\{([^}]+)\}/g, (_, key) => {
        if (Object.prototype.hasOwnProperty.call(params, key)) {
            return String(params[key]);
        }
        return `{${key}}`;
    });
}

window.t = function(key, fallback = '', params = null) {
    const activeLanguage = window.getGameLanguage ? window.getGameLanguage() : 'EN';
    const langPack = getLanguagePack(activeLanguage);
    const enPack = uiTextDB.EN || {};
    const sceneValue = getSceneOverrideValue(activeLanguage, key);
    const sceneEnglishValue = getSceneOverrideValue('EN', key);

    const rawFromScene = (typeof sceneValue === 'string')
        ? sceneValue
        : (typeof sceneEnglishValue === 'string' ? sceneEnglishValue : null);
    const fromLanguage = langPack[key];
    const fromEnglish = enPack[key];
    const raw = (typeof rawFromScene === 'string')
        ? rawFromScene
        : (typeof fromLanguage === 'string')
        ? fromLanguage
        : (typeof fromEnglish === 'string' ? fromEnglish : fallback);

    return formatUIText(raw, params);
};

window.setCurrentSceneTranslationKey = function(sceneKey) {
    currentSceneTranslationKey = String(sceneKey || '').replace(/^\/+|\/+$/g, '');
    if (typeof window.applyUIText === 'function') {
        window.applyUIText();
    }
};

window.getCurrentSceneTranslationKey = function() {
    return currentSceneTranslationKey;
};

window.applyUIText = function() {
    if (typeof window.syncLanguageOptions === 'function') {
        window.syncLanguageOptions();
    }

    const i18nNodes = document.querySelectorAll('[data-i18n]');
    i18nNodes.forEach((node) => {
        const key = node.getAttribute('data-i18n');
        const fallback = node.getAttribute('data-i18n-fallback') || node.textContent;
        node.textContent = window.t(key, fallback);
    });

    const titleNodes = document.querySelectorAll('[data-i18n-title]');
    titleNodes.forEach((node) => {
        const key = node.getAttribute('data-i18n-title');
        const fallback = node.getAttribute('title') || '';
        node.title = window.t(key, fallback);
    });

    const ariaNodes = document.querySelectorAll('[data-i18n-aria-label]');
    ariaNodes.forEach((node) => {
        const key = node.getAttribute('data-i18n-aria-label');
        const fallback = node.getAttribute('aria-label') || '';
        node.setAttribute('aria-label', window.t(key, fallback));
    });

    document.dispatchEvent(new Event('uiTextUpdated'));
};

window.loadUIText = async function() {
    try {
        const response = await fetch(UI_TEXT_PATH);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const loaded = await response.json();
        const loadedScene = (loaded && typeof loaded.scene === 'object' && loaded.scene)
            ? loaded.scene
            : {};
        const loadedNames = (loaded && typeof loaded.languageNames === 'object' && loaded.languageNames)
            ? loaded.languageNames
            : {};

        const loadedRoot = { ...(loaded || {}) };
        RESERVED_UI_TEXT_KEYS.forEach((reservedKey) => {
            delete loadedRoot[reservedKey];
        });

        uiTextDB = loadedRoot;
        sceneUITextDB = loadedScene;
        uiLanguageNamesDB = loadedNames;
    } catch (error) {
        console.warn('Failed to load UI text translations:', error);
        uiTextDB = uiTextDB.EN ? { EN: uiTextDB.EN } : {};
        sceneUITextDB = sceneUITextDB.EN ? { EN: sceneUITextDB.EN } : {};
        uiLanguageNamesDB = {};
    }

    window.applyUIText();
};
