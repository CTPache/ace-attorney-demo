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

    function setCourtView(viewName) {
        if (!isCourtMode) return;

        const view = String(viewName).toLowerCase();
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
            activateStandView(view);
        } else if (isOverview) {
            activateOverviewView();
        } else if (view === 'cocounsel' || view === 'judge' || view === 'gallery') {
            activateSingleCharView(view);
        }
    }

    function activateStandView(standName) {
        // Force the container to be visible after explicit fades
        if (courtroomSprites) courtroomSprites.style.opacity = '1';

        // Enable panoramic foreground mode
        if (gameContainer) gameContainer.classList.add('court-mode-fg');

        // Set background to the stands panoramic
        const standsConfig = courtroomDB.views && courtroomDB.views.stands;
        if (standsConfig && standsConfig.background) {
            changeBackground(standsConfig.background);
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

        // Apply all stand slot sprites to their elements
        STAND_SLOTS.forEach(slot => {
            applySpriteToElement(slot, standElements[slot]);
        });

        // Install delegation hooks for stand mode
        installStandHooks();
    }

    function activateOverviewView() {
        // Force the container to be visible after explicit fades
        if (courtroomOverviewSprites) courtroomOverviewSprites.style.opacity = '1';

        // Disable panoramic foreground mode
        if (gameContainer) gameContainer.classList.remove('court-mode-fg');
        if (typeof window.changeForeground === 'function') {
            window.changeForeground('');
        }

        const overviewConfig = courtroomDB.views && courtroomDB.views.overview;
        if (overviewConfig && overviewConfig.background) {
            changeBackground(overviewConfig.background);
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

    function activateSingleCharView(viewName) {
        // Disable panoramic foreground mode
        if (gameContainer) gameContainer.classList.remove('court-mode-fg');

        // Remove foreground when changing to cocounsel, judge, or gallery views
        if (typeof window.changeForeground === 'function') {
            window.changeForeground('');
        }

        // cocounsel, judge, or gallery — use regular #character element
        const viewConfig = courtroomDB.views && courtroomDB.views[viewName];
        if (viewConfig && viewConfig.background) {
            changeBackground(viewConfig.background);
        }

        // If the slot has a character & emotion, apply to #character
        const slot = slotState[viewName];
        if (slot && slot.character && slot.emotion) {
            const charData = characters[slot.character];
            if (charData && charData[slot.emotion]) {
                currentCharacterName = slot.character;
                currentAnimationKey = slot.emotion;
                setSpriteState('default');
                character.style.transition = 'none';
                character.style.opacity = '1';
                characterIsVisible = true;
                void character.offsetWidth;
                character.style.transition = '';
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
        if (!slotState[slot]) return;

        slotState[slot].emotion = emotion;
        activeSlot = slot;

        // Apply to the appropriate element based on current view
        if (STAND_SLOTS.includes(slot) && standElements[slot]) {
            applySpriteToElement(slot, standElements[slot]);
        }
        if (overviewElements[slot] && currentView === 'overview') {
            applySpriteToElement(slot, overviewElements[slot]);
        }
        // For cocounsel/judge in their respective views, apply to #character
        if ((slot === 'cocounsel' || slot === 'judge') && currentView === slot) {
            const s = slotState[slot];
            if (s.character && s.emotion) {
                currentCharacterName = s.character;
                currentAnimationKey = s.emotion;
                setSpriteState('default');
                character.style.opacity = '1';
                characterIsVisible = true;
            }
        }

        // Install hooks if we're in a stand view
        if (STAND_SLOTS.includes(currentView)) {
            installStandHooks();
        }
    }

    function setCourtSlotCharacter(slotName, characterName) {
        const slot = String(slotName).toLowerCase();
        if (!slotState[slot]) return;

        slotState[slot].character = characterName;
        slotState[slot].emotion = null; // Reset emotion when character changes
    }

    function applySpriteToElement(slotName, element) {
        if (!element) return;

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
            element.src = spriteUrl;
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

    function courtroomChangeSprite(charName, spriteKey) {
        if (!activeSlot || !slotState[activeSlot]) return;

        slotState[activeSlot].character = charName;
        slotState[activeSlot].emotion = spriteKey;

        // Update the element
        if (STAND_SLOTS.includes(activeSlot) && standElements[activeSlot]) {
            applySpriteToElement(activeSlot, standElements[activeSlot]);
        }

        // Also set the global tracking for compatibility
        currentCharacterName = charName;
        currentAnimationKey = spriteKey;
    }

    function courtroomSetSpriteState(state) {
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
            element.src = spriteUrl;
        }
    }

    function fadeCurrentCourtSpriteContainer(duration, isFadeIn) {
        if (!isCourtMode) return false;
        
        const dur = isFinite(duration) ? duration : 1000;
        const opacity = isFadeIn ? '1' : '0';
        const transition = `opacity ${dur}ms ease-in-out`;

        if (STAND_SLOTS.includes(currentView)) {
            if (courtroomSprites) {
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

    // ── Expose API ──────────────────────────────────────────────

    window.initCourtroom = initCourtroom;
    window.cleanupCourtroom = cleanupCourtroom;
    window.setCourtView = setCourtView;
    window.panToStand = panToStand;
    window.setCourtSlotSprite = setCourtSlotSprite;
    window.setCourtSlotCharacter = setCourtSlotCharacter;
    window.fadeCurrentCourtSpriteContainer = fadeCurrentCourtSpriteContainer;
    window.getCurrentCourtView = () => currentView;
    window.getActiveCourtSlot = () => activeSlot;
    window.snapCourtPanInstant = () => syncSpritesToBackground(0);

})();
