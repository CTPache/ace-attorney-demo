
// Audio
const blipSounds = {
    1: new Audio('assets/audio/blip_1.ogg'),
    2: new Audio('assets/audio/blip_2.ogg'),
    3: new Audio('assets/audio/typewriter.ogg')
};
const activeSFX = new Set();

function playBlip() {
    if (currentBlipType === 4) return; // Silence

    const audio = blipSounds[currentBlipType];
    if (audio) {
        if (!audio.paused) return;
        audio.currentTime = 0;
        audio.play().catch(e => console.warn("Audio play failed:", e));
    }
}

function playSound(soundName) {
    const soundPath = soundsDB[soundName];
    if (soundPath) {
        const audio = new Audio(soundPath);
        activeSFX.add(audio);
        const cleanup = () => activeSFX.delete(audio);
        audio.addEventListener('ended', cleanup, { once: true });
        audio.addEventListener('error', cleanup, { once: true });
        audio.play().catch(e => console.warn("SFX play failed:", e));
    } else {
        console.warn(`Sound not found: ${soundName}`);
    }
}

function playBGM(musicName, fadeIn = false) {
    const musicPath = musicDB[musicName];
    if (musicPath) {
        // Stop current BGM if playing
        stopBGM(false);
        currentBGMKey = musicName;

        if (Array.isArray(musicPath)) {
            const introPath = musicPath[0];
            const loopPath = musicPath[1];
            
            currentBGM = new Audio(introPath);
            currentBGM.loop = false;
            if (fadeIn) currentBGM.volume = 0;
            
            // Preload loop portion to minimize gap
            const loopAudio = new Audio(loopPath);
            loopAudio.loop = true;
            loopAudio.preload = 'auto';

            currentBGM.addEventListener('ended', function() {
                // If BGM was stopped or changed before intro could finish, abort
                if (currentBGM !== this) return;
                
                currentBGM = loopAudio;
                currentBGM.play().catch(e => console.warn("BGM loop play failed:", e));
            });

            currentBGM.play().then(() => {
                if (fadeIn) {
                    const fadeInterval = setInterval(() => {
                        if (currentBGM && currentBGM.volume < 0.95) {
                            currentBGM.volume += 0.05;
                        } else {
                            if (currentBGM) currentBGM.volume = 1;
                            clearInterval(fadeInterval);
                        }
                    }, 100);
                }
            }).catch(e => console.warn("BGM play failed:", e));
        } else {
            currentBGM = new Audio(musicPath);
            currentBGM.loop = true;
            if (fadeIn) currentBGM.volume = 0;
            currentBGM.play().then(() => {
                if (fadeIn) {
                    const fadeInterval = setInterval(() => {
                        if (currentBGM && currentBGM.volume < 0.95) {
                            currentBGM.volume += 0.05;
                        } else {
                            if (currentBGM) currentBGM.volume = 1;
                            clearInterval(fadeInterval);
                        }
                    }, 100);
                }
            }).catch(e => console.warn("BGM play failed:", e));
        }
    } else {
        console.warn(`Music not found: ${musicName}`);
    }
}

function stopBGM(fadeOut = true) {
    if (currentBGM) {
        if (fadeOut) {
            const audio = currentBGM; // Capture reference
            const fadeInterval = setInterval(() => {
                if (audio.volume > 0.05) {
                    audio.volume -= 0.05;
                } else {
                    clearInterval(fadeInterval);
                    audio.pause();
                    audio.currentTime = 0;
                    audio.volume = 1; // Reset for next use if reused
                }
            }, 100);
            
            // If we start a new BGM immediately, we don't want to overwrite the fading one's reference
            // But since currentBGM is global, we set it to null so the engine knows "active" music is gone
            if (currentBGM === audio) {
                currentBGM = null;
                currentBGMKey = null;
            }
        } else {
            currentBGM.pause();
            currentBGM.currentTime = 0;
            currentBGM = null;
            currentBGMKey = null;
        }
    }
}

function stopAllSceneAudio() {
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

    Object.values(blipSounds).forEach((audio) => {
        try {
            audio.pause();
            audio.currentTime = 0;
        } catch (e) {
            console.warn('Failed to stop blip audio:', e);
        }
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
    topVideo.pause();
    topVideo.classList.add('hidden');

    isVideoAwaitingGesture = false;
    pendingVideoPlayback = null;
    isVideoPlaying = false;
    setSkipButtonMode('skip');
    toggleVideoControlButtons(false);

    if (typeof window.setBottomScreenButtonsDisabled === 'function') {
        window.setBottomScreenButtonsDisabled(false);
    }

    if (callCallback && typeof activeVideoCompleteCallback === 'function') {
        const callback = activeVideoCompleteCallback;
        activeVideoCompleteCallback = null;
        callback();
    } else {
        activeVideoCompleteCallback = null;
    }

    isInputBlocked = false;
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
    
    // Check if background is a positioned background (object with path and positions)
    if (typeof bgData === 'object' && bgData.path) {
        backgroundElement.style.backgroundImage = `url('${bgData.path}')`;
        backgroundElement.style.opacity = '1';
        currentBackgroundKey = bgName;
        
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

function resetBackgroundPosition() {
    if (backgroundElement) {
        backgroundElement.style.backgroundPosition = '0 0';
    }
}

function moveBackgroundToPosition(x, y, duration = 400) {
    if (backgroundElement) {
        // Enable smooth transition
        backgroundElement.style.transition = `background-position ${duration}ms ease-in-out`;
        backgroundElement.style.backgroundPosition = `${x}px ${y}px`;
        
        // Remove transition after animation completes to allow instant changes
        setTimeout(() => {
            backgroundElement.style.transition = '';
        }, duration);
    }
}

function moveBackgroundByName(bgName, positionName, duration = 400) {
    const bgData = backgrounds[bgName];
    if (!bgData || typeof bgData !== 'object' || !bgData.positions) return;
    
    const position = bgData.positions[positionName];
    if (position && Array.isArray(position)) {
        moveBackgroundToPosition(position[0], position[1], duration);
    }
}

window.moveBackgroundToPosition = moveBackgroundToPosition;
window.moveBackgroundByName = moveBackgroundByName;
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

window.fadeOutBackground = (duration = 400) => fadeOutElement(backgroundElement, duration);
window.fadeInBackground = (duration = 400) => fadeInElement(backgroundElement, duration);
window.fadeBackground = fadeBackground;

window.fadeOutForeground = (duration = 400) => fadeOutElement(foregroundElement, duration);
window.fadeInForeground = (duration = 400) => fadeInElement(foregroundElement, duration);
window.fadeForeground = fadeForeground;

function changeSprite(charName, spriteKey) {
    currentCharacterName = charName;
    currentAnimationKey = spriteKey;
    setSpriteState('default');
}
