
window.AnimationManager = (function() {
    let currentRunId = 0;
    let activeTimeouts = [];
    let imageBlobs = {};
    const persistentLayerIds = new Set();
    const animationDataCache = new Map();
    const inFlightAnimationData = new Map();
    const animationCssTextCache = new Map();
    const inFlightAnimationCss = new Map();
    const animationImageCache = new Map();
    const injectedAnimationStyles = new Set();
    const TRANSPARENT_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    function resetLayerElement(img) {
        if (!img) return;

        const isMainCharacterLayer = img.id === 'character';

        if (!isMainCharacterLayer) {
            img.src = TRANSPARENT_PIXEL;
        }

        img.className = 'layer';
        img.style.animation = '';
        img.style.animationDuration = '';
        img.style.animationDelay = '';
        img.style.filter = '';

        if (!isMainCharacterLayer) {
            img.style.opacity = '';
            img.style.left = '';
            img.style.top = '';
            img.style.transform = '';
        }

        delete img.dataset.runId;
    }

    function cleanup() {
        activeTimeouts.forEach(clearTimeout);
        activeTimeouts = [];

        persistentLayerIds.forEach(layerId => {
            resetLayerElement(document.getElementById(layerId));
        });

        resetLayerElement(character);

        // preloadImage() now returns shared cached object URLs from loader.js.
        // Dropping local references is enough here; revoking them per run breaks reuse.
        imageBlobs = {};
    }

    function ensureAnimationLayer(layerId, container) {
        let layer = document.getElementById(layerId);
        if (!layer) {
            layer = document.createElement('img');
            layer.id = layerId;
            layer.className = 'layer';
            layer.src = TRANSPARENT_PIXEL;
            container.appendChild(layer);
        }

        persistentLayerIds.add(layerId);
        return layer;
    }

    function loadAnimationData(animationName) {
        if (animationDataCache.has(animationName)) {
            return Promise.resolve(animationDataCache.get(animationName));
        }

        if (inFlightAnimationData.has(animationName)) {
            return inFlightAnimationData.get(animationName);
        }

        const animationJSONUrl = `assets/animations/${animationName}.json`;
        const request = fetch(animationJSONUrl)
            .then(response => {
                if (!response.ok) throw new Error(`Failed to load ${animationJSONUrl}`);
                return response.json();
            })
            .then(data => {
                animationDataCache.set(animationName, data);
                inFlightAnimationData.delete(animationName);
                return data;
            })
            .catch(error => {
                inFlightAnimationData.delete(animationName);
                throw error;
            });

        inFlightAnimationData.set(animationName, request);
        return request;
    }

    function loadAnimationCssText(animationCss) {
        if (!animationCss) {
            return Promise.resolve('');
        }

        if (!animationCss.toLowerCase().endsWith('.css')) {
            return Promise.resolve(animationCss);
        }

        const cssUrl = `assets/animations/${animationCss}`;
        if (animationCssTextCache.has(cssUrl)) {
            return Promise.resolve(animationCssTextCache.get(cssUrl));
        }

        if (inFlightAnimationCss.has(cssUrl)) {
            return inFlightAnimationCss.get(cssUrl);
        }

        const request = fetch(cssUrl)
            .then(response => {
                if (!response.ok) throw new Error(`Failed to load CSS ${cssUrl}`);
                return response.text();
            })
            .then(cssText => {
                animationCssTextCache.set(cssUrl, cssText);
                inFlightAnimationCss.delete(cssUrl);
                return cssText;
            })
            .catch(error => {
                inFlightAnimationCss.delete(cssUrl);
                throw error;
            });

        inFlightAnimationCss.set(cssUrl, request);
        return request;
    }

    async function ensureAnimationCssLoaded(animationCss) {
        if (!animationCss) {
            return;
        }

        const styleKey = animationCss.toLowerCase().endsWith('.css')
            ? `file:${animationCss}`
            : `inline:${animationCss}`;

        if (injectedAnimationStyles.has(styleKey)) {
            return;
        }

        const cssText = await loadAnimationCssText(animationCss);
        if (!cssText || injectedAnimationStyles.has(styleKey)) {
            return;
        }

        const styleSheet = document.createElement('style');
        styleSheet.dataset.animationStyle = styleKey;
        styleSheet.innerText = cssText;
        document.head.appendChild(styleSheet);
        injectedAnimationStyles.add(styleKey);
    }

    function warmAnimationImages(animationName, data) {
        if (animationImageCache.has(animationName)) {
            return animationImageCache.get(animationName);
        }

        const request = (async () => {
            const warmedImages = {};
            const uniqueImages = new Set();

            if (data.timeline) {
                Object.values(data.timeline).forEach(events => {
                    const eventList = Array.isArray(events) ? events : [events];
                    eventList.forEach(event => {
                        if (event.image) {
                            uniqueImages.add(event.image);
                        }
                    });
                });
            }

            await Promise.all(Array.from(uniqueImages).map(async imageName => {
                const sourceUrl = imageName.startsWith('assets/') ? imageName : `assets/${imageName}`;
                warmedImages[imageName] = await preloadImage(sourceUrl);
            }));

            return warmedImages;
        })().catch(error => {
            animationImageCache.delete(animationName);
            throw error;
        });

        animationImageCache.set(animationName, request);
        return request;
    }

    function play(animationName) {
        return new Promise((resolve) => {
            cleanup();

            currentRunId++;
            const myRunId = currentRunId;

            const container = gameContainer;
            if (!container) {
                console.error('Game container not found');
                resolve();
                return;
            }

            const applyEvent = (config) => {
                if (myRunId !== currentRunId) return;

                if (config.sound) {
                    const soundSrc = config.sound;
                    if (soundSrc.includes('/')) {
                        const resolvedSoundSrc = (typeof window.resolveMediaAssetPath === 'function')
                            ? window.resolveMediaAssetPath(soundSrc)
                            : (soundSrc.startsWith('assets/') ? soundSrc : `assets/${soundSrc}`);
                        if (window.playSoundByPath) {
                            window.playSoundByPath(resolvedSoundSrc);
                        } else {
                            const audio = new Audio(resolvedSoundSrc);
                            audio.play().catch(e => console.warn('Animation SFX failed:', e));
                        }
                    } else if (window.playSound) {
                        window.playSound(soundSrc);
                    }
                }

                if (!config.targetId) return;

                const img = document.getElementById(config.targetId);
                if (!img) {
                    console.warn(`Target ID ${config.targetId} not found`);
                    return;
                }

                const runId = Math.random();
                img.dataset.runId = runId;

                let url = '';
                if (config.image) {
                    url = imageBlobs[config.image]
                        || (config.image.startsWith('assets/') ? config.image : `assets/${config.image}`);
                }

                if (url) {
                    img.src = url;
                }

                if (config.class) {
                    img.className = `layer ${config.class}`;
                    if (config.duration) {
                        img.style.animationDuration = `${config.duration}ms`;
                        img.style.animationDelay = '0s';

                        const cleanupTimeout = setTimeout(() => {
                            if (myRunId !== currentRunId) return;
                            if (img.dataset.runId == runId) {
                                resetLayerElement(img);
                            }
                        }, config.duration + 20);
                        activeTimeouts.push(cleanupTimeout);
                    }
                } else {
                    resetLayerElement(img);
                    if (url) {
                        img.src = url;
                    }
                }
            };

            loadAnimationData(animationName)
                .then(data => {
                    if (myRunId !== currentRunId) {
                        resolve();
                        return null;
                    }

                    if (Array.isArray(data.layers)) {
                        data.layers.forEach(layerId => ensureAnimationLayer(layerId, container));
                    }

                    return Promise.all([
                        ensureAnimationCssLoaded(data.animationCss),
                        warmAnimationImages(animationName, data)
                    ]).then(([, warmedImages]) => {
                        imageBlobs = warmedImages || {};
                        return data;
                    });
                })
                .then(data => {
                    if (!data || myRunId !== currentRunId) {
                        if (!data) return;
                        resolve();
                        return;
                    }

                    let maxDuration = 0;
                    const timeline = data.timeline || {};

                    Object.keys(timeline).forEach(startTimeStr => {
                        const startTime = parseInt(startTimeStr, 10) || 0;
                        let events = timeline[startTimeStr];
                        if (!Array.isArray(events)) events = [events];

                        events.forEach(event => {
                            const duration = event.duration || 0;
                            if ((startTime + duration) > maxDuration) {
                                maxDuration = startTime + duration;
                            }

                            const timeoutId = setTimeout(() => {
                                applyEvent(event);
                            }, startTime);
                            activeTimeouts.push(timeoutId);
                        });
                    });

                    const endTimeout = setTimeout(() => {
                        resolve();
                    }, maxDuration + 50);
                    activeTimeouts.push(endTimeout);
                })
                .catch(err => {
                    console.error('Animation Error:', err);
                    cleanup();
                    resolve();
                });
        });
    }

    return { play, cleanup };
})();
