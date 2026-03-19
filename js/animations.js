
window.AnimationManager = (function() {
    let currentRunId = 0;
    let activeTimeouts = [];
    let currentStyleSheet = null;
    let createdLayers = [];
    let imageBlobs = {};
    const TRANSPARENT_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    function cleanup() {
        // Cleanup active timeouts
        activeTimeouts.forEach(clearTimeout);
        activeTimeouts = [];

        // Remove Stylesheet
        if (currentStyleSheet) {
            currentStyleSheet.remove();
            currentStyleSheet = null;
        }

        // Cleanup created layers
        createdLayers.forEach(layer => layer.remove());
        createdLayers = [];
        
        // Reset Character Element        if (character) {
            character.style.animation = '';
            character.className = 'layer'; 
            character.style.animationDuration = '';
            character.style.animationDelay = '';
            delete character.dataset.runId;
        }

        // Revoke Object URLs to free memory
        Object.values(imageBlobs).forEach(url => URL.revokeObjectURL(url));
        imageBlobs = {};
    }

    function play(animationName) {
        return new Promise((resolve) => {
            const animationJSONUrl = `assets/animations/${animationName}.json`;
            
            // Clean up previous state
            cleanup();

            currentRunId++;
            const myRunId = currentRunId;

            const container = gameContainer;
            if (!container) {
                console.error("Game container not found");
                resolve();
                return;
            }

            const applyEvent = (config) => {
                if (myRunId !== currentRunId) return;

                // Handle Sound
                if (config.sound) {
                    const soundSrc = config.sound;
                    if (soundSrc.includes('/')) {
                        const audio = new Audio(`assets/${soundSrc}`);
                        audio.play().catch(e => console.warn("Animation SFX failed:", e));
                    } else {
                        if (window.playSound) window.playSound(soundSrc);
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

                // Set Source
                let url = imageBlobs[config.image] || config.image; 
                // Fallback for non-blob (if logic changes) - although we preload everything now
                if (!url && config.image) url = `assets/${config.image}`;
                
                if (url) img.src = url;

                // Apply Classes & Animation
                if (config.class) {
                    img.className = `layer ${config.class}`;
                    if (config.duration) {
                        img.style.animationDuration = `${config.duration}ms`;
                        img.style.animationDelay = '0s';

                        const cleanupTimeout = setTimeout(() => {
                            if (myRunId !== currentRunId) return;
                            if (img.dataset.runId == runId) {
                                if (img.id !== 'character') {
                                    img.src = TRANSPARENT_PIXEL;
                                }
                                img.className = 'layer';
                                img.style.animationDuration = '';
                            }
                        }, config.duration + 20);
                        activeTimeouts.push(cleanupTimeout);
                    }
                } else {
                    img.className = 'layer';
                    img.style.animationDuration = '';
                    img.style.animationDelay = '';
                }
            };

            fetch(animationJSONUrl)
                .then(response => {
                    if (!response.ok) throw new Error(`Failed to load ${animationJSONUrl}`);
                    return response.json();
                })
                .then(data => {
                    if (myRunId !== currentRunId) return;

                    // Create Layers
                    if (data.layers) {
                        data.layers.forEach(layerId => {
                            let layer = document.getElementById(layerId);
                            if (!layer) {
                                layer = document.createElement('img');
                                layer.id = layerId;
                                layer.className = 'layer';
                                layer.src = TRANSPARENT_PIXEL;
                                container.appendChild(layer);
                                createdLayers.push(layer);
                            }
                        });
                    }

                    // Handle CSS
                    let cssPromise;
                    if (data.animationCss && data.animationCss.toLowerCase().endsWith('.css')) {
                         const cssUrl = `assets/animations/${data.animationCss}`;
                         cssPromise = fetch(cssUrl).then(res => {
                             if(!res.ok) throw new Error(`Failed to load CSS ${cssUrl}`);
                             return res.text();
                         });
                    } else {
                        cssPromise = Promise.resolve(data.animationCss || '');
                    }

                    return cssPromise.then(cssText => {
                        if (myRunId !== currentRunId) return;

                        if (cssText) {
                            const styleSheet = document.createElement("style");
                            styleSheet.innerText = cssText;
                            document.head.appendChild(styleSheet);
                            currentStyleSheet = styleSheet;
                        }

                        // Collect unique images
                        const uniqueImages = new Set();
                        if (data.timeline) {
                            Object.values(data.timeline).forEach(events => {
                                const eventList = Array.isArray(events) ? events : [events];
                                eventList.forEach(ev => {
                                    if (ev.image) uniqueImages.add(ev.image);
                                });
                            });
                        }

                        // Preload
                        const imagePromises = Array.from(uniqueImages).map(imageName => {
                             const url = `assets/${imageName}`;
                             return preloadImage(url).then(blobUrl => {
                                 imageBlobs[imageName] = blobUrl;
                             });
                        });

                        return Promise.all(imagePromises).then(() => data);
                    });
                })
                .then(data => {
                    if (myRunId !== currentRunId) return;

                    let maxDuration = 0;

                    // Execute Timeline
                    Object.keys(data.timeline).forEach(startTimeStr => {
                        const startTime = parseInt(startTimeStr);
                        let events = data.timeline[startTimeStr];
                        if (!Array.isArray(events)) events = [events];

                        events.forEach(event => {
                            const duration = event.duration || 0;
                            if ((startTime + duration) > maxDuration) {
                                maxDuration = startTime + duration;
                            }

                            const t = setTimeout(() => {
                                applyEvent(event);
                            }, startTime);
                            activeTimeouts.push(t);
                        });
                    });

                    // Finish
                    const endTimeout = setTimeout(() => {
                        resolve();
                    }, maxDuration + 50);
                    activeTimeouts.push(endTimeout);
                })
                .catch(err => {
                    console.error("Animation Error:", err);
                    cleanup(); // Ensure cleanup on error
                    resolve();
                });
        });
    }

    return { play, cleanup };
})();
