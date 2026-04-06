
// Audio
const blipPaths = {
    1: 'assets/audio/blip_1.ogg',
    2: 'assets/audio/blip_2.ogg',
    3: 'assets/audio/typewriter.ogg'
};
const BLIP_POOL_SIZE = 4;
const blipPools = {};
const blipPoolIndex = {};
const activeSFX = new Set();
const sfxTemplateCache = new Map();
let activeBgmFadeInterval = null;
let currentBgmPlaybackId = 0;
let pendingSfxWarmupHandle = null;

function clearBgmFadeInterval() {
    if (activeBgmFadeInterval) {
        clearInterval(activeBgmFadeInterval);
        activeBgmFadeInterval = null;
    }
}

function resetAndStopAudio(audio) {
    if (typeof window.safeResetAndStopAudio === 'function') {
        window.safeResetAndStopAudio(audio);
        return;
    }

    if (!audio) return;

    try {
        audio.pause();
    } catch (error) {
        console.warn('Failed to pause audio:', error);
    }

    try {
        audio.currentTime = 0;
    } catch (error) {
        console.warn('Failed to reset audio time:', error);
    }

    try {
        audio.volume = 1;
    } catch (error) {
        console.warn('Failed to reset audio volume:', error);
    }
}

function buildBlipPool(path, size = BLIP_POOL_SIZE) {
    const pool = [];
    for (let i = 0; i < size; i++) {
        const audio = (typeof window.createManagedAudio === 'function')
            ? window.createManagedAudio(path)
            : new Audio(path);

        if (!audio) continue;

        if (typeof window.createManagedAudio !== 'function') {
            audio.preload = 'auto';
            audio.load();
        }

        pool.push(audio);
    }
    return pool;
}

function ensureBlipPool(type) {
    const normalizedType = Number(type);
    if (!blipPools[normalizedType] && blipPaths[normalizedType]) {
        blipPools[normalizedType] = buildBlipPool(blipPaths[normalizedType]);
        blipPoolIndex[normalizedType] = 0;
    }

    return blipPools[normalizedType] || null;
}

function normalizeSfxPath(rawPath) {
    if (typeof window.resolveMediaAssetPath === 'function') {
        return window.resolveMediaAssetPath(rawPath);
    }

    if (!rawPath || typeof rawPath !== 'string') return null;
    if (rawPath.startsWith('http://') || rawPath.startsWith('https://') || rawPath.startsWith('data:')) {
        return rawPath;
    }
    if (rawPath.startsWith('/')) {
        return rawPath;
    }
    if (rawPath.startsWith('assets/')) {
        return rawPath;
    }
    return `assets/${rawPath}`;
}

function getOrCreateSfxTemplate(soundPath) {
    const normalizedPath = normalizeSfxPath(soundPath);
    if (!normalizedPath) return null;

    if (!sfxTemplateCache.has(normalizedPath)) {
        const templateAudio = (typeof window.createManagedAudio === 'function')
            ? window.createManagedAudio(normalizedPath)
            : new Audio(normalizedPath);

        if (templateAudio && typeof window.createManagedAudio !== 'function') {
            templateAudio.preload = 'auto';
            templateAudio.load();
        }

        if (templateAudio) {
            sfxTemplateCache.set(normalizedPath, templateAudio);
        }
    }

    return sfxTemplateCache.get(normalizedPath);
}

function playSoundByPath(soundPath) {
    const template = getOrCreateSfxTemplate(soundPath);
    if (!template) return;

    const audio = template.cloneNode(true);
    audio.currentTime = 0;
    activeSFX.add(audio);

    const cleanup = () => {
        activeSFX.delete(audio);
        audio.src = '';
    };

    audio.addEventListener('ended', cleanup, { once: true });
    audio.addEventListener('error', cleanup, { once: true });
    audio.play().catch(e => {
        cleanup();
        console.warn('SFX play failed:', e);
    });
}

function warmSceneSfxCache(options = {}) {
    if (!soundsDB || typeof soundsDB !== 'object') return;

    const { immediate = false, limit = 6 } = options;
    const soundPaths = Object.values(soundsDB).slice(0, Math.max(0, limit));
    const warm = () => {
        pendingSfxWarmupHandle = null;
        soundPaths.forEach((pathValue) => {
            getOrCreateSfxTemplate(pathValue);
        });
    };

    if (immediate) {
        warm();
        return;
    }

    if (pendingSfxWarmupHandle) {
        if (typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
            window.cancelIdleCallback(pendingSfxWarmupHandle);
        } else {
            clearTimeout(pendingSfxWarmupHandle);
        }
        pendingSfxWarmupHandle = null;
    }

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        pendingSfxWarmupHandle = window.requestIdleCallback(warm, { timeout: 1200 });
    } else {
        pendingSfxWarmupHandle = setTimeout(warm, 120);
    }
}

function playBlip() {
    if (currentBlipType === 4) return; // Silence

    const pool = ensureBlipPool(currentBlipType);
    if (!pool || pool.length === 0) return;

    // User-requested behavior: never overlap blips.
    if (pool.some(channel => !channel.paused)) return;

    const idx = blipPoolIndex[currentBlipType] || 0;
    const audio = pool[idx];
    blipPoolIndex[currentBlipType] = (idx + 1) % pool.length;

    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(e => console.warn('Audio play failed:', e));
}

function playSound(soundName) {
    const soundPath = soundsDB[soundName];
    if (soundPath) {
        playSoundByPath(soundPath);
    } else {
        console.warn(`Sound not found: ${soundName}`);
    }
}

function playBGM(musicName, fadeIn = false, force = false) {
    const musicPath = musicDB[musicName];
    if (!musicPath) {
        console.warn(`Music not found: ${musicName}`);
        return;
    }

    clearBgmFadeInterval();

    if (currentBGMKey === musicName && currentBGM && !currentBGM.paused && !force) {
        return;
    }

    // Fully stop any currently playing track before starting a different one.
    stopBGM(false);

    const playbackId = ++currentBgmPlaybackId;
    currentBGMKey = musicName;

    const startFadeIn = () => {
        if (!fadeIn) return;

        clearBgmFadeInterval();
        activeBgmFadeInterval = setInterval(() => {
            if (currentBgmPlaybackId !== playbackId || !currentBGM) {
                clearBgmFadeInterval();
                return;
            }

            if (currentBGM.volume < 0.95) {
                currentBGM.volume += 0.05;
            } else {
                currentBGM.volume = 1;
                clearBgmFadeInterval();
            }
        }, 100);
    };

    if (Array.isArray(musicPath)) {
        const introPath = musicPath[0];
        const loopPath = musicPath[1];

        const introAudio = (typeof window.createManagedAudio === 'function')
            ? window.createManagedAudio(introPath, { preload: 'auto', loop: false })
            : new Audio(introPath);
        const loopAudio = (typeof window.createManagedAudio === 'function')
            ? window.createManagedAudio(loopPath, { preload: 'auto', loop: true })
            : new Audio(loopPath);

        if (!introAudio || !loopAudio) {
            return;
        }

        if (typeof window.createManagedAudio !== 'function') {
            introAudio.loop = false;
            loopAudio.loop = true;
            loopAudio.preload = 'auto';
        }

        if (fadeIn) {
            introAudio.volume = 0;
            loopAudio.volume = 0;
        }

        currentBGM = introAudio;

        introAudio.addEventListener('ended', function() {
            if (currentBgmPlaybackId !== playbackId || currentBGM !== introAudio) {
                return;
            }

            currentBGM = loopAudio;
            loopAudio.play().catch(e => console.warn('BGM loop play failed:', e));
        });

        introAudio.play()
            .then(startFadeIn)
            .catch(e => console.warn('BGM play failed:', e));
        return;
    }

    const loopedAudio = (typeof window.createManagedAudio === 'function')
        ? window.createManagedAudio(musicPath, { preload: 'auto', loop: true })
        : new Audio(musicPath);

    if (!loopedAudio) {
        return;
    }

    if (typeof window.createManagedAudio !== 'function') {
        loopedAudio.loop = true;
    }
    if (fadeIn) {
        loopedAudio.volume = 0;
    }

    currentBGM = loopedAudio;
    loopedAudio.play()
        .then(startFadeIn)
        .catch(e => console.warn('BGM play failed:', e));
}

function stopBGM(fadeOut = true) {
    clearBgmFadeInterval();

    const audio = currentBGM;
    currentBGMKey = null;
    currentBgmPlaybackId++;

    if (!audio) {
        currentBGM = null;
        return;
    }

    if (fadeOut && !audio.paused) {
        activeBgmFadeInterval = setInterval(() => {
            if (audio.volume > 0.05) {
                audio.volume -= 0.05;
                return;
            }

            clearBgmFadeInterval();
            resetAndStopAudio(audio);
            if (currentBGM === audio) {
                currentBGM = null;
            }
        }, 100);
        return;
    }

    resetAndStopAudio(audio);
    if (currentBGM === audio) {
        currentBGM = null;
    }
}

function stopAllSceneAudio() {
    clearBgmFadeInterval();
    stopBGM(false);

    activeSFX.forEach((audio) => {
        resetAndStopAudio(audio);
    });
    activeSFX.clear();

    Object.values(blipPools).forEach((pool) => {
        pool.forEach((audio) => {
            resetAndStopAudio(audio);
        });
    });

    if (typeof window.stopTopVideoSequence === 'function') {
        window.stopTopVideoSequence(false);
    }
}

window.playSound = playSound;
window.playBGM = playBGM;
window.stopBGM = stopBGM;
window.stopAllSceneAudio = stopAllSceneAudio;
window.playSoundByPath = playSoundByPath;
window.warmSceneSfxCache = warmSceneSfxCache;
window.playBlip = playBlip;

