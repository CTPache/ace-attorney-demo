function triggerFlash() {
    flashOverlay.classList.remove('flashing');
    void flashOverlay.offsetWidth; // Trigger reflow
    flashOverlay.classList.add('flashing');
}

function setSpriteState(state) {
    if (isCourtMode && window._courtroomSetSpriteState) {
        window._courtroomSetSpriteState(state);
        return;
    }

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
        character.src = spriteUrl;
    }
}

function changeBackground(bgName) {
    const bgData = backgrounds[bgName];
    if (!bgData) {
        console.warn(`Background not found: ${bgName}`);
        return;
    }

    const bgUrl = bgData.path || bgData.background;
    if (typeof bgData === 'object' && bgUrl) {
        backgroundElement.style.backgroundImage = `url('${bgUrl}')`;
        backgroundElement.style.opacity = '1';
        currentBackgroundKey = bgName;

        if (bgData.foreground) {
            foregroundElement.style.backgroundImage = `url('${bgData.foreground}')`;
            foregroundElement.style.opacity = '1';
            currentForegroundKey = `${bgName}_fg`;
        }

        if (bgData.positions && bgData.positions.default) {
            const defaultPos = bgData.positions.default;
            const position = bgData.positions[defaultPos];
            if (position && Array.isArray(position)) {
                moveBackgroundToPosition(position[0], position[1]);
            }
        } else {
            resetBackgroundPosition();
        }
    } else if (typeof bgData === 'string') {
        backgroundElement.style.backgroundImage = `url('${bgData}')`;
        backgroundElement.style.opacity = '1';
        currentBackgroundKey = bgName;
        resetBackgroundPosition();
    }
}

let currentBackgroundPosition = null;

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

function getMediaSnapshot() {
    return {
        backgroundPosition: currentBackgroundPosition
            ? { x: currentBackgroundPosition.x || 0, y: currentBackgroundPosition.y || 0 }
            : null,
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

function changeSprite(charName, spriteKey) {
    if (isCourtMode && window._courtroomChangeSprite) {
        window._courtroomChangeSprite(charName, spriteKey);
        return;
    }

    currentCharacterName = charName;
    currentAnimationKey = spriteKey;
    setSpriteState('default');
}
