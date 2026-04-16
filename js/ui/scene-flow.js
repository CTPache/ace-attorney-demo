// js/ui/scene-flow.js
// Handles option menu rendering and scene state transitions.
console.log("UI Scene Flow Loaded");

let activeOptionsTimerTimeout = null;
let activeOptionsTimerFrame = null;

function clearOptionsTimer() {
    if (activeOptionsTimerTimeout) {
        clearTimeout(activeOptionsTimerTimeout);
        activeOptionsTimerTimeout = null;
    }

    if (activeOptionsTimerFrame) {
        cancelAnimationFrame(activeOptionsTimerFrame);
        activeOptionsTimerFrame = null;
    }
}

function getOptionTimerConfig(optionData) {
    const rawTime = optionData && optionData.time;

    if (Array.isArray(rawTime) && rawTime.length >= 2) {
        const seconds = Number(rawTime[0]);
        const targetLabel = String(rawTime[1] || '').trim();

        if (Number.isFinite(seconds) && seconds > 0 && targetLabel) {
            return {
                durationMs: seconds * 1000,
                targetLabel
            };
        }
    }

    return null;
}

function startOptionsTimer(timerConfig, timerFill, onExpire) {
    if (!timerConfig || !timerFill || typeof onExpire !== 'function') {
        return;
    }

    clearOptionsTimer();

    const { durationMs } = timerConfig;
    const deadline = performance.now() + durationMs;

    const tick = () => {
        const remainingMs = Math.max(0, deadline - performance.now());
        const progress = durationMs > 0 ? (remainingMs / durationMs) : 0;
        timerFill.style.transform = `scaleX(${progress})`;

        if (remainingMs > 0) {
            activeOptionsTimerFrame = requestAnimationFrame(tick);
        } else {
            activeOptionsTimerFrame = null;
        }
    };

    timerFill.style.transform = 'scaleX(1)';
    activeOptionsTimerFrame = requestAnimationFrame(tick);
    activeOptionsTimerTimeout = setTimeout(() => {
        clearOptionsTimer();
        onExpire(timerConfig.targetLabel);
    }, durationMs);
}

window.clearOptionsTimer = clearOptionsTimer;

window.renderOptionsMenu = function(optionKey) {
    const optionData = optionsDB[optionKey];
    if (!optionData) {
        console.error("Option data not found for key: " + optionKey);
        isTyping = false;
        return;
    }

    if (typeof window.ensureLazyElementMounted === 'function') {
        window.ensureLazyElementMounted('topic-menu', 'topic-menu-template', '#bottom-main-window');
    }
    if (typeof window.refreshDOMGlobals === 'function') {
        window.refreshDOMGlobals();
    }
    if (typeof window.bindTopicEvents === 'function') {
        window.bindTopicEvents();
    }

    // Reuse topicMenu as the container for options
    if (topicMenu) topicMenu.classList.remove('hidden');
    // Hide other overlapping menus if any
    if (investigationMenu) investigationMenu.classList.add('hidden');
    if (investigationPanel) investigationPanel.classList.add('hidden');

    // Hide Advance Button
    advanceBtn.classList.add('hidden');

    // Block interaction
    isInputBlocked = true;
    clearOptionsTimer();

    topicMenu.innerHTML = ''; // Clear previous content

    const closeOptionsMenu = (targetLabel) => {
        clearOptionsTimer();
        isInputBlocked = false;

        if (topicMenu) topicMenu.classList.add('hidden');
        if (typeof window.shelveLazyElement === 'function') {
            window.shelveLazyElement('topic-menu');
        }

        if (targetLabel && window.jumpToSection) {
            jumpToSection(targetLabel);
        }
    };

    // Create a Header (using a localized string instead of option text)
    const headerText = typeof window.t === 'function' ? window.t('ui.optionsHeader', 'Select an option') : 'Select an option';
    const header = document.createElement('div');
    header.className = 'options-header';
    header.textContent = headerText;
    topicMenu.appendChild(header);

    // Render the option text in the main dialogue textbox
    if (optionData.text || optionData.name !== undefined) {
        if (typeof updateDialogue === 'function') {
            updateDialogue({
                name: optionData.name, // undefined naturally clears the nametag, just like regular entries
                text: optionData.text !== undefined ? optionData.text : ''
            });
        } else {
            if (optionData.name && window.nameTag) {
                if (typeof window.setNameTagText === 'function') {
                    window.setNameTagText(optionData.name);
                } else {
                    window.nameTag.textContent = optionData.name;
                }
                window.nameTag.style.display = '';
                window.nameTag.style.opacity = '1';
                window.textboxContainer.classList.remove('no-name');
                if (typeof window.fitNameTagText === 'function') {
                    window.fitNameTagText();
                    requestAnimationFrame(window.fitNameTagText);
                }
            } else if (window.nameTag && !optionData.name) {
                window.nameTag.style.display = 'none';
                window.nameTag.style.opacity = '';
                window.nameTag.style.setProperty('--name-tag-text-scale-x', '1');
                window.textboxContainer.classList.add('no-name');
            }
            if (optionData.text !== undefined) {
                textContent.textContent = optionData.text;
            }
        }
    } else {
        // If neither text nor name is present, restore the last rendered line when available.
        if (window.lastLineHTML && textContent.textContent.trim() === '') {
            textContent.innerHTML = window.lastLineHTML;
            if (window.lastLineName) {
                if (window.nameTag) {
                    if (typeof window.setNameTagText === 'function') {
                        window.setNameTagText(window.lastLineName);
                    } else {
                        window.nameTag.textContent = window.lastLineName;
                    }
                    window.nameTag.style.display = '';
                    window.nameTag.style.opacity = '1';
                    if (typeof window.fitNameTagText === 'function') {
                        window.fitNameTagText();
                        requestAnimationFrame(window.fitNameTagText);
                    }
                }
                window.textboxContainer.classList.remove('no-name');
            } else {
                if (window.nameTag) {
                    window.nameTag.style.display = 'none';
                    window.nameTag.style.opacity = '';
                    window.nameTag.style.setProperty('--name-tag-text-scale-x', '1');
                }
                window.textboxContainer.classList.add('no-name');
            }
        }
    }

    // Render buttons
    if (optionData.options && Array.isArray(optionData.options)) {
        optionData.options.forEach((opt, index) => {
            const btn = document.createElement('button');
            btn.className = 'topic-button';
            btn.textContent = opt.text;

            // Generate a unique key for tracking visited status
            const optionVisitedKey = "option_visited_" + optionKey + "_" + index;

            // Check if option was already visited
            // Use the global gameState object
            if (typeof gameState !== 'undefined' && gameState[optionVisitedKey]) {
                const check = document.createElement('div');
                check.className = 'topic-check';
                check.textContent = '✓';
                btn.appendChild(check);
                btn.classList.add('visited');
            }

            btn.addEventListener('click', () => {
                if (typeof gameState !== 'undefined') {
                    gameState[optionVisitedKey] = true;
                }
                closeOptionsMenu(opt.label);
            });

            topicMenu.appendChild(btn);
        });
    }

    const timerConfig = getOptionTimerConfig(optionData);
    if (timerConfig) {
        const timerBar = document.createElement('div');
        timerBar.className = 'options-timer';
        timerBar.setAttribute('aria-hidden', 'true');

        const timerFill = document.createElement('div');
        timerFill.className = 'options-timer-fill';
        timerBar.appendChild(timerFill);
        topicMenu.appendChild(timerBar);

        startOptionsTimer(timerConfig, timerFill, (targetLabel) => {
            if (!topicMenu || topicMenu.classList.contains('hidden')) {
                return;
            }
            closeOptionsMenu(targetLabel);
        });
    }
};

function isNonGameplayMenuVisible() {
    const titleTop = document.getElementById('title-screen-top');
    const galleryMenu = document.getElementById('gallery-menu');
    const caseSelectTop = document.getElementById('case-select-top');
    const caseSelectBottom = document.getElementById('case-select-bottom');

    return !!(
        (titleTop && !titleTop.classList.contains('hidden')) ||
        (galleryMenu && !galleryMenu.classList.contains('hidden')) ||
        (caseSelectTop && !caseSelectTop.classList.contains('hidden')) ||
        (caseSelectBottom && !caseSelectBottom.classList.contains('hidden'))
    );
}

// Listen for scene state changes
document.addEventListener('sceneStateChanged', (e) => {
    const isPlaying = e.detail.isPlaying;
    if (!isPlaying && typeof window.clearAutoPlayTimer === 'function') {
        window.clearAutoPlayTimer();
    }

    if (!isPlaying) {
        closeConfigMenu();
        closeHistoryMenu(false);
    }

    refreshTopBarButtonDisabledState();

    if (isPlaying) {
        if (autoplayIndicator) autoplayIndicator.classList.remove('hidden');
        if (textboxContainer) textboxContainer.classList.remove('hidden');
        if (investigationMenu) investigationMenu.classList.add('hidden');
        if (moveMenu) moveMenu.classList.add('hidden');
        if (topicMenu) topicMenu.classList.add('hidden');
        if (advanceBtn) advanceBtn.classList.remove('hidden');
        if (investigationPanel) investigationPanel.classList.add('hidden');
        if (bottomTopBar) bottomTopBar.classList.remove('hidden');
        if (gameContainer) gameContainer.classList.remove('investigating');
        if (typeof window.shelveLazyElements === 'function') {
            window.shelveLazyElements(['investigation-menu', 'move-menu', 'topic-menu', 'investigation-panel', 'evidence-container']);
        }
    } else {
        if (autoplayIndicator) autoplayIndicator.classList.add('hidden');
        if (textboxContainer) textboxContainer.classList.add('hidden');
        if (advanceBtn) advanceBtn.classList.add('hidden');

        if (typeof hideLifeBar === 'function') hideLifeBar();

        if (isNonGameplayMenuVisible()) {
            if (investigationMenu) investigationMenu.classList.add('hidden');
            if (moveMenu) moveMenu.classList.add('hidden');
            if (topicMenu) topicMenu.classList.add('hidden');
            if (investigationPanel) investigationPanel.classList.add('hidden');
            if (bottomTopBar) bottomTopBar.classList.add('hidden');
            if (gameContainer) gameContainer.classList.remove('investigating');
            if (typeof window.shelveLazyElements === 'function') {
                window.shelveLazyElements(['investigation-menu', 'move-menu', 'topic-menu', 'investigation-panel', 'evidence-container']);
            }
            if (typeof window.syncMenuInputBlockState === 'function') {
                window.syncMenuInputBlockState();
            }
            return;
        }

        if (isExamining) {
            if (typeof window.ensureLazyElementMounted === 'function') {
                window.ensureLazyElementMounted('investigation-panel', 'investigation-panel-template', '#bottom-main-window');
            }
            if (typeof window.refreshDOMGlobals === 'function') {
                window.refreshDOMGlobals();
            }
            if (typeof window.bindInvestigationUIEvents === 'function') {
                window.bindInvestigationUIEvents();
            }
            if (investigationMenu) investigationMenu.classList.add('hidden');
            if (investigationPanel) investigationPanel.classList.remove('hidden');
            if (topicMenu) topicMenu.classList.add('hidden');
            if (bottomTopBar) bottomTopBar.classList.add('hidden');
            if (gameContainer) gameContainer.classList.add('investigating');
            renderInvestigation();
        } else {
            if (typeof window.ensureLazyElementMounted === 'function') {
                window.ensureLazyElementMounted('investigation-menu', 'investigation-menu-template', '#bottom-main-window');
            }
            if (typeof window.refreshDOMGlobals === 'function') {
                window.refreshDOMGlobals();
            }
            if (typeof window.bindInvestigationUIEvents === 'function') {
                window.bindInvestigationUIEvents();
            }
            if (typeof window.bindTopicEvents === 'function') {
                window.bindTopicEvents();
            }
            if (typeof window.bindCourtRecordEvents === 'function') {
                window.bindCourtRecordEvents();
            }
            if (typeof window.updateActionButtons === 'function') {
                window.updateActionButtons();
            }
            if (investigationMenu) investigationMenu.classList.remove('hidden');
            if (topicMenu) topicMenu.classList.add('hidden');
            if (investigationPanel) investigationPanel.classList.add('hidden');
            if (bottomTopBar) bottomTopBar.classList.remove('hidden');
        }
    }

    if (typeof window.syncMenuInputBlockState === 'function') {
        window.syncMenuInputBlockState();
    }
});
