

const SCENE_LANGUAGES = document.getElementById('config-language-select') && document.getElementById('config-language-select').options ? Array.from(document.getElementById('config-language-select').options).map(opt => opt.value.toUpperCase()) : ['EN'];

function normalizeScenePath(path) {
    return String(path || '').replace(/\\/g, '/');
}

function getScenePathParts(scenePath) {
    const normalized = normalizeScenePath(scenePath);
    const marker = 'assets/scenes/';
    const idx = normalized.indexOf(marker);

    if (idx === -1) {
        return null;
    }

    const prefix = normalized.substring(0, idx + marker.length);
    const relativePath = normalized.substring(idx + marker.length);
    const segments = relativePath.split('/').filter(Boolean);

    if (segments.length === 0) {
        return null;
    }

    // For case-based structure: assets/scenes/[CaseName]/[Language]/[SceneName].json
    // We want baseRelativePath to be the path without the language code for reconstruction
    let caseFolder = '';
    let baseSegments = segments;
    
    // If there are multiple segments, first is likely the case folder
    if (segments.length > 1) {
        caseFolder = segments[0];
        baseSegments = segments;
        
        // Check if second segment is a language code and remove it
        if (SCENE_LANGUAGES.includes(segments[1].toUpperCase())) {
            baseSegments = [segments[0], ...segments.slice(2)];
        }
    } else if (SCENE_LANGUAGES.includes(segments[0].toUpperCase())) {
        // Single segment that is a language - keep it (legacy compatibility)
        baseSegments = segments;
    }

    if (baseSegments.length === 0) {
        return null;
    }

    return {
        prefix,
        baseRelativePath: baseSegments.join('/'),
        caseFolder
    };
}

function buildScenePathForLanguage(scenePath, languageCode) {
    const normalized = normalizeScenePath(scenePath);
    const marker = 'assets/scenes/';
    const idx = normalized.indexOf(marker);

    if (idx === -1) {
        // Path doesn't contain marker, return as-is
        return normalized;
    }

    const lang = String(languageCode || 'EN').toUpperCase();
    const prefix = normalized.substring(0, idx + marker.length);
    const relativePath = normalized.substring(idx + marker.length);
    const segments = relativePath.split('/').filter(Boolean);

    if (segments.length === 0) {
        return normalized;
    }

    // Detect if path already contains a language code
    // Check first segment or second segment (in case of FlyHigh/EN/scene.json)
    let langIndex = -1;
    for (let i = 0; i < Math.min(2, segments.length); i++) {
        if (SCENE_LANGUAGES.includes(segments[i].toUpperCase())) {
            langIndex = i;
            break;
        }
    }

    if (langIndex !== -1) {
        // Language found - replace it
        segments[langIndex] = lang;
        return prefix + segments.join('/');
    } else {
        // No language found - need to insert it
        // For paths like "FlyHigh/scene.json", insert after first segment (case folder)
        // For paths like "scene.json" (bare scene name), prepend current case
        if (segments.length === 1) {
            // Bare scene name - use current case if available
            const caseFolder = String(currentCase || defaultCase || 'FlyHigh');
            return `${prefix}${caseFolder}/${lang}/${segments[0]}`;
        } else {
            // Multi-segment path like "FlyHigh/scene.json" - insert language after first segment
            segments.splice(1, 0, lang);
            return prefix + segments.join('/');
        }
    }
}

function getSceneTranslationKeyFromPath(scenePath) {
    const parts = getScenePathParts(scenePath);
    if (!parts || !parts.baseRelativePath) return '';
    return parts.baseRelativePath.replace(/\.json$/i, '');
}

function getSceneLoadCandidates(scenePath, languageCode) {
    const normalized = normalizeScenePath(scenePath);
    const selectedLanguagePath = buildScenePathForLanguage(normalized, languageCode);
    const englishPath = buildScenePathForLanguage(normalized, 'EN');

    const uniqueCandidates = [];
    [selectedLanguagePath, englishPath, normalized].forEach((candidate) => {
        if (candidate && !uniqueCandidates.includes(candidate)) {
            uniqueCandidates.push(candidate);
        }
    });

    return uniqueCandidates;
}

function getSanitizedCase(caseValue) {
    const normalized = String(caseValue || '')
        .replace(/\\/g, '/')
        .replace(/\.json$/i, '')
        .replace(/^\/+|\/+$/g, '');

    if (!normalized) return '';

    // Allow alphanumeric, underscores, hyphens (typical case folder names)
    if (!/^[A-Za-z0-9_\-]+$/.test(normalized)) {
        return '';
    }

    return normalized;
}

function getCaseFromUrl() {
    try {
        const urlParams = new URLSearchParams(window.location.search || '');
        const caseParam = urlParams.get('case');
        return getSanitizedCase(caseParam);
    } catch (error) {
        console.warn('Unable to parse URL case parameter:', error);
        return '';
    }
}

function getLanguageFromUrl() {
    try {
        const urlParams = new URLSearchParams(window.location.search || '');
        const requestedLanguage = String(urlParams.get('lang') || '').toUpperCase();
        return SCENE_LANGUAGES.includes(requestedLanguage) ? requestedLanguage : null;
    } catch (error) {
        console.warn('Unable to parse URL language parameter:', error);
        return null;
    }
}

function sanitizeSceneKey(sceneKey) {
    const normalized = String(sceneKey || '')
        .replace(/\\/g, '/')
        .replace(/\.json$/i, '')
        .replace(/^\/+|\/+$/g, '');

    if (!normalized) return '';

    // Allow nested folders and common filename characters only.
    if (!/^[A-Za-z0-9_\-/]+$/.test(normalized)) {
        return '';
    }

    return normalized;
}

function getInitialSceneKeyFromUrl() {
    try {
        const urlParams = new URLSearchParams(window.location.search || '');
        return sanitizeSceneKey(urlParams.get('scene'));
    } catch (error) {
        console.warn('Unable to parse URL scene parameter:', error);
        return '';
    }
}

function getInitialScenePath(languageCode) {
    const fallbackSceneKey = sanitizeSceneKey(
        (typeof defaultInitialSceneKey === 'string' && defaultInitialSceneKey)
            ? defaultInitialSceneKey
            : 'intro'
    ) || 'intro';

    const sceneKeyFromUrl = getInitialSceneKeyFromUrl();
    const sceneKey = sceneKeyFromUrl || fallbackSceneKey;
    const lang = String(languageCode || 'EN').toUpperCase();
    const caseFolder = String(currentCase || defaultCase || 'FlyHigh');

    // Return path in the structure: assets/scenes/[CaseName]/[Language]/[SceneName].json
    return `assets/scenes/${caseFolder}/${lang}/${sceneKey}.json`;
}

async function fetchSceneDataWithFallback(scenePath, languageCode) {
    const candidates = getSceneLoadCandidates(scenePath, languageCode);
    let lastError = null;

    for (const candidate of candidates) {
        try {
            const response = await fetch(candidate);
            if (!response.ok) {
                lastError = new Error(`HTTP ${response.status} for ${candidate}`);
                continue;
            }

            const data = await response.json();
            return { data, resolvedPath: candidate };
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error('Failed to load scene JSON.');
}

// Function to load game data (exposed globally)
window.loadGameData = async function(jsonPath, startSection = null, isLoadingSave = false) {
    const requestedPath = normalizeScenePath(jsonPath);
    // Don't overwrite the global if this is just a pre-load or restore step where we handle it.
    if (!isLoadingSave) {
        currentSceneRequestPath = requestedPath;
    }

    console.log(`Loading game data from: ${requestedPath} (lang: ${currentLanguage})`);

    if (typeof window.stopAllSceneAudio === 'function') {
        window.stopAllSceneAudio();
    }
    
    // Show a loading indicator if you have one, or simple log
    // Maybe pause the game/input?

    try {
        const { data, resolvedPath } = await fetchSceneDataWithFallback(requestedPath, currentLanguage);
        currentSceneResolvedPath = resolvedPath;

        if (typeof window.setCurrentSceneTranslationKey === 'function') {
            window.setCurrentSceneTranslationKey(getSceneTranslationKeyFromPath(resolvedPath));
        }

        // Reset/Update Data Containers
        // Always overwrite DBs to ensure strict scene scoping
        characters = data.characters || {};
        backgrounds = data.backgrounds || {};
        foregrounds = data.foregrounds || {};
        
        // For Evidence and Profiles, MERGE to preserve definitions of items in inventory
        evidenceDB = { ...evidenceDB, ...(data.evidence || {}) };
        profilesDB = { ...profilesDB, ...(data.profiles || {}) };
        
        topicsDB = data.Topics || {};
        investigations = data.investigations || {};
        sceneMoveLocations = data.move || [];
        optionsDB = data.options || {};
        soundsDB = data.sounds || {};
        musicDB = data.music || {};
        videosDB = data.videos || {};
        
        // Setup initial action states based on scene data or reset to default
        if (data.actions) {
            actionStates = {
                examine: data.actions.examine !== false,
                move: data.actions.move !== false,
                talk: data.actions.talk !== false,
                present: data.actions.present !== false
            };
        } else {
            // Default to all true if not provided
            actionStates = {
                examine: true,
                move: true,
                talk: true,
                present: true
            };
        }
        
        // Apply action states visually
        if (typeof window.updateActionButtons === 'function') {
            window.updateActionButtons();
        }

        // Update Game Script
        if (data.gameScript) gameScript = data.gameScript;

        // Determine Start Section
        if (startSection) {
            currentSectionName = startSection;
        } else if (data.initialSection) {
            currentSectionName = data.initialSection;
        } else {
            currentSectionName = "Demo_Main_01"; // Fallback
        }
        
        // Set initial globals
        if (!isLoadingSave) {
            initialSectionName = currentSectionName;
            currentLineIndex = 0;
        }

        // Re-run preload (this updates the new objects in-place with blob URLs)
        await preloadAssets();

        // Clear top screen layers before starting the new scene
        if (typeof clearTopScreen === 'function') clearTopScreen();

        if (!isLoadingSave) {
            // Start the game logic normally
            startGame();
        }
    } catch (error) {
        console.error('Error loading game script:', error);
        const message = (typeof window.t === 'function')
            ? window.t('ui.loadGameDataFailed', 'Failed to load game data: {path}', { path: requestedPath })
            : `Failed to load game data: ${requestedPath}`;
        alert(message);
    }
};

window.setGameLanguage = async function(languageCode) {
    const nextLanguage = String(languageCode || 'EN').toUpperCase();
    if (!SCENE_LANGUAGES.includes(nextLanguage)) return;

    const hasChanged = currentLanguage !== nextLanguage;
    currentLanguage = nextLanguage;

    if (typeof window.loadUIText === 'function') {
        await window.loadUIText();
    }

    if (!hasChanged) return;

    if (typeof window.clearDialogueHistory === 'function') {
        window.clearDialogueHistory();
    }

    const sceneToReload = currentSceneRequestPath || currentSceneResolvedPath;
    if (sceneToReload) {
        await window.loadGameData(sceneToReload);
    } else {
        // Update Title Screen instead of loading game
        if (typeof window.initTitleScreen === 'function') {
            window.initTitleScreen();
        }
    }
};

window.getGameLanguage = function() {
    return currentLanguage;
};

window.setGameCase = function(caseValue) {
    const newCase = getSanitizedCase(caseValue);
    if (newCase) {
        currentCase = newCase;
    }
};

window.getGameCase = function() {
    return currentCase;
};

const languageFromUrl = getLanguageFromUrl();
if (languageFromUrl) {
    currentLanguage = languageFromUrl;
}

const caseFromUrl = getCaseFromUrl();
if (caseFromUrl) {
    currentCase = caseFromUrl;
}

async function initializeGame() {
    if (typeof window.loadUIText === 'function') {
        await window.loadUIText();
    }

    const sceneKeyFromUrl = getInitialSceneKeyFromUrl();
    if (sceneKeyFromUrl) {
        // Direct scene load via URL bypasses Title Screen
        if (typeof window.hideTitleScreen === 'function') {
            window.hideTitleScreen();
        }
        await loadGameData(getInitialScenePath(currentLanguage));
    } else {
        // Normal startup: Show Title Screen
        if (typeof window.initTitleScreen === 'function') {
            window.initTitleScreen();
        } else {
            // Fallback if title screen logic isn't loaded
            await loadGameData(getInitialScenePath(currentLanguage));
        }
    }
}

// Initial Load
initializeGame();

// Add click event listener to the game container
gameContainer.addEventListener('click', () => {
    if (isCourtRecordOpen) return;
    advanceDialogue();
});


