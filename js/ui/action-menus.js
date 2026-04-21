// js/ui/action-menus.js
// Core menu/action UI helpers shared across gameplay modules.
console.log("UI Action Menus Loaded");

function setBottomScreenButtonsDisabled(disabled) {
    const buttons = document.querySelectorAll('#bottom-screen button');
    buttons.forEach((button) => {
        if (button.id === 'skip-video-btn' || button.id === 'autoplay-indicator') return;
        
        if (disabled) {
            if (button.dataset.videoDisabled === 'true') return;
            button.dataset.videoDisabled = 'true';
            button.dataset.prevDisabled = button.disabled ? '1' : '0';
            button.disabled = true;
            return;
        }

        if (button.dataset.videoDisabled !== 'true') return;
        button.disabled = button.dataset.prevDisabled === '1';
        delete button.dataset.videoDisabled;
        delete button.dataset.prevDisabled;
    });

    if (!disabled && typeof window.refreshTopBarButtonDisabledState === 'function') {
        window.refreshTopBarButtonDisabledState();
    }
}

function hideActionMenus() {
    if (investigationMenu) investigationMenu.classList.add('hidden');
    if (moveMenu) moveMenu.classList.add('hidden');
    if (topicMenu) topicMenu.classList.add('hidden');
    if (investigationPanel) investigationPanel.classList.add('hidden');
    if (evidenceContainer) evidenceContainer.classList.add('hidden');
    if (evidenceDetails) evidenceDetails.classList.add('hidden');
    const evidencePopupEl = document.getElementById('evidence-popup');
    if (evidencePopupEl) {
        evidencePopupEl.classList.add('hidden');
        if (typeof window.shelveLazyElement === 'function') {
            window.shelveLazyElement('evidence-popup');
        }
    }
    if (evidenceNameDisplay) evidenceNameDisplay.textContent = '';
    if (typeof window.clearOptionsTimer === 'function') {
        window.clearOptionsTimer();
    }
    if (bottomTopBar) {
        const isTitleVisible = typeof window.isTitleScreenVisible === 'function' && window.isTitleScreenVisible();
        bottomTopBar.classList.toggle('hidden', isTitleVisible);
    }
    if (gameContainer) gameContainer.classList.remove('investigating');

    isExamining = false;
    isCourtRecordOpen = false;
    isPresentingMode = false;

    if (typeof window.shelveLazyElements === 'function') {
        window.shelveLazyElements([
            'investigation-menu',
            'move-menu',
            'investigation-panel',
            'topic-menu',
            'evidence-container'
        ]);
    }

    if (typeof window.syncMenuInputBlockState === 'function') {
        window.syncMenuInputBlockState();
    }
}

function isMenuLikeElementVisible(element) {
    return !!(
        element
        && !element.classList.contains('hidden')
        && getComputedStyle(element).display !== 'none'
        && getComputedStyle(element).visibility !== 'hidden'
    );
}

function isBlockingMenuOpen() {
    const menus = [
        'modal-overlay', 'config-menu', 'history-menu', 'investigation-menu', 
        'move-menu', 'topic-menu', 'investigation-panel', 
        'evidence-container', 'evidence-details', 
        'case-select-bottom', 'gallery-menu'
    ];

    return menus.some(id => {
        const el = document.getElementById(id);
        if (!el) return false;
        
        // Prioritize the .hidden class which is updated synchronously
        if (el.classList.contains('hidden')) return false;

        // Fallback to computed style for elements that might be hidden by parent or other means
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
    });
}

function syncMenuInputBlockState() {
    const shouldBlock = isBlockingMenuOpen();
    const wasBlocked = isInputBlocked;
    isInputBlocked = shouldBlock;
    
    // Manage Autoplay Timers based on menu state transitions
    if (shouldBlock && !wasBlocked) {
        // Menu just opened
        if (typeof window.clearAutoPlayTimer === 'function') {
            window.clearAutoPlayTimer();
        }
    } else if (!shouldBlock && wasBlocked) {
        // All menus just closed
        if (typeof window.scheduleAutoPlayAdvance === 'function' && 
            typeof isAutoPlayEnabled !== 'undefined' && isAutoPlayEnabled &&
            typeof isScenePlaying !== 'undefined' && isScenePlaying) {
            window.scheduleAutoPlayAdvance();
        }
    }

    // Refresh the visibility of controls that depend on the input block state
    if (typeof window.updateAutoplayIndicator === 'function') {
        window.updateAutoplayIndicator();
    }
    
    // Ensure menu buttons (like Return to Title) are correctly bound after potential re-renders
    if (typeof window.bindReturnToTitleEvents === 'function') {
        window.bindReturnToTitleEvents();
    }
    
    return shouldBlock;
}

function shouldBlockDialogueAdvance(target) {
    if (isInputBlocked || isBlockingMenuOpen()) {
        return true;
    }

    if (!(target instanceof Element)) {
        return false;
    }

    if (target.closest('button, input, select, textarea, label, a, summary, [role="button"]')) {
        return true;
    }

    if (target.closest('#bottom-top-bar, #config-btn, #court-record-btn, #autoplay-indicator, #skip-video-btn, #ce-controls, #ce-arrow-container')) {
        return true;
    }

    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay && !modalOverlay.classList.contains('hidden')) return true;

    return false;
}

function applyActionButtonState(button, isEnabled) {
    if (!button) return;

    button.disabled = !isEnabled;

    const shouldHideInSingleScreen = !!isSingleScreenMode && !isEnabled;
    button.style.display = shouldHideInSingleScreen ? 'none' : '';
    button.setAttribute('aria-hidden', shouldHideInSingleScreen ? 'true' : 'false');
}

function updateActionButtons() {
    applyActionButtonState(btnExamine, actionStates.examine);
    applyActionButtonState(btnMove, actionStates.move);
    applyActionButtonState(btnTalk, actionStates.talk);
    applyActionButtonState(btnPresent, actionStates.present);
}

window.setBottomScreenButtonsDisabled = setBottomScreenButtonsDisabled;
window.hideActionMenus = hideActionMenus;
window.isBlockingMenuOpen = isBlockingMenuOpen;
window.syncMenuInputBlockState = syncMenuInputBlockState;
window.shouldBlockDialogueAdvance = shouldBlockDialogueAdvance;
window.updateActionButtons = updateActionButtons;
