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
        toggleScreenMode();
        return;
    }
    // Switch screen (S)
    if (e.key.toLowerCase() === 's') {
        switchScreen();
        return;
    }
    // Autoplay toggle (A)
    if (e.key.toLowerCase() === 'a') {
        toggleAutoplay();
        return;
    }

    // Advance dialogue (Space) — replaces the advance button in single-screen mode
    if (e.key === ' ') {
        if (typeof advanceDialogue === 'function' && !isInputBlocked) {
            advanceDialogue();
            e.preventDefault();
        }
        return;
    }
}

document.addEventListener('keydown', handleGlobalKeydown);