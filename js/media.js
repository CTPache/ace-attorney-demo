
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
        const audio = new Audio(path);
        audio.preload = 'auto';
        audio.load();
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
        const templateAudio = new Audio(normalizedPath);
        templateAudio.preload = 'auto';
        templateAudio.load();
        sfxTemplateCache.set(normalizedPath, templateAudio);
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

        const introAudio = new Audio(introPath);
        const loopAudio = new Audio(loopPath);
        introAudio.loop = false;
        loopAudio.loop = true;
        loopAudio.preload = 'auto';

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

    const loopedAudio = new Audio(musicPath);
    loopedAudio.loop = true;
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
        try {
            audio.pause();
            audio.currentTime = 0;
        } catch (e) {
            console.warn('Failed to stop SFX:', e);
        }
    });
    activeSFX.clear();

    Object.values(blipPools).forEach((pool) => {
        pool.forEach((audio) => {
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch (e) {
                console.warn('Failed to stop blip audio:', e);
            }
        });
    });

    stopTopVideoSequence(false);
}

function triggerFlash() {
    flashOverlay.classList.remove('flashing');
    void flashOverlay.offsetWidth; // Trigger reflow
    flashOverlay.classList.add('flashing');
}

let activeVideoScriptTimeouts = [];
let activeVideoCompleteCallback = null;
let isVideoAwaitingGesture = false;
let pendingVideoPlayback = null;

function clearActiveVideoScriptTimeouts() {
    activeVideoScriptTimeouts.forEach(clearTimeout);
    activeVideoScriptTimeouts = [];
}

function extractVideoScriptEntries(videoData) {
    if (!videoData) return [];

    if (Array.isArray(videoData.script)) {
        return videoData.script;
    }

    if (videoData.script && Array.isArray(videoData.script.lines)) {
        return videoData.script.lines;
    }

    if (videoData.script && Array.isArray(videoData.script.entries)) {
        return videoData.script.entries;
    }

    return [];
}

function renderVideoScriptLine(line) {
    if (!line || typeof line !== 'object') return;

    // Show textbox for this caption and run through full typewriter pipeline
    textboxContainer.style.opacity = '1';
    updateDialogue(line);

    // Hide textbox after 'duration' ms if specified
    if (Number.isFinite(line.duration) && line.duration > 0) {
        const hideId = setTimeout(() => {
            textboxContainer.style.opacity = '0';
        }, line.duration);
        activeVideoScriptTimeouts.push(hideId);
    }
}

function toggleVideoControlButtons(show) {
    if (!skipVideoBtn || !autoplayIndicator) return;
    if (show) {
        autoplayIndicator.classList.add('hidden');
        skipVideoBtn.classList.remove('hidden');
    } else {
        skipVideoBtn.classList.add('hidden');
        autoplayIndicator.classList.remove('hidden');
    }
}

function setSkipButtonMode(mode) {
    if (!skipVideoBtn) return;

    if (mode === 'play') {
        skipVideoBtn.textContent = window.t('ui.play', 'Play');
        skipVideoBtn.title = window.t('ui.playVideo', 'Play Video');
        skipVideoBtn.setAttribute('aria-label', window.t('ui.playVideoAria', 'Play Video'));
        return;
    }

    skipVideoBtn.textContent = window.t('ui.skip', 'Skip');
    skipVideoBtn.title = window.t('ui.skipVideo', 'Skip Video (V)');
    skipVideoBtn.setAttribute('aria-label', window.t('ui.skipVideoAria', 'Skip Video'));
}

function finishVideoSequence() {
    clearActiveVideoScriptTimeouts();

    if (topVideo) {
        topVideo.pause();
        topVideo.removeAttribute('src');
        topVideo.load();
        topVideo.classList.add('hidden');
    }

    // Restore textbox so the next dialogue line is visible
    textboxContainer.style.opacity = '1';
    nameTag.style.opacity = '';
    isVideoAwaitingGesture = false;
    pendingVideoPlayback = null;
    isVideoPlaying = false;
    setSkipButtonMode('skip');
    toggleVideoControlButtons(false);
    isInputBlocked = false;

    if (typeof window.setBottomScreenButtonsDisabled === 'function') {
        window.setBottomScreenButtonsDisabled(false);
    }

    if (typeof activeVideoCompleteCallback === 'function') {
        const callback = activeVideoCompleteCallback;
        activeVideoCompleteCallback = null;
        callback();
    }
}

function stopTopVideoSequence(callCallback = false) {
    if (!topVideo) return;

    clearActiveVideoScriptTimeouts();

    const callback = (callCallback && typeof activeVideoCompleteCallback === 'function')
        ? activeVideoCompleteCallback
        : null;
    activeVideoCompleteCallback = null;

    // Restore dialogue state first so any teardown events cannot re-block advancement.
    textboxContainer.style.opacity = '1';
    nameTag.style.opacity = '';

    isVideoAwaitingGesture = false;
    pendingVideoPlayback = null;
    isVideoPlaying = false;
    setSkipButtonMode('skip');
    toggleVideoControlButtons(false);
    isInputBlocked = false;

    if (typeof window.setBottomScreenButtonsDisabled === 'function') {
        window.setBottomScreenButtonsDisabled(false);
    }

    topVideo.pause();
    topVideo.removeAttribute('src');
    topVideo.classList.add('hidden');
    topVideo.load();

    if (callback) {
        callback();
    }
}

function playTopVideoSequence(videoKey, onComplete) {
    if (!topVideo) {
        console.warn('Top video element not found.');
        if (typeof onComplete === 'function') onComplete();
        return;
    }

    const videoData = videosDB[videoKey];
    if (!videoData || !videoData.file) {
        console.warn(`Video not found: ${videoKey}`);
        if (typeof onComplete === 'function') onComplete();
        return;
    }

    stopTopVideoSequence(false);
    activeVideoCompleteCallback = (typeof onComplete === 'function') ? onComplete : null;
    isVideoAwaitingGesture = false;
    pendingVideoPlayback = null;
    isVideoPlaying = true;
    setSkipButtonMode('skip');
    toggleVideoControlButtons(true);
    isInputBlocked = true;

    if (typeof window.setBottomScreenButtonsDisabled === 'function') {
        window.setBottomScreenButtonsDisabled(true);
    }

    const onEnded = () => {
        topVideo.removeEventListener('ended', onEnded);
        topVideo.removeEventListener('error', onEnded);
        finishVideoSequence();
    };

    topVideo.addEventListener('ended', onEnded, { once: true });
    topVideo.addEventListener('error', onEnded, { once: true });

    topVideo.src = videoData.file;
    topVideo.currentTime = 0;
    topVideo.classList.remove('hidden');

    // Hide textbox until the first caption fires
    textboxContainer.style.opacity = '0';
    nameTag.style.opacity = '0';

    const scriptEntries = extractVideoScriptEntries(videoData)
        .map((entry) => {
            if (!entry) return null;
            const parsedTimestamp = Number(entry.timestamp);
            if (!Number.isFinite(parsedTimestamp)) return null;
            return { ...entry, timestamp: parsedTimestamp };
        })
        .filter(Boolean)
        .sort((a, b) => a.timestamp - b.timestamp);

    let scriptScheduled = false;
    const scheduleVideoScript = () => {
        if (scriptScheduled) return;
        scriptScheduled = true;

        scriptEntries.forEach((entry) => {
            const timeoutId = setTimeout(() => {
                renderVideoScriptLine(entry);
            }, Math.max(0, entry.timestamp));
            activeVideoScriptTimeouts.push(timeoutId);
        });
    };

    const onPlaying = () => {
        scheduleVideoScript();
    };

    topVideo.addEventListener('playing', onPlaying, { once: true });

    const startPlayback = () => {
        topVideo.play().catch((error) => {
            console.warn('Video play failed:', error);

            // Mobile browsers can block autoplay with audio until a user gesture.
            // Keep the sequence paused and let the user tap Play to resume.
            isVideoAwaitingGesture = true;
            pendingVideoPlayback = startPlayback;
            setSkipButtonMode('play');
        });
    };

    // Wait until the video is ready before attempting playback
    if (topVideo.readyState >= 3) {
        startPlayback();
    } else {
        topVideo.addEventListener('canplay', startPlayback, { once: true });
        topVideo.load();
    }
}

window.playTopVideoSequence = playTopVideoSequence;
window.stopTopVideoSequence = stopTopVideoSequence;
window.stopAllSceneAudio = stopAllSceneAudio;
window.playSoundByPath = playSoundByPath;
window.warmSceneSfxCache = warmSceneSfxCache;

// Skip video button event listener
if (skipVideoBtn) {
    skipVideoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isVideoAwaitingGesture && typeof pendingVideoPlayback === 'function') {
            isVideoAwaitingGesture = false;
            setSkipButtonMode('skip');
            const resumePlayback = pendingVideoPlayback;
            pendingVideoPlayback = null;
            resumePlayback();
            return;
        }

        if (isVideoPlaying) {
            stopTopVideoSequence(true);
        }
    });
}

function setSpriteState(state) {
    // Delegate to courtroom module if active
    if (isCourtMode && window._courtroomSetSpriteState) {
        window._courtroomSetSpriteState(state);
        return;
    }

    if (!currentCharacterName || !currentAnimationKey) return;

    const charData = characters[currentCharacterName];
    if (!charData) return;

    const animData = charData[currentAnimationKey];
    if (!animData) return;

    let spriteUrl = "";

    if (state === 'talking' && animData.talking) {
        spriteUrl = animData.talking;
    } else {
        // Fallback to default, then talking, then empty
        spriteUrl = animData.default || animData.talking || "";
    }

    if (spriteUrl) {
        character.src = spriteUrl;
    }
}

function changeBackground(bgName) {
    const bgData = backgrounds[bgName];
    if (!bgData) {
        console.warn(`Background not found: ${bgName}`);
        return;
    }
    
    // Check if background is a positioned background (object with path/background and positions)
    const bgUrl = bgData.path || bgData.background;
    if (typeof bgData === 'object' && bgUrl) {
        backgroundElement.style.backgroundImage = `url('${bgUrl}')`;
        backgroundElement.style.opacity = '1';
        currentBackgroundKey = bgName;
        
        // Apply integrated foreground if specified
        if (bgData.foreground) {
            foregroundElement.style.backgroundImage = `url('${bgData.foreground}')`;
            foregroundElement.style.opacity = '1';
            currentForegroundKey = bgName + "_fg";
        }
        
        // Apply default position if available
        if (bgData.positions && bgData.positions.default) {
            const defaultPos = bgData.positions.default;
            const position = bgData.positions[defaultPos];
            if (position && Array.isArray(position)) {
                moveBackgroundToPosition(position[0], position[1]);
            }
        } else {
            // Reset position if no default
            resetBackgroundPosition();
        }
    } else if (typeof bgData === 'string') {
        // Simple string background path
        backgroundElement.style.backgroundImage = `url('${bgData}')`;
        backgroundElement.style.opacity = '1';
        currentBackgroundKey = bgName;
        resetBackgroundPosition();
    }
}

let currentBackgroundPosition = null;

function resetBackgroundPosition() {
    if (backgroundElement) {
        backgroundElement.style.backgroundPosition = '0cqw 0cqh';
    }
    currentBackgroundPosition = null;
}

function applyCurrentBackgroundPosition(duration = 0) {
    if (!backgroundElement || !currentBackgroundPosition) return;

    const x = `${currentBackgroundPosition.x}cqw`;
    const y = `${currentBackgroundPosition.y}cqh`;

    if (duration > 0) {
        backgroundElement.style.transition = `background-position ${duration}ms ease-in-out`;
        backgroundElement.style.backgroundPosition = `${x} ${y}`;
        setTimeout(() => { backgroundElement.style.transition = ''; }, duration);
        return;
    }

    backgroundElement.style.transition = 'none';
    backgroundElement.style.backgroundPosition = `${x} ${y}`;
    requestAnimationFrame(() => { backgroundElement.style.transition = ''; });
}

window.snapBackgroundToPositionInstant = function() {
    applyCurrentBackgroundPosition(0);
};

function moveBackgroundToPosition(x, y, duration = 400) {
    if (!backgroundElement) {
        return;
    }

    currentBackgroundPosition = { x, y };
    applyCurrentBackgroundPosition(duration);
}

function moveBackgroundByName(bgName, positionName, duration = 400) {
    const bgData = backgrounds[bgName];
    if (!bgData || typeof bgData !== 'object' || !bgData.positions) return;
    
    const position = bgData.positions[positionName];
    if (position && Array.isArray(position)) {
        moveBackgroundToPosition(position[0], position[1], duration);
    }
}

function getMediaSnapshot() {
    return {
        backgroundPosition: currentBackgroundPosition
            ? { x: currentBackgroundPosition.x || 0, y: currentBackgroundPosition.y || 0 }
            : null,
        bgmCurrentTime: (currentBGM && Number.isFinite(currentBGM.currentTime)) ? currentBGM.currentTime : 0,
        bgmWasPlaying: !!(currentBGM && !currentBGM.paused)
    };
}

function restoreMediaSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return;

    if (snapshot.backgroundPosition
        && typeof snapshot.backgroundPosition.x === 'number'
        && typeof snapshot.backgroundPosition.y === 'number') {
        moveBackgroundToPosition(snapshot.backgroundPosition.x, snapshot.backgroundPosition.y, 0);
        if (typeof window.snapCourtPanInstant === 'function') {
            window.snapCourtPanInstant();
        }
    }

    if (currentBGM
        && typeof snapshot.bgmCurrentTime === 'number'
        && Number.isFinite(snapshot.bgmCurrentTime)
        && snapshot.bgmCurrentTime > 0) {
        try {
            currentBGM.currentTime = snapshot.bgmCurrentTime;
        } catch (error) {
            console.warn('Could not restore BGM playback position:', error);
        }
    }
}

window.moveBackgroundToPosition = moveBackgroundToPosition;
window.moveBackgroundByName = moveBackgroundByName;
window.applyCurrentBackgroundPosition = applyCurrentBackgroundPosition;
window.getMediaSnapshot = getMediaSnapshot;
window.restoreMediaSnapshot = restoreMediaSnapshot;

function changeForeground(fgName) {
    if (!fgName) {
        foregroundElement.style.backgroundImage = 'none';
        currentForegroundKey = "";
        return;
    }
    const fgUrl = foregrounds[fgName];
    if (fgUrl) {
        foregroundElement.style.backgroundImage = `url('${fgUrl}')`;
        foregroundElement.style.opacity = '1';
        currentForegroundKey = fgName;
    } else {
        // Fallback to clear if not found? Or keep previous?
        // Best to clear if explicitly asked but not found to avoid ghost images
        foregroundElement.style.backgroundImage = 'none';
        currentForegroundKey = "";
    }
}

function fadeOutElement(element, duration = 400) {
    if (!element) return;
    const ms = Number.isFinite(duration) ? duration : 400;
    element.style.transition = `opacity ${ms}ms ease-in-out`;
    element.style.opacity = '0';
}

function fadeInElement(element, duration = 400) {
    if (!element) return;
    const ms = Number.isFinite(duration) ? duration : 400;
    
    // Force target to 0 before fading in
    element.style.transition = 'none';
    element.style.opacity = '0';
    void element.offsetWidth;
    
    element.style.transition = `opacity ${ms}ms ease-in-out`;
    element.style.opacity = '1';
}

function fadeBackground(bgName, duration = 400) {
    const ms = Number.isFinite(duration) ? duration : 400;
    fadeOutElement(backgroundElement, ms);
    setTimeout(() => {
        changeBackground(bgName);
        fadeInElement(backgroundElement, ms);
    }, ms);
}

function fadeForeground(fgName, duration = 400) {
    const ms = Number.isFinite(duration) ? duration : 400;
    fadeOutElement(foregroundElement, ms);
    setTimeout(() => {
        changeForeground(fgName);
        fadeInElement(foregroundElement, ms);
    }, ms);
}

window.fadeOutBackground = (duration = 400) => {
    fadeOutElement(backgroundElement, duration);
    fadeOutElement(foregroundElement, duration);
};
window.fadeInBackground = (duration = 400) => {
    fadeInElement(backgroundElement, duration);
    fadeInElement(foregroundElement, duration);
};
window.fadeBackground = fadeBackground;

window.fadeOutForeground = (duration = 400) => fadeOutElement(foregroundElement, duration);
window.fadeInForeground = (duration = 400) => fadeInElement(foregroundElement, duration);
window.fadeForeground = fadeForeground;

function changeSprite(charName, spriteKey) {
    // Delegate to courtroom module if active
    if (isCourtMode && window._courtroomChangeSprite) {
        window._courtroomChangeSprite(charName, spriteKey);
        return;
    }

    currentCharacterName = charName;
    currentAnimationKey = spriteKey;
    setSpriteState('default');
}
