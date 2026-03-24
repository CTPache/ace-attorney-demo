// js/ui/action-menus.js
// Core menu/action UI helpers shared across gameplay modules.
console.log("UI Action Menus Loaded");

function setBottomScreenButtonsDisabled(disabled) {
    const buttons = document.querySelectorAll('#bottom-screen button');
    buttons.forEach((button) => {
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
    if (bottomTopBar) bottomTopBar.classList.remove('hidden');
    if (gameContainer) gameContainer.classList.remove('investigating');

    isExamining = false;
    isCourtRecordOpen = false;
    isPresentingMode = false;
}

function updateActionButtons() {
    if (btnExamine) {
        btnExamine.disabled = !actionStates.examine;
    }
    if (btnMove) {
        btnMove.disabled = !actionStates.move;
    }
    if (btnTalk) {
        btnTalk.disabled = !actionStates.talk;
    }
    if (btnPresent) {
        btnPresent.disabled = !actionStates.present;
    }
}

window.setBottomScreenButtonsDisabled = setBottomScreenButtonsDisabled;
window.hideActionMenus = hideActionMenus;
window.updateActionButtons = updateActionButtons;
