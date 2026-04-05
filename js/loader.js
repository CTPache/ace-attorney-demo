console.log("Loader Loaded");

const preloadedImageUrlCache = new Map();
const inFlightImagePreloads = new Map();
let deferredSceneWarmupId = 0;

function isPreloadableImageUrl(url) {
    return !!(
        typeof url === 'string'
        && url.length > 0
        && !url.startsWith('blob:')
        && !url.startsWith('data:')
    );
}

async function preloadImage(url) {
    if (!isPreloadableImageUrl(url)) {
        return url;
    }

    if (preloadedImageUrlCache.has(url)) {
        return preloadedImageUrlCache.get(url);
    }

    if (inFlightImagePreloads.has(url)) {
        return inFlightImagePreloads.get(url);
    }

    const request = fetch(url)
        .then(async (response) => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            preloadedImageUrlCache.set(url, objectUrl);
            inFlightImagePreloads.delete(url);
            return objectUrl;
        })
        .catch((error) => {
            inFlightImagePreloads.delete(url);
            console.warn("Failed to preload image:", url, error);
            return url;
        });

    inFlightImagePreloads.set(url, request);
    return request;
}

function pushPreloadTask(taskFns, sourceUrl, applyPreloadedUrl) {
    if (!isPreloadableImageUrl(sourceUrl) || typeof applyPreloadedUrl !== 'function') {
        return;
    }

    taskFns.push(async () => {
        const preloadedUrl = await preloadImage(sourceUrl);
        applyPreloadedUrl(preloadedUrl);
    });
}

function collectScenePreloadTasks({
    limit = Infinity,
    includeBackgrounds = true,
    includeForegrounds = true,
    includeCharacters = false
} = {}) {
    const taskFns = [];

    if (includeBackgrounds) {
        for (const key in backgrounds) {
            const bgData = backgrounds[key];
            if (typeof bgData === 'string') {
                pushPreloadTask(taskFns, bgData, (newUrl) => {
                    backgrounds[key] = newUrl;
                });
            } else if (bgData && typeof bgData === 'object') {
                const bgUrl = bgData.path || bgData.background;
                if (bgUrl) {
                    pushPreloadTask(taskFns, bgUrl, (newUrl) => {
                        if (bgData.path) bgData.path = newUrl;
                        if (bgData.background) bgData.background = newUrl;
                    });
                }

                if (bgData.foreground) {
                    pushPreloadTask(taskFns, bgData.foreground, (newUrl) => {
                        bgData.foreground = newUrl;
                    });
                }
            }
        }
    }

    if (includeForegrounds) {
        for (const key in foregrounds) {
            const url = foregrounds[key];
            pushPreloadTask(taskFns, url, (newUrl) => {
                foregrounds[key] = newUrl;
            });
        }
    }

    if (includeCharacters) {
        for (const charName in characters) {
            const charData = characters[charName];
            for (const emotion in charData) {
                const emotionData = charData[emotion];
                if (!emotionData || typeof emotionData !== 'object') continue;

                if (emotionData.default) {
                    pushPreloadTask(taskFns, emotionData.default, (newUrl) => {
                        emotionData.default = newUrl;
                    });
                }
                if (emotionData.talking) {
                    pushPreloadTask(taskFns, emotionData.talking, (newUrl) => {
                        emotionData.talking = newUrl;
                    });
                }
            }
        }
    }

    return Number.isFinite(limit) ? taskFns.slice(0, Math.max(0, limit)) : taskFns;
}

async function runPreloadTaskPool(taskFns, concurrency = 4) {
    if (!Array.isArray(taskFns) || taskFns.length === 0) {
        return;
    }

    const poolSize = Math.max(1, Math.min(concurrency, taskFns.length));
    let nextIndex = 0;

    await Promise.all(Array.from({ length: poolSize }, async () => {
        while (nextIndex < taskFns.length) {
            const currentTaskIndex = nextIndex++;
            await taskFns[currentTaskIndex]();
        }
    }));
}

async function preloadAssets(options = {}) {
    const {
        limit = Infinity,
        concurrency = 4,
        label = 'scene assets',
        blocking = true,
        includeBackgrounds = true,
        includeForegrounds = true,
        includeCharacters = false
    } = options;

    const taskFns = collectScenePreloadTasks({
        limit,
        includeBackgrounds,
        includeForegrounds,
        includeCharacters
    });
    if (taskFns.length === 0) {
        return Promise.resolve();
    }

    console.log(`Preloading ${label} (${taskFns.length} assets)...`);
    const runPromise = runPreloadTaskPool(taskFns, concurrency)
        .then(() => {
            console.log(`${label} preloaded.`);
        });

    if (blocking) {
        await runPromise;
    }

    return runPromise;
}

function scheduleDeferredSceneWarmup(options = {}) {
    const {
        concurrency = 2,
        timeout = 1500,
        includeBackgrounds = true,
        includeForegrounds = true,
        includeCharacters = false
    } = options;
    const runId = ++deferredSceneWarmupId;

    const startWarmup = () => {
        if (runId !== deferredSceneWarmupId) {
            return;
        }

        preloadAssets({
            limit: Infinity,
            concurrency,
            label: 'deferred scene warmup',
            blocking: false,
            includeBackgrounds,
            includeForegrounds,
            includeCharacters
        });
    };

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(startWarmup, { timeout });
    } else {
        setTimeout(startWarmup, 120);
    }
}

window.preloadAssets = preloadAssets;
window.scheduleDeferredSceneWarmup = scheduleDeferredSceneWarmup;
