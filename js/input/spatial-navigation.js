// js/input/spatial-navigation.js
// Handles spatial (arrow key) navigation across various menus.

window.SpatialNavigation = (function () {

    function getFocusableElements(container = document) {
        const modalContainer = getActiveModalElement();
        const searchRoot = modalContainer || container;

        const selector = 'button:not([disabled]), [tabindex="0"], select:not([disabled]), input[type="radio"]:not([disabled])';
        let elements = Array.from(searchRoot.querySelectorAll(selector));

        // If a modal is active, explicitly exclude global gameplay buttons that might still be in the DOM
        if (modalContainer) {
            const globalExclusions = ['autoplay-indicator', 'skip-video-btn', 'court-record-btn', 'config-btn'];
            elements = elements.filter(el => !globalExclusions.includes(el.id));
        }

        return elements.filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   parseFloat(style.opacity) > 0.1 && 
                   el.offsetParent !== null;
        });
    }

    function getActiveModalElement() {
        // IDs of containers that should trap focus when visible
        const modals = [
            'evidence-details', 'config-menu', 'history-menu', 
            'gallery-viewer', 'gallery-menu', 'case-select-bottom', 
            'evidence-container'
        ];
        
        for (const id of modals) {
            const el = document.getElementById(id);
            // Use the same robust visibility check as the engine-level blocking check
            if (el && !el.classList.contains('hidden') && 
                window.getComputedStyle(el).display !== 'none' && 
                window.getComputedStyle(el).visibility !== 'hidden') {
                return el;
            }
        }
        return null;
    }

    function moveFocus(direction) {
        // If in investigation examine mode, move the cursor instead
        if (typeof isExamining !== 'undefined' && isExamining && typeof window.moveInvestigationCursor === 'function') {
            window.moveInvestigationCursor(direction);
            return;
        }

        // Special handling for Evidence Details view (Arrow L/R to swap items)
        const evidenceDetails = document.getElementById('evidence-details');
        if (evidenceDetails && !evidenceDetails.classList.contains('hidden')) {
            if (direction === 'LEFT') {
                const btn = document.getElementById('evidence-prev-btn');
                if (btn && !btn.disabled) { btn.click(); return; }
            } else if (direction === 'RIGHT') {
                const btn = document.getElementById('evidence-next-btn');
                if (btn && !btn.disabled) { btn.click(); return; }
            }
            else
                return;
        }

        // Case Select Carousel overrides
        const caseListView = document.getElementById('case-list-view');
        if (caseListView && !caseListView.classList.contains('hidden')) {
            if (direction === 'LEFT') {
                if (window.CaseSelect && window.CaseSelect.prevCase) { window.CaseSelect.prevCase(); return; }
            } else if (direction === 'RIGHT') {
                if (window.CaseSelect && window.CaseSelect.nextCase) { window.CaseSelect.nextCase(); return; }
            }
            else
                return;
        }

        const activeElement = document.activeElement;
        const focusable = getFocusableElements();

        if (focusable.length === 0) return;

        // If nothing focused, focus the first visible element in the current active menu
        if (!activeElement || activeElement === document.body) {
            const activeMenu = getActiveMenuElement();
            const localFocusable = activeMenu ? getFocusableElements(activeMenu) : focusable;
            if (localFocusable.length > 0) localFocusable[0].focus();
            return;
        }

        const currentRect = activeElement.getBoundingClientRect();
        const currentCenter = {
            x: currentRect.left + currentRect.width / 2,
            y: currentRect.top + currentRect.height / 2
        };

        let bestElement = null;
        let minScore = Infinity;

        focusable.forEach(el => {
            if (el === activeElement) return;

            const rect = el.getBoundingClientRect();
            const center = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };

            let isCorrectDirection = false;
            let dParallel = 0;
            let dOrthogonal = 0;

            switch (direction) {
                case 'UP':
                    if (rect.bottom <= currentRect.top + (currentRect.height * 0.25)) {
                        isCorrectDirection = true;
                        dParallel = currentRect.top - rect.bottom;
                        dOrthogonal = Math.abs(center.x - currentCenter.x);
                    }
                    break;
                case 'DOWN':
                    if (rect.top >= currentRect.bottom - (currentRect.height * 0.25)) {
                        isCorrectDirection = true;
                        dParallel = rect.top - currentRect.bottom;
                        dOrthogonal = Math.abs(center.x - currentCenter.x);
                    }
                    break;
                case 'LEFT':
                    if (rect.right <= currentRect.left + (currentRect.width * 0.25)) {
                        isCorrectDirection = true;
                        dParallel = currentRect.left - rect.right;
                        dOrthogonal = Math.abs(center.y - currentCenter.y);
                    }
                    break;
                case 'RIGHT':
                    if (rect.left >= currentRect.right - (currentRect.width * 0.25)) {
                        isCorrectDirection = true;
                        dParallel = rect.left - currentRect.right;
                        dOrthogonal = Math.abs(center.y - currentCenter.y);
                    }
                    break;
            }

            if (isCorrectDirection) {
                // Projection Distance Algorithm: Score = 2 * parallel + orthogonal
                // This prioritizes the "closest" row/column in the direction.
                const score = 2 * dParallel + dOrthogonal;
                if (score < minScore) {
                    minScore = score;
                    bestElement = el;
                }
            }
        });

        if (bestElement) {
            bestElement.focus();
            // Trigger hover-like behavior if it's an evidence slot or gallery item
            if (bestElement.classList.contains('evidence-slot') || bestElement.classList.contains('gallery-grid-item')) {
                bestElement.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            }
        }
    }

    function getActiveMenuElement() {
        const menus = [
            'config-menu', 'history-menu', 'investigation-menu', 'move-menu',
            'topic-menu', 'investigation-panel', 'evidence-container',
            'case-select-bottom', 'gallery-menu', 'title-buttons'
        ];
        for (const id of menus) {
            const el = document.getElementById(id);
            if (el && !el.classList.contains('hidden')) return el;
        }
        return null;
    }

    function handleEnter() {
        if (typeof isExamining !== 'undefined' && isExamining && typeof window.selectInvestigationCursor === 'function') {
            window.selectInvestigationCursor();
            return;
        }

        // Handle Case Select ENTER
        const caseListView = document.getElementById('case-list-view');
        if (caseListView && !caseListView.classList.contains('hidden')) {
            if (window.CaseSelect && window.CaseSelect.selectCurrentCase) {
                window.CaseSelect.selectCurrentCase();
                return;
            }
        }

        const el = document.activeElement;
        if (el && el !== document.body && typeof el.click === 'function') {
            el.click();
        }
    }

    return {
        moveFocus,
        handleEnter,
        getFocusableElements
    };
})();
