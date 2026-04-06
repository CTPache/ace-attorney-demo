(function initializeMediaUtils(global) {
    function resolveMediaAssetPath(rawPath) {
        if (!rawPath || typeof rawPath !== 'string') {
            return null;
        }

        if (rawPath.startsWith('http://') || rawPath.startsWith('https://') || rawPath.startsWith('data:')) {
            return rawPath;
        }

        if (rawPath.startsWith('/') || rawPath.startsWith('assets/')) {
            return rawPath;
        }

        return `assets/${rawPath}`;
    }

    function createManagedAudio(rawPath, options = {}) {
        const resolvedPath = resolveMediaAssetPath(rawPath);
        if (!resolvedPath) {
            return null;
        }

        const {
            preload = 'auto',
            loop = false,
            volume
        } = options;

        const audio = new Audio(resolvedPath);
        audio.preload = preload;
        audio.loop = !!loop;

        if (typeof volume === 'number' && Number.isFinite(volume)) {
            audio.volume = Math.max(0, Math.min(1, volume));
        }

        if (preload !== 'none') {
            audio.load();
        }

        return audio;
    }

    function safeResetAndStopAudio(audio, options = {}) {
        if (!audio) return;

        const {
            resetTime = true,
            resetVolume = true,
            releaseSrc = false
        } = options;

        try {
            audio.pause();
        } catch (error) {
            console.warn('Failed to pause audio:', error);
        }

        if (resetTime) {
            try {
                audio.currentTime = 0;
            } catch (error) {
                console.warn('Failed to reset audio time:', error);
            }
        }

        if (resetVolume) {
            try {
                audio.volume = 1;
            } catch (error) {
                console.warn('Failed to reset audio volume:', error);
            }
        }

        if (releaseSrc) {
            try {
                audio.src = '';
            } catch (error) {
                console.warn('Failed to release audio source:', error);
            }
        }
    }

    global.resolveMediaAssetPath = resolveMediaAssetPath;
    global.createManagedAudio = createManagedAudio;
    global.safeResetAndStopAudio = safeResetAndStopAudio;
})(window);
