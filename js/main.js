console.log("Main Loaded");

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

    let baseSegments = segments;
    if (SCENE_LANGUAGES.includes(segments[0].toUpperCase())) {
        baseSegments = segments.slice(1);
    }

    if (baseSegments.length === 0) {
        return null;
    }

    return {
        prefix,
        baseRelativePath: baseSegments.join('/')
    };
}

function buildScenePathForLanguage(scenePath, languageCode) {
    const parts = getScenePathParts(scenePath);
    if (!parts) return normalizeScenePath(scenePath);

    const lang = String(languageCode || 'EN').toUpperCase();
    return `${parts.prefix}${lang}/${parts.baseRelativePath}`;
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
window.loadGameData = async function(jsonPath, startSection = null) {
    const requestedPath = normalizeScenePath(jsonPath);
    currentSceneRequestPath = requestedPath;

    console.log(`Loading game data from: ${requestedPath} (lang: ${currentLanguage})`);
    
    // Show a loading indicator if you have one, or simple log
    // Maybe pause the game/input?

    try {
        const { data, resolvedPath } = await fetchSceneDataWithFallback(requestedPath, currentLanguage);
        currentSceneResolvedPath = resolvedPath;
        console.log(`Scene resolved to: ${resolvedPath}`);

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
        optionsDB = data.options || {};
        soundsDB = data.sounds || {};
        musicDB = data.music || {};
        videosDB = data.videos || {};

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
        initialSectionName = currentSectionName;
        
        // Re-run preload (this updates the new objects in-place with blob URLs)
        await preloadAssets();

        // Start the game logic
        startGame();
    } catch (error) {
        console.error('Error loading game script:', error);
        alert("Failed to load game data: " + requestedPath);
    }
};

window.setGameLanguage = async function(languageCode) {
    const nextLanguage = String(languageCode || 'EN').toUpperCase();
    if (!SCENE_LANGUAGES.includes(nextLanguage)) return;

    const hasChanged = currentLanguage !== nextLanguage;
    currentLanguage = nextLanguage;

    if (!hasChanged) return;

    const sceneToReload = currentSceneRequestPath || currentSceneResolvedPath;
    if (sceneToReload) {
        await window.loadGameData(sceneToReload);
    }
};

window.getGameLanguage = function() {
    return currentLanguage;
};

const languageFromUrl = getLanguageFromUrl();
if (languageFromUrl) {
    currentLanguage = languageFromUrl;
}

// Initial Load
loadGameData(`assets/scenes/${currentLanguage}/intro.json`);

// Add click event listener to the game container
gameContainer.addEventListener('click', advanceDialogue);


