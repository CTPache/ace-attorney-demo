// js/key-events.js
// Centralized logical action hub for keyboard and gamepad inputs.

window.triggerGameAction = function (action, type = 'down') {
    // Utility helpers for common checks
    const isVisible = (id) => {
        const el = document.getElementById(id);
        return el && !el.classList.contains('hidden');
    };

    const clickIfExists = (id) => {
        const el = document.getElementById(id);
        if (el && !el.disabled && !el.classList.contains('hidden')) {
            el.click();
            return true;
        }
        return false;
    };

    if (type === 'up') {
        if (action === 'CONFIRM') {
            if (typeof stopFastForward === 'function') stopFastForward();
            return true;
        }
        return false;
    }

        // Case Select Carousel: handle LEFT/RIGHT/CONFIRM/CANCEL only when case list is visible and chapter list is hidden
        const caseListView = document.getElementById('case-list-view');
        const chapterListView = document.getElementById('chapter-list-view');
        if (caseListView && !caseListView.classList.contains('hidden') && (!chapterListView || chapterListView.classList.contains('hidden'))) {
            if (type === 'down' || type === 'repeat') {
                if (action === 'LEFT') {
                    if (window.CaseSelect && window.CaseSelect.prevCase) window.CaseSelect.prevCase();
                    return true;
                } else if (action === 'RIGHT') {
                    if (window.CaseSelect && window.CaseSelect.nextCase) window.CaseSelect.nextCase();
                    return true;
                } else if (action === 'CONFIRM') {
                    if (window.CaseSelect && window.CaseSelect.selectCurrentCase) window.CaseSelect.selectCurrentCase();
                    return true;
                } else if (action === 'CANCEL') {
                    window.hideCaseSelect();
                    if (typeof window.initTitleScreen === 'function') {
                        window.initTitleScreen();
                    }
                    return true;
                }
            }
            // Don't handle keyup for these actions
            return false;
        }

        // Chapter List: allow UP/DOWN to move focus, CONFIRM to select, CANCEL to go back to case select
        if (chapterListView && !chapterListView.classList.contains('hidden')) {
            if (type === 'down' || type === 'repeat') {
                if (action === 'UP' || action === 'DOWN') {
                    // Move focus between chapter buttons
                    const container = document.getElementById('chapters-container');
                    const buttons = Array.from(container.querySelectorAll('.topic-button'));
                    const active = document.activeElement;
                    let idx = buttons.indexOf(active);
                    if (idx === -1) {
                        idx = 0;
                    } else {
                        if (action === 'UP') idx = (idx - 1 + buttons.length) % buttons.length;
                        else if (action === 'DOWN') idx = (idx + 1) % buttons.length;
                    }
                    buttons[idx].focus();
                    return true;
                } else if (action === 'CONFIRM') {
                    const active = document.activeElement;
                    if (active && active.classList.contains('topic-button')) {
                        active.click();
                        return true;
                    }
                } else if (action === 'CANCEL') {
                    // Go back to case select
                    const backBtn = document.getElementById('btn-chapter-back');
                    if (backBtn) backBtn.click();
                    return true;
                }
            }
            return false;
        }
    const isRepeat = (type === 'repeat');

    // 1. Modal State (Highest Priority Trap)
    if (typeof window.isModalOpen === 'function' && window.isModalOpen()) {
        if (action === 'CONFIRM') {
            const activeEl = document.activeElement;
            const btnOk = document.getElementById('modal-btn-ok');
            const btnCancel = document.getElementById('modal-btn-cancel');

            if (activeEl === btnOk || activeEl === btnCancel) {
                activeEl.click();
            } else if (btnOk && !btnOk.classList.contains('hidden')) {
                btnOk.click();
            }
            return true;
        }

        if (action === 'CANCEL') {
            if (!clickIfExists('modal-btn-cancel')) {
                window.hideModal();
            }
            return true;
        }

        if (['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(action)) {
            if (window.SpatialNavigation) window.SpatialNavigation.moveFocus(action);
            return true;
        }

        return true; // Consume all other actions while modal is open
    }

    // 2. Special Overlays & Temporary UI (Evidence Popup, Gallery)
    if (typeof window.triggerGalleryAction === 'function' && window.triggerGalleryAction(action)) {
        return true;
    }

    // Evidence Popups can be dismissed with CONFIRM or ACTION (now CONFIRM)
    if (action === 'CONFIRM' && isVisible('evidence-popup')) {
        if (typeof window.hideEvidencePopup === 'function') {
            window.hideEvidencePopup();
            return true;
        }
    }

    // 3. Navigation (Directional Input)
    if (['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(action)) {
        const isMenuOpen = typeof window.isBlockingMenuOpen === 'function' && window.isBlockingMenuOpen();
        const isInCE = window.CrossExamination && window.CrossExamination.isCEMode && window.CrossExamination.isLoopActive;
        const isExamineMode = typeof isExamining !== 'undefined' && isExamining;
        const isTitleVisible = typeof window.isTitleScreenVisible === 'function' && window.isTitleScreenVisible();
        const isCaseSelectVisible = isVisible('case-select-bottom');

        // Handle Cross-Examination arrows (Only if NO menu is open)
        if (isInCE && !isMenuOpen && (action === 'LEFT' || action === 'RIGHT')) {
            if (clickIfExists(action === 'LEFT' ? 'ce-prev-arrow' : 'ce-next-arrow')) return true;
        }

        // Case Select 'Back' Hierarchy
        if (isVisible('chapter-list-view') && clickIfExists('btn-chapter-back')) return true;
        if (isVisible('case-list-view') && clickIfExists('btn-case-select-back')) return true;

        if (window.SpatialNavigation) {
            // Silence navigation in normal dialogue unless a menu is open
            if (isMenuOpen || isInCE || isVisible('gallery-viewer') || isExamineMode || isTitleVisible || isCaseSelectVisible) {
                window.SpatialNavigation.moveFocus(action);
                return true;
            }
        }
        return false;
    }

    // 4. Primary Interaction (CONFIRM / Enter / A)
    if (action === 'CONFIRM') {
        const isMenuOpen = typeof window.isBlockingMenuOpen === 'function' && window.isBlockingMenuOpen();
        
        // Handle context-specific Enter/Click behavior
        const handleSpatialEnter = () => {
            if (window.SpatialNavigation && window.SpatialNavigation.handleEnter) {
                window.SpatialNavigation.handleEnter();
                return true;
            }
            return false;
        };

        // Case Select Carousel
        if (isVisible('case-list-view')) return handleSpatialEnter();

        // General Menu / Focused Element Interaction
        if (isMenuOpen || (document.activeElement && document.activeElement !== document.body)) {
            // Only use SpatialNavigation handleEnter if focus is NOT on a normal button 
            // (or let the browser handle it if it's already focused)
            if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
                document.activeElement.click();
                return true;
            }
            if (handleSpatialEnter()) return true;
        }

        // Default: Dialogue Advance / Fast Forward
        if (!isRepeat && !isMenuOpen && !isInputBlocked) {
            if (typeof startFastForward === 'function') {
                startFastForward();
                return true;
            }
        }
        return false;
    }

    // 5. Secondary Actions & Shortcuts
    if (action === 'CANCEL') {
        if (typeof window.closeInnermostMenu === 'function') return window.closeInnermostMenu();
    }

    if (action === 'CONFIG') {
        const liveConfigMenu = document.getElementById('config-menu') || configMenu;
        if (isVisible('config-menu') || (liveConfigMenu && !liveConfigMenu.classList.contains('hidden'))) {
            if (typeof closeConfigMenu === 'function') closeConfigMenu();
            return true;
        } else if (!isInputBlocked && !isBlockingMenuOpen()) {
            if (typeof openConfigMenu === 'function') openConfigMenu(typeof window.isTitleScreenVisible === 'function' && window.isTitleScreenVisible());
            return true;
        }
    }


        // COURT_RECORD: If in Cross-Examination mode and loop active, treat as present button
        if (action === 'COURT_RECORD' && !isInputBlocked && !isBlockingMenuOpen()) {
            if (window.CrossExamination && window.CrossExamination.isCEMode && window.CrossExamination.isLoopActive) {
                // Call present with no evidenceId (default present)
                openCourtRecordForPresenting();
                return true;
            }
            if (clickIfExists('court-record-btn')) return true;
        }

    if (action === 'PRESS' && !isInputBlocked && !isBlockingMenuOpen()) {
        if (clickIfExists('ce-press-btn')) return true;
    }

    if (action === 'AUTOPLAY' && !isInputBlocked && !isBlockingMenuOpen()) {
        if (isVisible('autoplay-indicator')) {
            if (typeof toggleAutoplay === 'function') {
                toggleAutoplay();
                return true;
            }
        }
    }

    if (action === 'SCREEN_MODE') {
        if (typeof toggleScreenMode === 'function') toggleScreenMode();
        return true;
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