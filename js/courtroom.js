/**
 * courtroom.js — Courtroom scene view manager.
 * 
 * Manages the 6 courtroom views (overview, 3 stands, cocounsel, judge),
 * the panoramic multi-sprite system for stands, and speaking delegation.
 */
console.log("Courtroom Module Loaded");

(function () {
    // ── Internal State ──────────────────────────────────────────
    const STAND_SLOTS = ['defense', 'witness', 'prosecution'];
    const ALL_SLOTS = ['defense', 'witness', 'prosecution', 'judge', 'cocounsel', 'gallery'];

    let currentView = null;  // 'overview' | 'defense' | 'witness' | 'prosecution' | 'cocounsel' | 'judge'
    let activeSlot = null;   // Which slot is currently "speaking" for setSpriteState delegation

    // Per-slot tracking: character name + current emotion (animation key)
    let slotState = {};

    // Maps slot name → DOM element for panoramic sprites
    const standElements = {};
    // Maps slot name → DOM element for overview sprites
    const overviewElements = {};

    // Injected <style> tag for dynamic sprite positions
    let spritePositionStyleSheet = null;
    let singleViewSwapToken = 0;
    let activeCourtFadeElement = null;
    let activeCourtFadeTarget = null;

    function getOverviewSpriteKey(slotName) {
        const slot = String(slotName || '').toLowerCase();
        if (!slot) return '';
        return `${slot.charAt(0).toUpperCase()}${slot.slice(1)}_overview`;
    }

    function resolveSpriteEntryUrl(entry, state) {
        if (!entry) return '';
        if (typeof entry === 'string') return entry;
        if (typeof entry !== 'object') return '';

        if (state === 'talking' && typeof entry.talking === 'string') {
            return entry.talking;
        }

        if (typeof entry.default === 'string') {
            return entry.default;
        }

        if (typeof entry.talking === 'string') {
            return entry.talking;
        }

        return '';
    }

    function resolveCourtSpriteEntry(slotName, characterName, emotion, preferOverviewVariant = false) {
        const charData = characters[characterName];
        if (!charData) return null;

        if (preferOverviewVariant) {
            const overviewEntry = charData[getOverviewSpriteKey(slotName)];
            if (resolveSpriteEntryUrl(overviewEntry, 'default')) {
                return overviewEntry;
            }
        }

        return charData[emotion] || null;
    }

    function clearOverviewSpriteDisplay(element) {
        if (!element) return;

        element.style.left = '';
        element.style.right = '';
        element.style.top = '';
        element.style.bottom = '';
        element.style.transform = '';
        element.style.transformOrigin = '';
    }

    function applyOverviewSpriteDisplay(element, entry) {
        clearOverviewSpriteDisplay(element);

        if (!entry || typeof entry !== 'object' || !entry.display || typeof entry.display !== 'object') {
            return;
        }

        const { x, y, scale } = entry.display;

        if (typeof x === 'number' && isFinite(x)) {
            element.style.left = `${x}%`;
            element.style.right = 'auto';
        }

        if (typeof y === 'number' && isFinite(y)) {
            element.style.bottom = `${y}%`;
            element.style.top = 'auto';
        }

        if (typeof scale === 'number' && isFinite(scale) && scale > 0) {
            element.style.transform = `scale(${scale / 100})`;
            element.style.transformOrigin = 'center bottom';
        }
    }

    function resolveCourtSpriteUrl(slotName, characterName, emotion, state, preferOverviewVariant = false) {
        const entry = resolveCourtSpriteEntry(slotName, characterName, emotion, preferOverviewVariant);
        return resolveSpriteEntryUrl(entry, state);
    }

    // ── Dynamic Sprite Position Builder ─────────────────────────

    /**
     * Reads the CourtStands background positions from scene data and injects
     * a <style> tag that positions each stand sprite at -x cqw (inverse of
     * the background X offset, so sprite aligns with the visible viewport
     * when the background is panned to that position).
     *
     * Example: if defense bg pos is [0, 0]  → #sprite-defense { left: 0cqw }
     *          if witness bg pos is [-200, 0] → #sprite-witness { left: 200cqw }
     */
    function buildStandSpriteStyles(data) {
        // Remove any previous dynamic sheet
        if (spritePositionStyleSheet) {
            spritePositionStyleSheet.remove();
            spritePositionStyleSheet = null;
        }

        const standsConfig = data.views && data.views.stands;
        if (!standsConfig) return;

        // Resolve background key → positions object
        const bgKey = standsConfig.background;
        const bgData = backgrounds[bgKey];
        const positions = (bgData && typeof bgData === 'object' && bgData.positions)
            ? bgData.positions
            : null;

        if (!positions) return;

        // Build a slot → left-value map.
        // standsConfig.positions maps slotName → positionName (string key into bgData.positions)
        const slotPositionNames = standsConfig.positions || {};
        let css = '';

        STAND_SLOTS.forEach(slot => {
            const posName = slotPositionNames[slot];
            if (!posName) return;

            const pos = positions[posName];
            if (!Array.isArray(pos) || typeof pos[0] !== 'number') return;

            // Background X offset is negative when panning right.
            // Sprite left = -x so it sits at the correct viewport column.
            const leftCqw = -pos[0];
            css += `#sprite-${slot} { left: ${leftCqw}cqw; }\n`;
        });

        if (!css) return;

        spritePositionStyleSheet = document.createElement('style');
        spritePositionStyleSheet.id = 'courtroom-sprites-dynamic';
        spritePositionStyleSheet.textContent = css;
        document.head.appendChild(spritePositionStyleSheet);
    }

    // ── Initialization ──────────────────────────────────────────

    function initCourtroom(data) {
        if (!data || typeof data !== 'object') {
            cleanupCourtroom();
            return;
        }

        isCourtMode = true;
        courtroomDB = data;
        currentView = null;
        activeSlot = null;

        // Map DOM elements
        standElements.defense = spriteDefense;
        standElements.witness = spriteWitness;
        standElements.prosecution = spriteProsecution;

        overviewElements.defense = overviewDefense;
        overviewElements.prosecution = overviewProsecution;
        overviewElements.witness = overviewWitness;
        overviewElements.judge = overviewJudge;
        overviewElements.cocounsel = overviewCocounsel;
        overviewElements.gallery = overviewGallery;

        // Build dynamic sprite position styles from CourtStands data
        buildStandSpriteStyles(data);

        // Initialize slot state from scene JSON
        slotState = {};
        const slots = data.slots || {};
        ALL_SLOTS.forEach(slot => {
            slotState[slot] = {
                character: (slots[slot] && slots[slot].character) || null,
                emotion: null
            };
        });

        // Install sprite delegation hooks
        window._courtroomChangeSprite = null;
        window._courtroomSetSpriteState = null;

        // Reset all sprite elements
        resetAllSpriteElements();
    }

    function cleanupCourtroom() {
        isCourtMode = false;
        currentView = null;
        activeSlot = null;
        slotState = {};

        // Remove delegation hooks
        window._courtroomChangeSprite = null;
        window._courtroomSetSpriteState = null;

        // Remove dynamic sprite position style sheet
        if (spritePositionStyleSheet) {
            spritePositionStyleSheet.remove();
            spritePositionStyleSheet = null;
        }

        // Hide courtroom layers
        if (courtroomSprites) courtroomSprites.classList.add('hidden');
        if (courtroomOverviewSprites) courtroomOverviewSprites.classList.add('hidden');
        if (gameContainer) gameContainer.classList.remove('court-mode-fg');

        // Reset sprite elements
        resetAllSpriteElements();
    }

    function resetAllSpriteElements() {
        const allEls = [
            spriteDefense, spriteWitness, spriteProsecution,
            overviewDefense, overviewProsecution, overviewWitness,
            overviewJudge, overviewCocounsel, overviewGallery
        ];
        allEls.forEach(el => {
            if (el) {
                if (window.releasePreloadedImageUrl && el.__temporaryPreloadedUrl) {
                    window.releasePreloadedImageUrl(el.__temporaryPreloadedUrl);
                }
                el.__temporaryPreloadedUrl = null;
                el.__logicalSpriteSource = null;
                if (el.dataset) {
                    delete el.dataset.preloadRequestId;
                }

                el.style.opacity = '0';
                el.src = '/';
                if (el.classList.contains('overview-sprite')) {
                    clearOverviewSpriteDisplay(el);
                }
            }
        });

        if (courtroomSprites) {
            courtroomSprites.style.transform = '';
            courtroomSprites.style.transition = 'transform 0ms ease-in-out';
        }
    }

    // ── View Switching ──────────────────────────────────────────

    function getCurrentCourtLayerOpacity() {
        if (currentView === 'overview' && courtroomOverviewSprites) {
            return getComputedStyle(courtroomOverviewSprites).opacity || '1';
        }

        if (STAND_SLOTS.includes(currentView) && courtroomSprites) {
            return getComputedStyle(courtroomSprites).opacity || '1';
        }

        if (character) {
            return getComputedStyle(character).opacity || '1';
        }

        return '1';
    }

    function setCourtView(viewName, options = {}) {
        if (!isCourtMode) return;

        const view = String(viewName).toLowerCase();
        const preservedLayerOpacity = getCurrentCourtLayerOpacity();
        const { preserveBackground = false } = options || {};
        currentView = view;

        // Determine which layer sets are visible
        const isStandView = STAND_SLOTS.includes(view);
        const isOverview = (view === 'overview');

        // Hide/show courtroom sprite containers
        if (courtroomSprites) {
            courtroomSprites.classList.toggle('hidden', !isStandView);
        }
        if (courtroomOverviewSprites) {
            courtroomOverviewSprites.classList.toggle('hidden', !isOverview);
        }

        // Hide/show regular character element
        if (isStandView || isOverview) {
            // Stand/overview views use courtroom sprites, hide regular character
            character.style.transition = 'none';
            character.style.opacity = '0';
            void character.offsetWidth;
            character.style.transition = '';
            characterIsVisible = false;
        }

        // Change background based on view
        if (isStandView) {
            activateStandView(view, preservedLayerOpacity, { preserveBackground });
        } else if (isOverview) {
            activateOverviewView(preservedLayerOpacity, { preserveBackground });
        } else if (view === 'cocounsel' || view === 'judge' || view === 'gallery') {
            activateSingleCharView(view, preservedLayerOpacity, { preserveBackground });
        }
    }

    function activateStandView(standName, preservedLayerOpacity = '1', options = {}) {
        const { preserveBackground = false } = options || {};
        activeSlot = String(standName).toLowerCase();

        if (courtroomSprites) courtroomSprites.style.opacity = preservedLayerOpacity;

        // Enable panoramic foreground mode
        if (gameContainer) gameContainer.classList.add('court-mode-fg');

        // Set background to the stands panoramic unless the same line will
        // immediately switch to a custom BG/CG via `{bg:...}` or `{fadeBg:...}`.
        const standsConfig = courtroomDB.views && courtroomDB.views.stands;
        if (!preserveBackground && standsConfig && standsConfig.background) {
            changeBackground(standsConfig.background, { preserveOpacity: true });
        }

        // Move to the correct position (instant)
        const posName = (standsConfig && standsConfig.positions && standsConfig.positions[standName])
            ? standsConfig.positions[standName]
            : standName;
        if (window.moveBackgroundByName && currentBackgroundKey) {
            window.moveBackgroundByName(currentBackgroundKey, posName, 0);
        }

        // Sync sprite container position
        syncSpritesToBackground(0);

        // Apply all stand slot sprites to their elements, and restart the
        // active stand now that it is the one being shown on screen.
        STAND_SLOTS.forEach(slot => {
            applySpriteToElement(slot, standElements[slot], {
                restartAnimation: slot === standName,
                forceReload: slot === standName
            });
        });

        // Install delegation hooks for stand mode
        installStandHooks();
    }

    function activateOverviewView(preservedLayerOpacity = '1', options = {}) {
        const { preserveBackground = false } = options || {};
        if (courtroomOverviewSprites) courtroomOverviewSprites.style.opacity = preservedLayerOpacity;

        // Disable panoramic foreground mode
        if (gameContainer) gameContainer.classList.remove('court-mode-fg');
        if (typeof window.changeForeground === 'function') {
            window.changeForeground('');
        }

        const overviewConfig = courtroomDB.views && courtroomDB.views.overview;
        if (!preserveBackground && overviewConfig && overviewConfig.background) {
            changeBackground(overviewConfig.background, { preserveOpacity: true });
        }

        // Apply overview sprites
        ALL_SLOTS.forEach(slot => {
            if (overviewElements[slot]) {
                applySpriteToElement(slot, overviewElements[slot]);
            }
        });

        // Remove stand hooks (overview uses its own rendering)
        removeStandHooks();
    }

    function activateSingleCharView(viewName, preservedLayerOpacity = '1', options = {}) {
        const { preserveBackground = false } = options || {};
        activeSlot = String(viewName).toLowerCase();
        const swapToken = ++singleViewSwapToken;

        // Disable panoramic foreground mode
        if (gameContainer) gameContainer.classList.remove('court-mode-fg');

        // Remove foreground when changing to cocounsel, judge, or gallery views
        if (typeof window.changeForeground === 'function') {
            window.changeForeground('');
        }

        // Hide the shared layer first so previous-view sprites (e.g. Maya -> Judge)
        // are never shown on the new background during the switch.
        if (character) {
            character.style.transition = 'none';
            character.style.opacity = '0';
        }
        characterIsVisible = false;

        // cocounsel, judge, or gallery — use regular #character element
        const viewConfig = courtroomDB.views && courtroomDB.views[viewName];
        if (!preserveBackground && viewConfig && viewConfig.background) {
            changeBackground(viewConfig.background, { preserveOpacity: true });
        }

        // If the slot has a character & emotion, preload/set that sprite while hidden,
        // then reveal the layer only after the correct sprite is ready.
        const slot = slotState[viewName];
        if (slot && slot.character && slot.emotion) {
            const spriteUrl = resolveCourtSpriteUrl(viewName, slot.character, slot.emotion, 'default');
            if (spriteUrl) {
                currentCharacterName = slot.character;
                currentAnimationKey = slot.emotion;

                const revealSprite = () => {
                    if (swapToken !== singleViewSwapToken || currentView !== activeSlot) return;
                    if (!character) return;

                    const showCharacterLayer = () => {
                        if (swapToken !== singleViewSwapToken || currentView !== activeSlot) return;
                        if (!character) return;

                        const inlineOpacityRaw = String(character.style.opacity || '').trim();
                        const inlineOpacityValue = inlineOpacityRaw === '' ? NaN : parseFloat(inlineOpacityRaw);
                        const externalRevealStarted = Number.isFinite(inlineOpacityValue) && inlineOpacityValue > 0.01;

                        // If a later command (for example `{fadeInCharacter}`) has already
                        // started revealing the sprite, do not stomp that newer opacity state.
                        if (externalRevealStarted) {
                            const liveOpacity = parseFloat(getComputedStyle(character).opacity || inlineOpacityRaw);
                            characterIsVisible = liveOpacity > 0.01;
                            return;
                        }

                        character.style.transition = 'none';
                        character.style.opacity = preservedLayerOpacity;
                        void character.offsetWidth;
                        character.style.transition = '';
                        characterIsVisible = parseFloat(preservedLayerOpacity) > 0.01;
                    };

                    if (window.applyPreloadedImageToElement) {
                        window.applyPreloadedImageToElement(character, spriteUrl, {
                            restartAnimation: true,
                            forceReload: true
                        })
                            .catch(() => {
                                character.src = spriteUrl;
                            })
                            .finally(showCharacterLayer);
                    } else if (typeof preloadImage === 'function') {
                        preloadImage(spriteUrl)
                            .then((resolvedUrl) => {
                                if (swapToken !== singleViewSwapToken || currentView !== activeSlot) return;
                                character.src = resolvedUrl || spriteUrl;
                            })
                            .catch(() => {
                                if (swapToken !== singleViewSwapToken || currentView !== activeSlot) return;
                                character.src = spriteUrl;
                            })
                            .finally(showCharacterLayer);
                    } else {
                        character.src = spriteUrl;
                        showCharacterLayer();
                    }
                };

                revealSprite();
            }
        }

        // Remove stand hooks — regular sprite commands work on #character
        removeStandHooks();
    }

    // ── Panoramic Panning ───────────────────────────────────────

    function panToStand(standName, duration) {
        if (!isCourtMode) return;

        const dur = (typeof duration === 'number' && duration >= 0) ? duration : 400;
        const stand = String(standName).toLowerCase();

        currentView = stand;
        activeSlot = stand;

        // Stand pans should always use the courtroom sprite layers, never the regular #character layer.
        if (character) {
            character.style.transition = 'none';
            character.style.opacity = '0';
            void character.offsetWidth;
            character.style.transition = '';
        }
        characterIsVisible = false;

        // Ensure stand containers are visible
        if (courtroomSprites) courtroomSprites.classList.remove('hidden');
        if (courtroomOverviewSprites) courtroomOverviewSprites.classList.add('hidden');

        // Pan background
        const standsConfig = courtroomDB.views && courtroomDB.views.stands;
        const posName = (standsConfig && standsConfig.positions && standsConfig.positions[stand])
            ? standsConfig.positions[stand]
            : stand;
        if (window.moveBackgroundByName && currentBackgroundKey) {
            window.moveBackgroundByName(currentBackgroundKey, posName, dur);
        }

        // Sync sprite container
        syncSpritesToBackground(dur);

        // Restart the active stand sprite when panning onto it so the
        // animation begins from frame 1 when it becomes visible.
        if (standElements[stand]) {
            applySpriteToElement(stand, standElements[stand], {
                restartAnimation: true,
                forceReload: true
            });
        }

        // Install hooks
        installStandHooks();
    }

    function syncSpritesToBackground(duration) {
        if (!currentBackgroundPosition) return;

        const x = currentBackgroundPosition.x || 0;
        const dur = duration || 0;

        // Sync sprite container
        if (courtroomSprites) {
            if (dur > 0) {
                courtroomSprites.style.transition = `transform ${dur}ms ease-in-out`;
            } else {
                courtroomSprites.style.transition = 'transform 0ms ease-in-out';
            }

            courtroomSprites.style.transform = `translateX(${x}cqw)`;

            if (dur > 0) {
                setTimeout(() => {
                    courtroomSprites.style.transition = 'transform 0ms ease-in-out';
                }, dur);
            }
        }

        // Sync foreground — it uses background-position like the bg element
        if (foregroundElement) {
            const fgX = `${x}cqw`;
            const fgY = '0cqh';
            if (dur > 0) {
                foregroundElement.style.transition = `background-position ${dur}ms ease-in-out`;
                foregroundElement.style.backgroundPosition = `${fgX} ${fgY}`;
                setTimeout(() => { foregroundElement.style.transition = ''; }, dur);
            } else {
                foregroundElement.style.transition = 'none';
                foregroundElement.style.backgroundPosition = `${fgX} ${fgY}`;
                requestAnimationFrame(() => { foregroundElement.style.transition = ''; });
            }
        }
    }

    // ── Sprite Management ───────────────────────────────────────

    function setCourtSlotSprite(slotName, emotion) {
        const slot = String(slotName).toLowerCase();
        if (!slotState[slot]) return null;

        slotState[slot].emotion = emotion;
        activeSlot = slot;

        const spriteEntry = resolveCourtSpriteEntry(slot, slotState[slot].character, emotion, false);

        if (slotState[slot].character) {
            currentCharacterName = slotState[slot].character;
            currentAnimationKey = emotion;
        }

        // Apply to the appropriate element based on current view
        if (STAND_SLOTS.includes(slot) && standElements[slot]) {
            applySpriteToElement(slot, standElements[slot], {
                restartAnimation: true,
                forceReload: true
            });
        }
        if (overviewElements[slot] && currentView === 'overview') {
            applySpriteToElement(slot, overviewElements[slot], {
                restartAnimation: true,
                forceReload: true
            });
        }
        // For cocounsel/judge in their respective views, apply to #character
        if ((slot === 'cocounsel' || slot === 'judge') && currentView === slot) {
            const s = slotState[slot];
            if (s.character && s.emotion) {
                const preservedOpacity = character
                    ? (getComputedStyle(character).opacity || character.style.opacity || '1')
                    : '1';

                currentCharacterName = s.character;
                currentAnimationKey = s.emotion;
                setSpriteState('default', {
                    restartAnimation: true,
                    forceReload: true
                });

                if (character) {
                    character.style.opacity = preservedOpacity;
                    characterIsVisible = parseFloat(preservedOpacity) > 0.01;
                }
            }
        }

        // Install hooks if we're in a stand view
        if (STAND_SLOTS.includes(currentView)) {
            installStandHooks();
        }

        return spriteEntry;
    }

    function setCourtSlotCharacter(slotName, characterName) {
        const slot = String(slotName).toLowerCase();
        if (!slotState[slot]) return;

        slotState[slot].character = characterName;
        slotState[slot].emotion = null; // Reset emotion when character changes
    }

    function applySpriteToElement(slotName, element, options = {}) {
        if (!element) return;

        const {
            restartAnimation = false,
            forceReload = false
        } = options || {};

        const slot = slotState[slotName];
        if (!slot || !slot.character || !slot.emotion) {
            element.style.opacity = '0';
            if (element.classList.contains('overview-sprite')) {
                clearOverviewSpriteDisplay(element);
            }
            return;
        }

        const useOverviewVariant = currentView === 'overview' && element.classList.contains('overview-sprite');
        const spriteEntry = resolveCourtSpriteEntry(
            slotName,
            slot.character,
            slot.emotion,
            useOverviewVariant
        );

        const spriteUrl = resolveSpriteEntryUrl(spriteEntry, 'default');
        if (spriteUrl) {
            if (useOverviewVariant) {
                applyOverviewSpriteDisplay(element, spriteEntry);
            } else if (element.classList.contains('overview-sprite')) {
                clearOverviewSpriteDisplay(element);
            }

            if (window.applyPreloadedImageToElement) {
                window.applyPreloadedImageToElement(element, spriteUrl, {
                    restartAnimation,
                    forceReload
                }).catch(() => {
                    element.src = spriteUrl;
                });
            } else {
                element.src = spriteUrl;
            }
            element.style.opacity = '1';
        } else {
            element.style.opacity = '0';
            if (element.classList.contains('overview-sprite')) {
                clearOverviewSpriteDisplay(element);
            }
        }
    }

    // ── Sprite State Delegation (talking/default) ───────────────

    function installStandHooks() {
        window._courtroomChangeSprite = courtroomChangeSprite;
        window._courtroomSetSpriteState = courtroomSetSpriteState;
    }

    function removeStandHooks() {
        window._courtroomChangeSprite = null;
        window._courtroomSetSpriteState = null;
    }

    function courtroomChangeSprite(charName, spriteKey, options = {}) {
        if (!activeSlot || !slotState[activeSlot]) return;

        slotState[activeSlot].character = charName;
        slotState[activeSlot].emotion = spriteKey;

        // Update the element
        if (STAND_SLOTS.includes(activeSlot) && standElements[activeSlot]) {
            applySpriteToElement(activeSlot, standElements[activeSlot], {
                restartAnimation: true,
                forceReload: true,
                ...options
            });
        }

        // Also set the global tracking for compatibility
        currentCharacterName = charName;
        currentAnimationKey = spriteKey;
    }

    function courtroomSetSpriteState(state, options = {}) {
        if (!activeSlot || !slotState[activeSlot]) return;

        const slot = slotState[activeSlot];
        if (!slot.character || !slot.emotion) return;

        const spriteUrl = resolveCourtSpriteUrl(
            activeSlot,
            slot.character,
            slot.emotion,
            state,
            currentView === 'overview'
        );

        if (!spriteUrl) return;

        // Determine target element
        let element = null;
        if (STAND_SLOTS.includes(activeSlot) && standElements[activeSlot]) {
            element = standElements[activeSlot];
        } else if (currentView === 'overview' && overviewElements[activeSlot]) {
            element = overviewElements[activeSlot];
        }

        if (element) {
            const {
                restartAnimation = false,
                forceReload = false
            } = options || {};

            if (window.applyPreloadedImageToElement) {
                window.applyPreloadedImageToElement(element, spriteUrl, {
                    restartAnimation,
                    forceReload
                }).catch(() => {
                    element.src = spriteUrl;
                });
            } else {
                element.src = spriteUrl;
            }
        }
    }

    function fadeCurrentCourtSpriteContainer(duration, isFadeIn) {
        if (!isCourtMode) return false;
        
        const dur = isFinite(duration) ? duration : 1000;
        const opacity = isFadeIn ? '1' : '0';
        const transition = `opacity ${dur}ms ease-in-out`;

        if (STAND_SLOTS.includes(currentView)) {
            if (courtroomSprites) {
                activeCourtFadeElement = courtroomSprites;
                activeCourtFadeTarget = opacity;
                if (isFadeIn) {
                    courtroomSprites.style.transition = 'none';
                    courtroomSprites.style.opacity = '0';
                    void courtroomSprites.offsetWidth;
                }
                courtroomSprites.style.transition = transition;
                courtroomSprites.style.opacity = opacity;
            }
            return true;
        } else if (currentView === 'overview') {
            if (courtroomOverviewSprites) {
                activeCourtFadeElement = courtroomOverviewSprites;
                activeCourtFadeTarget = opacity;
                if (isFadeIn) {
                    courtroomOverviewSprites.style.transition = 'none';
                    courtroomOverviewSprites.style.opacity = '0';
                    void courtroomOverviewSprites.offsetWidth;
                }
                courtroomOverviewSprites.style.transition = transition;
                courtroomOverviewSprites.style.opacity = opacity;
            }
            return true;
        }
        
        // Return false for judge/cocounsel/gallery so text-renderer falls back to #character
        return false;
    }

    function setCurrentCourtSpriteContainerVisibility(isVisible) {
        if (!isCourtMode) return false;

        const opacity = isVisible ? '1' : '0';

        if (STAND_SLOTS.includes(currentView)) {
            if (!courtroomSprites) return false;
            courtroomSprites.style.transition = 'none';
            courtroomSprites.style.opacity = opacity;
            void courtroomSprites.offsetWidth;
            courtroomSprites.style.transition = '';
            activeCourtFadeElement = null;
            activeCourtFadeTarget = null;
            return true;
        }

        if (currentView === 'overview') {
            if (!courtroomOverviewSprites) return false;
            courtroomOverviewSprites.style.transition = 'none';
            courtroomOverviewSprites.style.opacity = opacity;
            void courtroomOverviewSprites.offsetWidth;
            courtroomOverviewSprites.style.transition = '';
            activeCourtFadeElement = null;
            activeCourtFadeTarget = null;
            return true;
        }

        return false;
    }

    function completeActiveCourtroomFadeInstant() {
        if (!activeCourtFadeElement || activeCourtFadeTarget === null) return;

        activeCourtFadeElement.style.transition = 'none';
        activeCourtFadeElement.style.opacity = activeCourtFadeTarget;
        void activeCourtFadeElement.offsetWidth;
        activeCourtFadeElement.style.transition = '';

        activeCourtFadeElement = null;
        activeCourtFadeTarget = null;
    }

    function buildSnapshot() {
        const hasActiveCourtView = !!(isCourtMode && currentView);

        return {
            isActive: hasActiveCourtView,
            currentView: hasActiveCourtView ? currentView : null,
            activeSlot: hasActiveCourtView ? (activeSlot || currentView || null) : null,
            slotState: JSON.parse(JSON.stringify(slotState || {}))
        };
    }

    function restoreSnapshot(snapshot, options = {}) {
        if (!snapshot || !snapshot.isActive) {
            return false;
        }

        const { applyView = true } = options || {};
        const savedView = typeof snapshot.currentView === 'string'
            ? snapshot.currentView.trim().toLowerCase()
            : '';

        if (!savedView) {
            return false;
        }

        if (!isCourtMode) {
            const hasCourtroomData = courtroomDB && typeof courtroomDB === 'object' && Object.keys(courtroomDB).length > 0;
            if (hasCourtroomData) {
                initCourtroom(courtroomDB);
            }
        }

        if (!isCourtMode) {
            return false;
        }

        const restoredSlotState = {};
        ALL_SLOTS.forEach((slot) => {
            const savedSlot = snapshot.slotState && snapshot.slotState[slot]
                ? snapshot.slotState[slot]
                : {};

            restoredSlotState[slot] = {
                character: savedSlot.character || null,
                emotion: savedSlot.emotion || null
            };
        });

        slotState = restoredSlotState;

        const targetView = savedView;
        activeSlot = snapshot.activeSlot || targetView || null;

        if (!applyView) {
            return true;
        }

        setCourtView(targetView);

        if (targetView === 'overview') {
            ALL_SLOTS.forEach((slot) => {
                if (overviewElements[slot]) {
                    applySpriteToElement(slot, overviewElements[slot]);
                }
            });
        } else if (STAND_SLOTS.includes(targetView)) {
            STAND_SLOTS.forEach((slot) => {
                if (standElements[slot]) {
                    applySpriteToElement(slot, standElements[slot]);
                }
            });
            syncSpritesToBackground(0);
        }

        return true;
    }

    // ── Expose API ──────────────────────────────────────────────

    window.initCourtroom = initCourtroom;
    window.cleanupCourtroom = cleanupCourtroom;
    window.setCourtView = setCourtView;
    window.panToStand = panToStand;
    window.setCourtSlotSprite = setCourtSlotSprite;
    window.setCourtSlotCharacter = setCourtSlotCharacter;
    window.fadeCurrentCourtSpriteContainer = fadeCurrentCourtSpriteContainer;
    window.setCurrentCourtSpriteContainerVisibility = setCurrentCourtSpriteContainerVisibility;
    window.completeActiveCourtroomFadeInstant = completeActiveCourtroomFadeInstant;
    window.getCurrentCourtView = () => currentView;
    window.getActiveCourtSlot = () => activeSlot;
    window.getCourtroomSnapshot = buildSnapshot;
    window.restoreCourtroomSnapshot = restoreSnapshot;
    window.snapCourtPanInstant = () => syncSpritesToBackground(0);

})();
