// js/key-events.js
// Centralized logical action hub for keyboard and gamepad inputs.

window.triggerGameAction = function(action, type = 'down') {
    if (type === 'up') {
        if (action === 'ACTION') {
            if (typeof stopFastForward === 'function') stopFastForward();
            return true;
        }
        return false;
    }

    const isRepeat = (type === 'repeat');

    // 1. Handle Gallery Viewer (Logical Overlay)
    if (typeof window.triggerGalleryAction === 'function') {
        if (window.triggerGalleryAction(action)) return true;
    }

    // 2. Logic for Spatial Navigation / Logical Movements
    if (action === 'UP' || action === 'DOWN' || action === 'LEFT' || action === 'RIGHT') {
        const isMenuOpen = typeof window.isBlockingMenuOpen === 'function' && window.isBlockingMenuOpen();
        const isInCE = window.CrossExamination && window.CrossExamination.isCEMode && window.CrossExamination.isLoopActive;
        const isGalleryViewer = document.getElementById('gallery-viewer') && !document.getElementById('gallery-viewer').classList.contains('hidden');
        const isExamineMode = typeof isExamining !== 'undefined' && isExamining;
        const isTitleVisible = typeof window.isTitleScreenVisible === 'function' && window.isTitleScreenVisible();
        const isCaseSelectVisible = document.getElementById('case-select-bottom') && !document.getElementById('case-select-bottom').classList.contains('hidden');

        // Silence navigation in normal dialogue
        if (!isMenuOpen && !isInCE && !isGalleryViewer && !isExamineMode && !isTitleVisible && !isCaseSelectVisible) {
            return false;
        }

        // Handle Cross-Examination arrows (Only if NO menu is open)
        if (isInCE && !isMenuOpen && (action === 'LEFT' || action === 'RIGHT')) {
            const ceBtnId = action === 'LEFT' ? 'ce-prev-arrow' : 'ce-next-arrow';
            const ceBtn = document.getElementById(ceBtnId);
            if (ceBtn && !ceBtn.classList.contains('hidden')) {
                ceBtn.click();
                return true;
            }
        }

        if (typeof window.SpatialNavigation !== 'undefined') {
            window.SpatialNavigation.moveFocus(action);
            return true;
        }
        return false;
    }

    // 3. Selection & Confirm
    if (action === 'CONFIRM') {
        // Evidence Popup Dismissal (High Priority)
        const evidencePopup = document.getElementById('evidence-popup');
        if (evidencePopup && !evidencePopup.classList.contains('hidden')) {
            if (typeof window.hideEvidencePopup === 'function') {
                window.hideEvidencePopup();
                return true;
            }
        }

        const isMenuOpen = typeof window.isBlockingMenuOpen === 'function' && window.isBlockingMenuOpen();
        
        // Case Select Carousel
        const caseListView = document.getElementById('case-list-view');
        if (caseListView && !caseListView.classList.contains('hidden')) {
            if (window.SpatialNavigation && window.SpatialNavigation.handleEnter) {
                window.SpatialNavigation.handleEnter();
                return true;
            }
        }

        if (typeof window.SpatialNavigation !== 'undefined' && (isMenuOpen || (document.activeElement && document.activeElement !== document.body))) {
            window.SpatialNavigation.handleEnter();
            return true;
        }
        return false;
    }

    // 4. Action / Advance
    if (action === 'ACTION') {
        // Evidence Popup Dismissal (High Priority)
        const evidencePopup = document.getElementById('evidence-popup');
        if (evidencePopup && !evidencePopup.classList.contains('hidden')) {
            if (typeof window.hideEvidencePopup === 'function') {
                window.hideEvidencePopup();
                return true;
            }
        }

        if (!document.activeElement || document.activeElement === document.body || document.activeElement.tagName !== 'BUTTON') {
            const isMenuOpen = typeof window.isBlockingMenuOpen === 'function' && window.isBlockingMenuOpen();
            if (!isRepeat && !isMenuOpen) {
                if (typeof startFastForward === 'function' && !isInputBlocked) {
                    startFastForward();
                }
            }
            return true;
        }
        return false;
    }

    // 5. Config
    if (action === 'CONFIG') {
        const liveConfigMenu = document.getElementById('config-menu') || configMenu;
        const isConfigOpen = liveConfigMenu && !liveConfigMenu.classList.contains('hidden');
        const otherMenuOpen = typeof window.isBlockingMenuOpen === 'function' && window.isBlockingMenuOpen() && !isConfigOpen;

        if (isConfigOpen) {
            if (typeof closeConfigMenu === 'function') closeConfigMenu();
            return true;
        } else if (!isInputBlocked && !otherMenuOpen) {
            if (typeof openConfigMenu === 'function') openConfigMenu(typeof window.isTitleScreenVisible === 'function' && window.isTitleScreenVisible());
            return true;
        }
        return false;
    }

    // 6. Court Record
    if (action === 'COURT_RECORD' && !isInputBlocked) {
        const crBtn = document.getElementById('court-record-btn') || courtRecordBtn;
        const isCROpen = document.getElementById('evidence-container') && !document.getElementById('evidence-container').classList.contains('hidden');
        const otherMenuOpen = typeof window.isBlockingMenuOpen === 'function' && window.isBlockingMenuOpen() && !isCROpen;

        if (crBtn && !crBtn.disabled && !otherMenuOpen) {
            crBtn.click();
            return true;
        }
        return false;
    }

    // 7. Press
    if (action === 'PRESS' && !isInputBlocked) {
        const isMenuOpen = typeof window.isBlockingMenuOpen === 'function' && window.isBlockingMenuOpen();
        const pressBtn = document.getElementById('ce-press-btn') || cePressButton;
        if (pressBtn && !pressBtn.disabled && !isMenuOpen) {
            pressBtn.click();
            return true;
        }
        return false;
    }

    // 8. Cancel / Back
    if (action === 'CANCEL') {
        if (typeof window.closeInnermostMenu === 'function') {
            return window.closeInnermostMenu();
        }
        return false;
    }

    // 9. Display Modes
    if (action === 'SCREEN_MODE') {
        if (typeof toggleScreenMode === 'function') toggleScreenMode();
        return true;
    }
    if (action === 'SWITCH_SCREEN') {
        if (typeof switchScreen === 'function') switchScreen();
        return true;
    }

    // 10. Autoplay
    if (action === 'AUTOPLAY' && !isInputBlocked) {
        const isMenuOpen = typeof window.isBlockingMenuOpen === 'function' && window.isBlockingMenuOpen();
        const autoBtn = document.getElementById('autoplay-indicator') || autoplayIndicator;
        if (autoBtn && !autoBtn.classList.contains('hidden') && !autoBtn.disabled && !isMenuOpen) {
            if (typeof toggleAutoplay === 'function') toggleAutoplay();
            return true;
        }
        return false;
    }

    return false;
};

// --- Keyboard Event Adapters ---

function handleGlobalKeydown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    for (const action in window.KEY_BINDINGS) {
        if (window.isKey(e, action)) {
            if (window.triggerGameAction(action, e.repeat ? 'repeat' : 'down')) {
                e.preventDefault();
                e.stopPropagation();
            }
            return;
        }
    }
}

function handleGlobalKeyup(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    for (const action in window.KEY_BINDINGS) {
        if (window.isKey(e, action)) {
            if (window.triggerGameAction(action, 'up')) {
                e.preventDefault();
                e.stopPropagation();
            }
            return;
        }
    }
}

document.removeEventListener('keydown', handleGlobalKeydown);
document.removeEventListener('keyup', handleGlobalKeyup);
document.addEventListener('keydown', handleGlobalKeydown);
document.addEventListener('keyup', handleGlobalKeyup);