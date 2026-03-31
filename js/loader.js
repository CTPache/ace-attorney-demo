console.log("Loader Loaded");

async function preloadImage(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error("Failed to preload image:", url, error);
        return url; // Fallback to original URL
    }
}

async function preloadAssets() {
    console.log("Preloading assets...");
    const promises = [];

    // Preload Backgrounds
    for (const key in backgrounds) {
        const bgData = backgrounds[key];
        if (typeof bgData === 'string') {
            // Simple string background
            promises.push(preloadImage(bgData).then(newUrl => {
                backgrounds[key] = newUrl;
            }));
        } else if (typeof bgData === 'object') {
            // Positioned/Courtroom background objects
            const bgUrl = bgData.path || bgData.background;
            if (bgUrl) {
                promises.push(preloadImage(bgUrl).then(newUrl => {
                    if (bgData.path) bgData.path = newUrl;
                    if (bgData.background) bgData.background = newUrl;
                }));
            }
            if (bgData.foreground) {
                promises.push(preloadImage(bgData.foreground).then(newUrl => {
                    bgData.foreground = newUrl;
                }));
            }
        }
    }

    // Preload Foregrounds
    for (const key in foregrounds) {
        const url = foregrounds[key];
        promises.push(preloadImage(url).then(newUrl => {
            foregrounds[key] = newUrl;
        }));
    }

    // Preload Characters
    for (const charName in characters) {
        const charData = characters[charName];
        for (const emotion in charData) {
            const emotionData = charData[emotion];
            if (emotionData.default) {
                promises.push(preloadImage(emotionData.default).then(newUrl => {
                    emotionData.default = newUrl;
                }));
            }
            if (emotionData.talking) {
                promises.push(preloadImage(emotionData.talking).then(newUrl => {
                    emotionData.talking = newUrl;
                }));
            }
        }
    }

    await Promise.all(promises);
    console.log("Assets preloaded.");
}
