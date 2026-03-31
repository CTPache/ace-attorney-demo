// key-events.js
// Centralized key event handler for all global keyboard shortcuts
console.log("Key Events Loaded");
function handleGlobalKeydown(e) {
    // Only if not typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Config menu (G)
    if (e.key.toLowerCase() === 'g') {
        if (configMenu && !configMenu.classList.contains('hidden')) {
            closeConfigMenu();
            e.preventDefault();
        } else if (!isInputBlocked) {
            openConfigMenu();
            e.preventDefault();
        }
        return;
    }

    // Court record toggle (E)
    if (e.key.toLowerCase() === 'e' && !isInputBlocked) {
        if (courtRecordBtn && !courtRecordBtn.disabled) {
            courtRecordBtn.click();
            e.preventDefault();
        }
        return;
    }

    // Escape — close the innermost open menu using the shared close stack.
    if (e.key === 'Escape') {
        if (typeof window.closeInnermostMenu === 'function') {
            if (window.closeInnermostMenu()) {
                e.preventDefault();
            }
            return;
        }
    }

    // Screen mode toggle (M)
    if (e.key.toLowerCase() === 'm') {
        if (typeof toggleScreenMode === 'function') toggleScreenMode();
        return;
    }
    // Switch screen (S)
    if (e.key.toLowerCase() === 's') {
        if (typeof switchScreen === 'function') switchScreen();
        return;
    }
    // Autoplay toggle (A)
    if (e.key.toLowerCase() === 'a') {
        if (typeof toggleAutoplay === 'function') toggleAutoplay();
        return;
    }

    // Advance dialogue (Space) — replaces the advance button in single-screen mode
    if (e.key === ' ' || e.code === 'Space') {
        if (!e.repeat) {
            if (typeof startFastForward === 'function' && !isInputBlocked) {
                startFastForward(e);
            }
        }
        e.preventDefault(); // Always prevent scrolling
        return;
    }
}

function handleGlobalKeyup(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === ' ' || e.code === 'Space') {
        if (typeof stopFastForward === 'function') {
            stopFastForward();
        }
    }
}

document.addEventListener('keydown', handleGlobalKeydown);
document.addEventListener('keyup', handleGlobalKeyup);