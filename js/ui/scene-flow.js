// js/ui/scene-flow.js
// Handles option menu rendering and scene state transitions.
console.log("UI Scene Flow Loaded");

window.renderOptionsMenu = function(optionKey) {
    const optionData = optionsDB[optionKey];
    if (!optionData) {
        console.error("Option data not found for key: " + optionKey);
        isTyping = false;
        return;
    }

    // Reuse topicMenu as the container for options
    topicMenu.classList.remove('hidden');
    // Hide other overlapping menus if any
    investigationMenu.classList.add('hidden');
    investigationPanel.classList.add('hidden');

    // Hide Advance Button
    advanceBtn.classList.add('hidden');

    // Block interaction
    isInputBlocked = true;

    topicMenu.innerHTML = ''; // Clear previous content

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
                window.currentCharacterName = window.lastLineName;
            } else {
                if (window.nameTag) {
                    window.nameTag.style.display = 'none';
                    window.nameTag.style.opacity = '';
                    window.nameTag.style.setProperty('--name-tag-text-scale-x', '1');
                }
                window.textboxContainer.classList.add('no-name');
                window.currentCharacterName = null;
            }
        }
    }

    // Render buttons
    if (optionData.options && Array.isArray(optionData.options)) {
        optionData.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'topic-button';
            btn.textContent = opt.text;

            btn.addEventListener('click', () => {
                // Unblock interaction
                isInputBlocked = false;

                // Hide menu
                topicMenu.classList.add('hidden');

                // Jump to the selected label
                if (window.jumpToSection) {
                    jumpToSection(opt.label);
                }
            });

            topicMenu.appendChild(btn);
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
        textboxContainer.classList.remove('hidden');
        investigationMenu.classList.add('hidden');
        moveMenu.classList.add('hidden');
        topicMenu.classList.add('hidden');
        advanceBtn.classList.remove('hidden');
        investigationPanel.classList.add('hidden');
        bottomTopBar.classList.remove('hidden');
        gameContainer.classList.remove('investigating');
    } else {
        if (autoplayIndicator) autoplayIndicator.classList.add('hidden');
        textboxContainer.classList.add('hidden');
        advanceBtn.classList.add('hidden');

        if (typeof hideLifeBar === 'function') hideLifeBar();

        if (isNonGameplayMenuVisible()) {
            investigationMenu.classList.add('hidden');
            moveMenu.classList.add('hidden');
            topicMenu.classList.add('hidden');
            investigationPanel.classList.add('hidden');
            bottomTopBar.classList.add('hidden');
            gameContainer.classList.remove('investigating');
            return;
        }

        if (isExamining) {
            investigationMenu.classList.add('hidden');
            investigationPanel.classList.remove('hidden');
            topicMenu.classList.add('hidden');
            bottomTopBar.classList.add('hidden');
            gameContainer.classList.add('investigating');
            renderInvestigation();
        } else {
            investigationMenu.classList.remove('hidden');
            topicMenu.classList.add('hidden');
            investigationPanel.classList.add('hidden');
            bottomTopBar.classList.remove('hidden');
        }
    }
});
