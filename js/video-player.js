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

    textboxContainer.style.opacity = '1';

    if (typeof updateDialogue === 'function') {
        updateDialogue(line);
    }

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
        return;
    }

    skipVideoBtn.classList.add('hidden');
    autoplayIndicator.classList.remove('hidden');
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

function resetVideoSequenceState(callCallback = false) {
    clearActiveVideoScriptTimeouts();

    const callback = (callCallback && typeof activeVideoCompleteCallback === 'function')
        ? activeVideoCompleteCallback
        : null;
    activeVideoCompleteCallback = null;

    if (topVideo) {
        topVideo.pause();
        topVideo.removeAttribute('src');
        topVideo.classList.add('hidden');
        topVideo.load();
    }

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

    if (callback) {
        callback();
    }
}

function finishVideoSequence() {
    resetVideoSequenceState(true);
}

function stopTopVideoSequence(callCallback = false) {
    resetVideoSequenceState(callCallback);
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
            isVideoAwaitingGesture = true;
            pendingVideoPlayback = startPlayback;
            setSkipButtonMode('play');
        });
    };

    if (topVideo.readyState >= 3) {
        startPlayback();
    } else {
        topVideo.addEventListener('canplay', startPlayback, { once: true });
        topVideo.load();
    }
}

window.playTopVideoSequence = playTopVideoSequence;
window.stopTopVideoSequence = stopTopVideoSequence;

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
