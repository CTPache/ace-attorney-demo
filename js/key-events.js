// key-events.js
// Centralized key event handler for all global keyboard shortcuts
console.log("Key Events Loaded");
function handleGlobalKeydown(e) {
    // Only if not typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Config menu (G)
    if (e.key.toLowerCase() === 'g' && !isInputBlocked) {
        if (configMenu && !configMenu.classList.contains('hidden')) {
            closeConfigMenu();
        } else {
            openConfigMenu();
        }
        e.preventDefault();
        return;
    }

    // Escape closes config/history
    if (e.key === 'Escape' && configMenu && !configMenu.classList.contains('hidden')) {
        closeConfigMenu();
        return;
    }
    if (e.key === 'Escape' && historyMenu && !historyMenu.classList.contains('hidden')) {
        closeHistoryMenu();
        return;
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
}

document.addEventListener('keydown', handleGlobalKeydown);