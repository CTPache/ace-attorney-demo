// js/ui/screen-mode.js
// Handles single-screen mode toggling and orientation sync.
console.log("UI Screen Mode Loaded");

function syncAutoplayIndicatorPlacement() {
    const bottomMainWindow = document.getElementById("bottom-main-window");

    if (!autoplayIndicator && !skipVideoBtn) {
        return;
    }

    const targetParent = isSingleScreenMode ? gameContainer : bottomMainWindow;

    if (targetParent && autoplayIndicator && autoplayIndicator.parentElement !== targetParent) {
        targetParent.appendChild(autoplayIndicator);
    }

    if (targetParent && skipVideoBtn && skipVideoBtn.parentElement !== targetParent) {
        targetParent.appendChild(skipVideoBtn);
    }
}

function updateScreenVisibility() {
    const topScreen = gameContainer;
    const bottomScreen = document.getElementById("bottom-screen");
    const wrapper = document.getElementById("main-wrapper");

    if (isSingleScreenMode) {
        wrapper.classList.add("single-screen-mode");
        topScreen.classList.remove("inactive-screen");
        bottomScreen.classList.remove("inactive-screen");
        if (bottomScreen && topScreen && !topScreen.contains(bottomScreen)) {
            topScreen.appendChild(bottomScreen);
        }
    } else {
        wrapper.classList.remove("single-screen-mode");
        topScreen.classList.remove("inactive-screen");
        bottomScreen.classList.remove("inactive-screen");
        if (bottomScreen && wrapper && topScreen.contains(bottomScreen)) {
            wrapper.appendChild(bottomScreen);
        }
    }

    syncAutoplayIndicatorPlacement();

    if (typeof window.updateActionButtons === 'function') {
        window.updateActionButtons();
    }
}

function scheduleBackgroundPositionReapply() {
    // Re-apply after layout settles because screen mode changes resize the game container.
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            if (typeof window.applyCurrentBackgroundPosition === 'function') {
                window.applyCurrentBackgroundPosition(0);
            }
        });
    });
}

function toggleScreenMode() {
    isSingleScreenMode = !isSingleScreenMode;
    updateScreenVisibility();
    if (typeof window.rearrangeTitleButtons === "function") {
        window.rearrangeTitleButtons();
    }

    scheduleBackgroundPositionReapply();
}

function switchScreen() {
    return;
}

function enforceOrientationScreenMode() {
    // If layout is taller than it is wide, it's portrait (2 screens)
    // If layout is wider than tall, it's landscape (single screen)
    const isPortrait = window.matchMedia("(orientation: portrait)").matches || (window.innerHeight >= window.innerWidth);
    let changed = false;

    if (isPortrait && isSingleScreenMode) {
        isSingleScreenMode = false;
        changed = true;
    } else if (!isPortrait && !isSingleScreenMode) {
        isSingleScreenMode = true;
        changed = true;
    }

    if (changed) {
        updateScreenVisibility();
        if (typeof window.rearrangeTitleButtons === "function") {
            window.rearrangeTitleButtons();
        }

        scheduleBackgroundPositionReapply();
    }
}

window.addEventListener('resize', enforceOrientationScreenMode);
window.addEventListener('orientationchange', enforceOrientationScreenMode);
document.addEventListener('DOMContentLoaded', enforceOrientationScreenMode);

// Call it initially immediately
enforceOrientationScreenMode();
