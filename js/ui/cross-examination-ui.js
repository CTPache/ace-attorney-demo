/**
 * js/ui/cross-examination-ui.js
 * Connects the UI buttons to the CrossExamination logic.
 */

window.CE_UI = (function() {
    function init() {
        // Top screen buttons (HD)
        const pressBtn = document.getElementById('ce-press-btn');
        const presentBtn = document.getElementById('ce-present-btn');
        const prevArrow = document.getElementById('ce-prev-arrow');
        const nextArrow = document.getElementById('ce-next-arrow');

        if (pressBtn) pressBtn.addEventListener('click', () => window.CrossExamination.press());
        if (presentBtn) presentBtn.addEventListener('click', () => openCourtRecordForPresenting());
        
        if (prevArrow) prevArrow.addEventListener('click', () => window.CrossExamination.prev());
        if (nextArrow) nextArrow.addEventListener('click', () => window.CrossExamination.next());
    }

    function openCourtRecordForPresenting() {
        if (!window.CrossExamination.isCEMode) return;
        
        // Use the existing court record logic if available
        if (window.openCourtRecord) {
            window.openCourtRecord('present'); // We might need to add 'present' mode to court-record.js
        }
    }

    // Called when the window is loaded, or manually
    document.addEventListener('DOMContentLoaded', init);

    return {
        init
    };
})();
