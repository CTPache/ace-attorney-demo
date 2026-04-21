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
            'modal-overlay', 'evidence-details', 'config-menu', 'history-menu', 
            'end-game-overlay', 'gallery-viewer', 'gallery-menu', 
            'case-select-bottom', 'evidence-container', 'evidence-popup'
        ];
        
        for (const id of modals) {
            const el = document.getElementById(id);
            if (!el) continue;

            // Prioritize the .hidden class which is updated synchronously
            if (el.classList.contains('hidden')) continue;
            
            // Fallback to computed style check for elements hidden by other means
            const style = window.getComputedStyle(el);
            if (style.display !== 'none' && style.visibility !== 'hidden') {
                return el;
            }
        }
        return null;
    }

    function moveFocus(direction) {
        const modalContainer = getActiveModalElement();

        // If in investigation examine mode, move the cursor instead
        if (!modalContainer && typeof isExamining !== 'undefined' && isExamining && typeof window.moveInvestigationCursor === 'function') {
            window.moveInvestigationCursor(direction);
            return;
        }

        // Special handling for Evidence Details view (Arrow L/R to swap items)
        const evidenceDetails = document.getElementById('evidence-details');
        if (!modalContainer && evidenceDetails && !evidenceDetails.classList.contains('hidden')) {
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
        if (!modalContainer && caseListView && !caseListView.classList.contains('hidden')) {
            if (direction === 'LEFT') {
                // User wants LEFT to advance: (current + 1)
                if (window.CaseSelect && window.CaseSelect.nextCase) { window.CaseSelect.nextCase(); return; }
            } else if (direction === 'RIGHT') {
                // User wants RIGHT to go back: (current - 1)
                if (window.CaseSelect && window.CaseSelect.prevCase) { window.CaseSelect.prevCase(); return; }
            }
            else
                return;
        }

        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === 'SELECT' && activeElement.size > 1) {
            // Allow arrow keys to change selection within the SELECT list
            if (direction === 'UP' && activeElement.selectedIndex > 0) {
                activeElement.selectedIndex--;
                activeElement.dispatchEvent(new Event('change', { bubbles: true }));
                return;
            } else if (direction === 'DOWN' && activeElement.selectedIndex < activeElement.options.length - 1) {
                activeElement.selectedIndex++;
                activeElement.dispatchEvent(new Event('change', { bubbles: true }));
                return;
            }
        }

        const focusable = getFocusableElements();

        if (focusable.length === 0) return;

        // If nothing focused, focus the first visible element in the current active menu
        if (!activeElement || activeElement === document.body || !document.contains(activeElement)) {
            const activeMenu = getActiveMenuElement() || getActiveModalElement();
            const localFocusable = activeMenu ? getFocusableElements(activeMenu) : focusable;
            if (localFocusable.length > 0) {
                localFocusable[0].focus();
            }
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
            if (bestElement.tagName === 'INPUT' && bestElement.type === 'radio') {
                bestElement.click();
            }
            // Trigger hover-like behavior if it's an evidence slot or gallery item
            if (bestElement.classList.contains('evidence-slot') || bestElement.classList.contains('gallery-grid-item')) {
                bestElement.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            }
        }
    }

    function getActiveMenuElement() {
        const menus = [
            'modal-overlay', 'config-menu', 'history-menu', 'investigation-menu', 'move-menu',
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
        const modalContainer = getActiveModalElement();

        if (typeof isExamining !== 'undefined' && isExamining && typeof window.selectInvestigationCursor === 'function') {
            window.selectInvestigationCursor();
            return;
        }

        // Handle Case Select ENTER
        const caseListView = document.getElementById('case-list-view');
        if (!modalContainer && caseListView && !caseListView.classList.contains('hidden')) {
            if (window.CaseSelect && window.CaseSelect.selectCurrentCase) {
                window.CaseSelect.selectCurrentCase();
                return;
            }
        }

        const el = document.activeElement;
        if (!el || el === document.body) return;

        if (el.tagName === 'SELECT') {
            if (el.size === 1 || !el.size) {
                el.size = el.options ? el.options.length : 1;
                el.focus();
            } else {
                el.size = 1;
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
            return;
        }

        if (el.tagName === 'INPUT' && el.type === 'radio') {
            if (typeof window.closeConfigMenu === 'function') {
                window.closeConfigMenu();
            }
            return;
        }

        if (typeof el.click === 'function') {
            el.click();
        }
    }

    return {
        moveFocus,
        handleEnter,
        getFocusableElements,
        getActiveModalElement
    };
})();
