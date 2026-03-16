console.log("Localization Loaded");

const UI_TEXT_PATH = 'assets/i18n/ui-text.json';
let uiTextDB = {};
let sceneUITextDB = {};
let currentSceneTranslationKey = '';

function normalizeLanguageCode(languageCode) {
    return String(languageCode || 'EN').toUpperCase();
}

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

        const loadedRoot = { ...(loaded || {}) };
        delete loadedRoot.scene;

        uiTextDB = loadedRoot;
        sceneUITextDB = loadedScene;
    } catch (error) {
        console.warn('Failed to load UI text translations:', error);
        uiTextDB = uiTextDB.EN ? { EN: uiTextDB.EN } : {};
        sceneUITextDB = sceneUITextDB.EN ? { EN: sceneUITextDB.EN } : {};
    }

    window.applyUIText();
};
