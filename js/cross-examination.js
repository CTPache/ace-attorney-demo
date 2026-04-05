/**
 * js/cross-examination.js
 * Manages the state and logic for Cross-Examination mode.
 */

window.CrossExamination = (function() {
    let activeCE = null;
    let currentIndex = 0;
    let isCEMode = false;
    let isLoopActive = false; // Whether the testimony loop is active (not in a sub-sequence)
    let crossExams = {}; // Loaded from scene JSON

    function buildActiveStatementIds(ce) {
        if (!ce) return [];

        if (ce.initialStatements) {
            return [...ce.initialStatements].map(id => String(id));
        }

        if (Array.isArray(ce.statements)) {
            return ce.statements.map((_, i) => String(i));
        }

        return Object.keys(ce.statements || {}).map(id => String(id));
    }

    function init(data) {
        crossExams = data || {};
        isCEMode = false;
        isLoopActive = false;
        activeCE = null;
        currentIndex = 0;
    }

    function start(id) {
        if (!crossExams[id]) {
            console.error(`Cross Examination ${id} not found.`);
            return false;
        }
        activeCE = crossExams[id];
        activeCE.activeStatementIds = buildActiveStatementIds(activeCE);

        currentIndex = 0;
        isCEMode = true;
        isLoopActive = true;
        
        document.body.classList.add('ce-mode');
        playStatement();
        updateUI();
        return true;
    }

    function exit() {
        isCEMode = false;
        isLoopActive = false;
        activeCE = null;
        document.body.classList.remove('ce-mode');
        updateUI();
    }

    function next() {
        if (!isCEMode || !activeCE) return;
        const len = activeCE.activeStatementIds.length;
        currentIndex = (currentIndex + 1) % len;
        playStatement();
    }

    function prev() {
        if (!isCEMode || !activeCE) return;
        const len = activeCE.activeStatementIds.length;
        currentIndex = (currentIndex - 1 + len) % len;
        playStatement();
    }

    function returnToCE(statementId) {
        if (window.isGameOverPending) {
            exit();
            if (typeof window.jumpToSection === 'function' && typeof gameOverLabel !== 'undefined') {
                window.jumpToSection(gameOverLabel);
            }
            return false;
        }

        if (!activeCE || !Array.isArray(activeCE.activeStatementIds) || activeCE.activeStatementIds.length === 0) {
            console.warn('Cannot return to cross-examination without an active testimony.');
            isLoopActive = false;
            updateUI();
            return false;
        }

        if (statementId) {
            const idx = activeCE.activeStatementIds.indexOf(String(statementId));
            if (idx !== -1) {
                currentIndex = idx;
            }
        }
        isLoopActive = true;
        playStatement();
        updateUI();
        return true;
    }

    function playStatement() {
        const statementId = activeCE.activeStatementIds[currentIndex];
        const statement = activeCE.statements[statementId];
        if (!statement) return;

        // Use the standard engine updateDialogue if available, 
        // or trigger a custom render event.
        if (window.updateDialogue) {
            window.updateDialogue({
                name: statement.name || activeCE.witnessName,
                text: statement.text
            });
        }
        
        updateUI();
    }

    function press() {
        if (!isCEMode || !isLoopActive || !activeCE) return;
        const statementId = activeCE.activeStatementIds[currentIndex];
        const statement = activeCE.statements[statementId];
        if (statement.press && window.jumpToSection) {
            isLoopActive = false;
            updateUI();
            window.jumpToSection(statement.press);
        }
    }

    function present(evidenceId) {
        if (!isCEMode || !isLoopActive || !activeCE) return;
        const statementId = activeCE.activeStatementIds[currentIndex];
        const statement = activeCE.statements[statementId];
        
        let target = null;
        if (statement.present && statement.present[evidenceId]) {
            target = statement.present[evidenceId];
        } else if (activeCE.defaultPresent) {
            target = activeCE.defaultPresent;
        }

        if (target && window.jumpToSection) {
            isLoopActive = false;
            updateUI();
            window.jumpToSection(target);
        } else {
            // Default penalty logic if no match and no default target
            if (activeCE.failSequence && window.jumpToSection) {
                isLoopActive = false;
                updateUI();
                window.jumpToSection(activeCE.failSequence);
            } else if (window.modifyLife) {
                window.modifyLife(-1);
            }
        }
    }

    function addStatement(ceId, statementId, statementBody, index = -1) {
        const ce = crossExams[ceId] || activeCE;
        if (!ce) return;
        
        ce.statements[statementId] = statementBody;
        
        if (index === -1) {
            ce.activeStatementIds.push(statementId);
        } else {
            ce.activeStatementIds.splice(index, 0, statementId);
        }
    }

    function replaceStatement(ceId, targetId, newId) {
        // Handle case where we pass an object (old way) vs ID (new way)
        const ce = crossExams[ceId] || activeCE;
        if (!ce) return;

        // New system: replace by ID
        if (typeof targetId === 'string' || typeof targetId === 'number') {
            const idx = ce.activeStatementIds.indexOf(String(targetId));
            if (idx !== -1) {
                ce.activeStatementIds[idx] = String(newId);
                // If we are currently on this statement, it's safer to refresh when we return from the sequence
            }
        } 
        // Backward compatibility: targetId as index, newId as statement object
        else if (typeof targetId === 'number' && typeof newId === 'object') {
            const idx = targetId;
            const stmtId = ce.activeStatementIds[idx];
            if (stmtId) {
                ce.statements[stmtId] = newId;
            }
        }
    }

    function buildSnapshot() {
        let activeCEId = null;

        if (activeCE) {
            activeCEId = Object.keys(crossExams).find((id) => crossExams[id] === activeCE) || null;
        }

        return {
            isActive: !!(isCEMode && activeCE),
            activeCEId,
            currentIndex,
            isLoopActive,
            activeStatementIds: (activeCE && Array.isArray(activeCE.activeStatementIds))
                ? [...activeCE.activeStatementIds].map(id => String(id))
                : []
        };
    }

    function restoreSnapshot(snapshot, options = {}) {
        if (!snapshot || !snapshot.isActive || !snapshot.activeCEId) {
            return false;
        }

        const shouldReplayCurrentStatement = options.replayCurrentStatement !== false;
        const ce = crossExams[snapshot.activeCEId];
        if (!ce) {
            console.warn(`Cross Examination ${snapshot.activeCEId} could not be restored.`);
            return false;
        }

        activeCE = ce;
        activeCE.activeStatementIds = buildActiveStatementIds(activeCE);

        if (Array.isArray(snapshot.activeStatementIds) && snapshot.activeStatementIds.length > 0) {
            activeCE.activeStatementIds = snapshot.activeStatementIds.map(id => String(id));
        }

        const statementCount = activeCE.activeStatementIds.length;
        currentIndex = 0;
        if (typeof snapshot.currentIndex === 'number' && statementCount > 0) {
            const normalizedIndex = Math.trunc(snapshot.currentIndex);
            currentIndex = Math.min(Math.max(normalizedIndex, 0), statementCount - 1);
        }

        isCEMode = true;
        isLoopActive = snapshot.isLoopActive !== undefined ? !!snapshot.isLoopActive : true;

        document.body.classList.add('ce-mode');

        if (isLoopActive && statementCount > 0 && shouldReplayCurrentStatement) {
            playStatement();
        } else {
            updateUI();
        }

        return true;
    }

    function updateUI() {
        const shouldShow = isCEMode && isLoopActive && (!window.isCourtRecordOpen);

        if (shouldShow && typeof window.ensureLazyElementMounted === 'function') {
            window.ensureLazyElementMounted('ce-controls', 'ce-controls-template', '#bottom-top-bar');
            window.ensureLazyElementMounted('ce-arrow-container', 'ce-arrow-container-template', '#bottom-main-window');
            if (window.CE_UI && typeof window.CE_UI.init === 'function') {
                window.CE_UI.init();
            }
        }

        const ceControls = document.getElementById('ce-controls');
        const ceBottomControls = document.getElementById('ce-bottom-controls');
        const ceArrowContainer = document.getElementById('ce-arrow-container');
        const cePrevArrow = document.getElementById('ce-prev-arrow');
        const ceNextArrow = document.getElementById('ce-next-arrow');
        const courtRecordBtn = document.getElementById('court-record-btn');
        const advanceBtn = document.getElementById('advance-btn');

        const statementCount = activeCE && Array.isArray(activeCE.activeStatementIds)
            ? activeCE.activeStatementIds.length
            : 0;
        const isFirstStatement = currentIndex <= 0;
        const hasMultipleStatements = statementCount > 1;

        if (ceControls) ceControls.classList.toggle('hidden', !shouldShow);
        if (ceBottomControls) ceBottomControls.classList.toggle('hidden', !shouldShow);
        if (ceArrowContainer) ceArrowContainer.classList.toggle('hidden', !shouldShow);
        if (cePrevArrow) cePrevArrow.classList.toggle('hidden', !shouldShow || !hasMultipleStatements || isFirstStatement);
        if (ceNextArrow) ceNextArrow.classList.toggle('hidden', !shouldShow || !hasMultipleStatements);
        if (courtRecordBtn) courtRecordBtn.classList.toggle('hidden', shouldShow);
        if (advanceBtn) advanceBtn.classList.toggle('hidden', shouldShow);

        if (!shouldShow && typeof window.shelveLazyElements === 'function') {
            window.shelveLazyElements(['ce-controls', 'ce-arrow-container']);
        }
    }

    function setLoopActive(active) {
        isLoopActive = active;
        updateUI();
    }

    return {
        init,
        start,
        exit,
        returnToCE,
        next,
        prev,
        press,
        present,
        addStatement,
        replaceStatement,
        setLoopActive,
        updateUI,
        buildSnapshot,
        restoreSnapshot,
        get activeCE() { return activeCE; },
        get isCEMode() { return isCEMode; },
        get isLoopActive() { return isLoopActive; },
        get currentIndex() { return currentIndex; }
    };
})();
