function triggerFlash() {
    flashOverlay.classList.remove('flashing');
    void flashOverlay.offsetWidth; // Trigger reflow
    flashOverlay.classList.add('flashing');
}

function setSpriteState(state, options = {}) {
    if (isCourtMode && window._courtroomSetSpriteState) {
        window._courtroomSetSpriteState(state, options);
        return;
    }

    const {
        restartAnimation = false,
        forceReload = false
    } = options || {};

    if (!currentCharacterName || !currentAnimationKey) return;

    const charData = characters[currentCharacterName];
    if (!charData) return;

    const animData = charData[currentAnimationKey];
    if (!animData) return;

    let spriteUrl = '';

    if (state === 'talking' && animData.talking) {
        spriteUrl = animData.talking;
    } else {
        spriteUrl = animData.default || animData.talking || '';
    }

    if (spriteUrl) {
        if (window.applyPreloadedImageToElement) {
            window.applyPreloadedImageToElement(character, spriteUrl, {
                restartAnimation,
                forceReload
            }).catch(() => {
                character.src = spriteUrl;
            });
        } else {
            character.src = spriteUrl;
        }
    }
}

function changeBackground(bgName, options = {}) {
    const bgData = backgrounds[bgName];
    if (!bgData) {
        console.warn(`Background not found: ${bgName}`);
        return;
    }

    const { preserveOpacity = false } = options || {};
    const preservedOpacity = preserveOpacity
        ? String((backgroundElement && getComputedStyle(backgroundElement).opacity) || '1')
        : '1';

    const clearInlineForeground = () => {
        if (foregroundElement) {
            foregroundElement.style.backgroundImage = 'none';
            foregroundElement.style.opacity = '0';
        }
        currentForegroundKey = '';
    };

    const bgUrl = (typeof bgData === 'object') ? (bgData.path || bgData.background) : bgData;
    if (!bgUrl) {
        console.warn(`Background URL not found: ${bgName}`);
        return;
    }

    backgroundElement.style.backgroundImage = `url('${bgUrl}')`;
    backgroundElement.style.opacity = preservedOpacity;
    currentBackgroundKey = bgName;

    if (typeof bgData === 'object' && bgData.foreground) {
        foregroundElement.style.backgroundImage = `url('${bgData.foreground}')`;
        foregroundElement.style.opacity = preservedOpacity;
        currentForegroundKey = `${bgName}_fg`;
    } else {
        clearInlineForeground();
    }

    if (typeof bgData === 'object' && bgData.positions && bgData.positions.default) {
        const defaultPos = bgData.positions.default;
        const position = bgData.positions[defaultPos];
        if (position && Array.isArray(position)) {
            moveBackgroundToPosition(position[0], position[1]);
            return;
        }
    }

    resetBackgroundPosition();
}

let currentBackgroundPosition = null;
let pendingBackgroundSwap = null;
let pendingForegroundSwap = null;

function clearPendingBackgroundSwap(applyPending = false) {
    if (!pendingBackgroundSwap) return;

    const { bgName, timeoutId } = pendingBackgroundSwap;
    clearTimeout(timeoutId);
    pendingBackgroundSwap = null;

    if (applyPending && bgName) {
        changeBackground(bgName);
        if (backgroundElement) {
            backgroundElement.style.transition = 'none';
            backgroundElement.style.opacity = '1';
            void backgroundElement.offsetWidth;
            backgroundElement.style.transition = '';
        }
    }
}

function clearPendingForegroundSwap(applyPending = false) {
    if (!pendingForegroundSwap) return;

    const { fgName, timeoutId } = pendingForegroundSwap;
    clearTimeout(timeoutId);
    pendingForegroundSwap = null;

    if (applyPending) {
        changeForeground(fgName || '');
        if (foregroundElement) {
            foregroundElement.style.transition = 'none';
            foregroundElement.style.opacity = fgName ? '1' : '0';
            void foregroundElement.offsetWidth;
            foregroundElement.style.transition = '';
        }
    }
}

function hasOpacityTransition(element) {
    if (!element) return false;
    return /opacity/i.test(String(element.style.transition || ''));
}

window.completePendingVisualTransitions = function() {
    const hadPendingTransitions = !!pendingBackgroundSwap || !!pendingForegroundSwap;
    clearPendingBackgroundSwap(true);
    clearPendingForegroundSwap(true);
    return hadPendingTransitions;
};

window.completeActiveVisualOpacityTransitionsInstant = function() {
    const hadActiveOpacityTransition = hasOpacityTransition(backgroundElement)
        || hasOpacityTransition(foregroundElement);

    finishElementOpacityTransitionInstant(backgroundElement);
    finishElementOpacityTransitionInstant(foregroundElement);

    return hadActiveOpacityTransition;
};

window.completeVisualTransitionsForAdvance = function() {
    const hadVisualTransitions = window.completePendingVisualTransitions()
        || window.completeActiveVisualOpacityTransitionsInstant();

    if (!hadVisualTransitions) {
        return false;
    }

    if (typeof window.snapBackgroundToPositionInstant === 'function') {
        window.snapBackgroundToPositionInstant();
    }
    if (typeof window.snapCourtPanInstant === 'function') {
        window.snapCourtPanInstant();
    }

    return true;
};

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
        setTimeout(() => {
            backgroundElement.style.transition = '';
        }, duration);
        return;
    }

    backgroundElement.style.transition = 'none';
    backgroundElement.style.backgroundPosition = `${x} ${y}`;
    requestAnimationFrame(() => {
        backgroundElement.style.transition = '';
    });
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

function readElementOpacity(element, fallback = 1) {
    if (!element) return fallback;

    const computedOpacity = parseFloat(getComputedStyle(element).opacity || String(fallback));
    return Number.isFinite(computedOpacity) ? computedOpacity : fallback;
}

function applyElementOpacityInstant(element, opacity) {
    if (!element || !Number.isFinite(opacity)) return;

    element.style.transition = 'none';
    element.style.opacity = String(opacity);
    void element.offsetWidth;
    element.style.transition = '';
}

function getMediaSnapshot() {
    return {
        backgroundPosition: currentBackgroundPosition
            ? { x: currentBackgroundPosition.x || 0, y: currentBackgroundPosition.y || 0 }
            : null,
        layerVisibility: {
            backgroundOpacity: readElementOpacity(backgroundElement, 1),
            foregroundOpacity: readElementOpacity(foregroundElement, currentForegroundKey ? 1 : 0),
            characterOpacity: readElementOpacity(character, characterIsVisible ? 1 : 0),
            courtroomSpritesOpacity: readElementOpacity(courtroomSprites, 1),
            courtroomOverviewOpacity: readElementOpacity(courtroomOverviewSprites, 1)
        },
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

    const layerVisibility = (snapshot.layerVisibility && typeof snapshot.layerVisibility === 'object')
        ? snapshot.layerVisibility
        : {};

    const backgroundOpacity = Number(layerVisibility.backgroundOpacity);
    const foregroundOpacity = Number(layerVisibility.foregroundOpacity);
    const characterOpacity = Number(layerVisibility.characterOpacity);
    const courtroomSpritesOpacity = Number(layerVisibility.courtroomSpritesOpacity);
    const courtroomOverviewOpacity = Number(layerVisibility.courtroomOverviewOpacity);

    applyElementOpacityInstant(backgroundElement, backgroundOpacity);
    applyElementOpacityInstant(foregroundElement, foregroundOpacity);
    applyElementOpacityInstant(character, characterOpacity);
    applyElementOpacityInstant(courtroomSprites, courtroomSpritesOpacity);
    applyElementOpacityInstant(courtroomOverviewSprites, courtroomOverviewOpacity);

    if (Number.isFinite(characterOpacity)) {
        characterIsVisible = characterOpacity > 0.01;
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

function changeForeground(fgName) {
    if (!fgName) {
        foregroundElement.style.backgroundImage = 'none';
        currentForegroundKey = '';
        return;
    }

    const fgUrl = foregrounds[fgName];
    if (fgUrl) {
        foregroundElement.style.backgroundImage = `url('${fgUrl}')`;
        foregroundElement.style.opacity = '1';
        currentForegroundKey = fgName;
    } else {
        foregroundElement.style.backgroundImage = 'none';
        currentForegroundKey = '';
    }
}

function finishElementOpacityTransitionInstant(element) {
    if (!element) return;

    const targetOpacity = String(element.style.opacity || '').trim();
    if (!targetOpacity) return;

    element.style.transition = 'none';
    element.style.opacity = targetOpacity;
    void element.offsetWidth;
    element.style.transition = '';
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

    element.style.transition = 'none';
    element.style.opacity = '0';
    void element.offsetWidth;

    element.style.transition = `opacity ${ms}ms ease-in-out`;
    element.style.opacity = '1';
}

function fadeBackground(bgName, duration = 400) {
    const ms = Number.isFinite(duration) ? duration : 400;
    clearPendingBackgroundSwap(false);

    if (ms <= 0) {
        changeBackground(bgName);
        fadeInElement(backgroundElement, 0);
        return;
    }

    fadeOutElement(backgroundElement, ms);
    pendingBackgroundSwap = {
        bgName,
        timeoutId: setTimeout(() => {
            const targetBgName = pendingBackgroundSwap ? pendingBackgroundSwap.bgName : bgName;
            pendingBackgroundSwap = null;
            changeBackground(targetBgName);
            fadeInElement(backgroundElement, ms);
        }, ms)
    };
}

function fadeForeground(fgName, duration = 400) {
    const ms = Number.isFinite(duration) ? duration : 400;
    clearPendingForegroundSwap(false);

    if (ms <= 0) {
        changeForeground(fgName);
        fadeInElement(foregroundElement, 0);
        return;
    }

    fadeOutElement(foregroundElement, ms);
    pendingForegroundSwap = {
        fgName,
        timeoutId: setTimeout(() => {
            const targetFgName = pendingForegroundSwap ? pendingForegroundSwap.fgName : fgName;
            pendingForegroundSwap = null;
            changeForeground(targetFgName);
            fadeInElement(foregroundElement, ms);
        }, ms)
    };
}

window.changeBackground = changeBackground;
window.changeForeground = changeForeground;
window.changeSprite = changeSprite;
window.setSpriteState = setSpriteState;
window.triggerFlash = triggerFlash;
window.moveBackgroundToPosition = moveBackgroundToPosition;
window.moveBackgroundByName = moveBackgroundByName;
window.applyCurrentBackgroundPosition = applyCurrentBackgroundPosition;
window.getMediaSnapshot = getMediaSnapshot;
window.restoreMediaSnapshot = restoreMediaSnapshot;
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

function changeSprite(charName, spriteKey, options = {}) {
    if (isCourtMode && window._courtroomChangeSprite) {
        window._courtroomChangeSprite(charName, spriteKey, options);
        return;
    }

    currentCharacterName = charName;
    currentAnimationKey = spriteKey;
    setSpriteState('default', {
        restartAnimation: true,
        forceReload: true,
        ...options
    });
}
