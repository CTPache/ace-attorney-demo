// js/ui/advance-controls.js
// Handles fast-forward interactions on the advance button.
console.log("UI Advance Controls Loaded");

function startFastForward(e) {
    if (e && e.type === 'touchstart') e.preventDefault(); // Prevent ghost clicks

    if (!isTextSkipEnabled) {
        advanceDialogue(false);
        return;
    }

    // Immediate advance on click
    advanceDialogue(true);

    if (isFastForwarding) return;

    // Start delay timer for fast forward
    fastForwardTimeout = setTimeout(() => {
        isFastForwarding = true;
        if (typeof advanceBtn !== 'undefined' && advanceBtn) {
            advanceBtn.textContent = "▶▶";
        }

        // Loop
        fastForwardInterval = setInterval(() => {
            advanceDialogue(true);
        }, 100);
    }, 500);
}

function stopFastForward() {
    if (fastForwardTimeout) {
        clearTimeout(fastForwardTimeout);
        fastForwardTimeout = null;
    }

    isFastForwarding = false;
    if (typeof advanceBtn !== 'undefined' && advanceBtn) {
        advanceBtn.textContent = "▶";
    }
    if (fastForwardInterval) {
        clearInterval(fastForwardInterval);
        fastForwardInterval = null;
    }
}

if (advanceBtn) {
    advanceBtn.addEventListener('mousedown', startFastForward);
    advanceBtn.addEventListener('touchstart', startFastForward, { passive: false });
    advanceBtn.addEventListener('mouseup', stopFastForward);
    advanceBtn.addEventListener('mouseleave', stopFastForward);
    advanceBtn.addEventListener('touchend', stopFastForward);
}
