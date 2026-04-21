/**
 * js/ui/cross-examination-ui.js
 * Connects the UI buttons to the CrossExamination logic.
 */

function openCourtRecordForPresenting() {
    if (!window.CrossExamination.isCEMode) return;

    // Use the existing court record logic if available
    if (window.openCourtRecord) {
        window.openCourtRecord('present'); // We might need to add 'present' mode to court-record.js
    }
}


window.CE_UI = (function () {
    function init() {
        // Top screen buttons (HD)
        const pressBtn = document.getElementById('ce-press-btn');
        const presentBtn = document.getElementById('ce-present-btn');
        const prevArrow = document.getElementById('ce-prev-arrow');
        const nextArrow = document.getElementById('ce-next-arrow');

        if (pressBtn && pressBtn.dataset.ceUiBound !== 'true') {
            pressBtn.dataset.ceUiBound = 'true';
            pressBtn.addEventListener('click', () => window.CrossExamination.press());
        }
        if (presentBtn && presentBtn.dataset.ceUiBound !== 'true') {
            presentBtn.dataset.ceUiBound = 'true';
            presentBtn.addEventListener('click', () => openCourtRecordForPresenting());
        }

        if (prevArrow && prevArrow.dataset.ceUiBound !== 'true') {
            prevArrow.dataset.ceUiBound = 'true';
            prevArrow.addEventListener('click', () => window.CrossExamination.prev());
        }
        if (nextArrow && nextArrow.dataset.ceUiBound !== 'true') {
            nextArrow.dataset.ceUiBound = 'true';
            nextArrow.addEventListener('click', () => window.CrossExamination.next());
        }
    }

    // Called when the window is loaded, or manually
    document.addEventListener('DOMContentLoaded', init);

    return {
        init
    };
})();
