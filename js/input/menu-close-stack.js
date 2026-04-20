// js/input/menu-close-stack.js
// Centralized stack for closing the innermost visible menu/overlay.
console.log("Menu Close Stack Loaded");

window.closeInnermostMenu = function() {
    if (evidenceDetails && !evidenceDetails.classList.contains('hidden')) {
        if (typeof window.hideEvidenceDetails === 'function') {
            window.hideEvidenceDetails();
        } else {
            evidenceDetails.classList.add('hidden');
        }
        return true;
    }

    if (evidenceContainer && !evidenceContainer.classList.contains('hidden')) {
        if (btnEvidenceBack) btnEvidenceBack.click();
        return true;
    }

    if (investigationPanel && !investigationPanel.classList.contains('hidden')) {
        if (btnInvestigationBack) btnInvestigationBack.click();
        return true;
    }

    if (moveMenu && !moveMenu.classList.contains('hidden')) {
        if (btnMoveBack) btnMoveBack.click();
        return true;
    }

    if (topicMenu && !topicMenu.classList.contains('hidden')) {
        if (btnTopicBack) btnTopicBack.click();
        return true;
    }

    const chapterListView = document.getElementById('chapter-list-view');
    if (chapterListView && !chapterListView.classList.contains('hidden')) {
        const backToCases = document.getElementById('btn-chapter-back');
        if (backToCases) backToCases.click();
        return true;
    }

    const caseSelectBottom = document.getElementById('case-select-bottom');
    if (caseSelectBottom && !caseSelectBottom.classList.contains('hidden')) {
        const backToTitle = document.getElementById('btn-case-select-back');
        if (backToTitle) backToTitle.click();
        return true;
    }

    if (configMenu && !configMenu.classList.contains('hidden')) {
        closeConfigMenu();
        return true;
    }

    if (historyMenu && !historyMenu.classList.contains('hidden')) {
        closeHistoryMenu();
        return true;
    }

    const evidencePopup = document.getElementById('evidence-popup');
    if (evidencePopup && !evidencePopup.classList.contains('hidden')) {
        if (typeof window.hideEvidencePopup === 'function') {
            window.hideEvidencePopup();
        } else {
            evidencePopup.classList.add('hidden');
        }
        return true;
    }

    return false;
};
