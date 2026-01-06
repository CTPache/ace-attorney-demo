console.log("UI Loaded");

// Shared logic for scene state only

// Function to handle Option Selection Menu
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

    // Create a Header
    if (optionData.text) {
        const header = document.createElement('div');
        header.className = 'options-header';
        header.textContent = optionData.text;
        topicMenu.appendChild(header);
    }

    // Render Buttons
    if (optionData.options && Array.isArray(optionData.options)) {
        optionData.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'topic-button'; // Reuse existing button class
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
}

// Listen for scene state changes
document.addEventListener('sceneStateChanged', (e) => {
    const isPlaying = e.detail.isPlaying;
    if (isPlaying) {
        textboxContainer.classList.remove('hidden');
        investigationMenu.classList.add('hidden');
        topicMenu.classList.add('hidden');
        advanceBtn.classList.remove('hidden');
        investigationPanel.classList.add('hidden');
        bottomTopBar.classList.remove('hidden'); // Ensure top bar is visible during dialogue
        gameContainer.classList.remove('investigating');
    } else {
        textboxContainer.classList.add('hidden');
        advanceBtn.classList.add('hidden');
        
        // Hide Life Bar on scene end
        if (typeof hideLifeBar === 'function') hideLifeBar();
        
        if (isExamining) {

            // Return to examine mode
            investigationMenu.classList.add('hidden');
            investigationPanel.classList.remove('hidden');
            topicMenu.classList.add('hidden');
            bottomTopBar.classList.add('hidden'); // Hide top bar in examine mode
            gameContainer.classList.add('investigating');
            renderInvestigation(); // Refresh background and points
        } else {
            // Show Main Menu by default
            investigationMenu.classList.remove('hidden');
            topicMenu.classList.add('hidden');
            investigationPanel.classList.add('hidden');
            bottomTopBar.classList.remove('hidden'); // Ensure top bar is visible in menu
        }
    }
});

// Advance Button Logic
function startFastForward() {
    // Immediate advance on click
    advanceDialogue(true);

    if (isFastForwarding) return;

    // Start delay timer for fast forward
    fastForwardTimeout = setTimeout(() => {
        isFastForwarding = true;
        advanceBtn.textContent = "🞂🞂";
        
        // Loop
        fastForwardInterval = setInterval(() => {
            advanceDialogue(true);
        }, 100);
    }, 500);
}

function stopFastForward() {
    if (fastForwardTimeout) {
        clearTimeout(fastForwardTimeout);
        fastForwardTimeout = null;
    }

    isFastForwarding = false;
    advanceBtn.textContent = "▶";
    if (fastForwardInterval) {
        clearInterval(fastForwardInterval);
        fastForwardInterval = null;
    }
}

advanceBtn.addEventListener('mousedown', startFastForward);
advanceBtn.addEventListener('mouseup', stopFastForward);
advanceBtn.addEventListener('mouseleave', stopFastForward);

// Touch support
advanceBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startFastForward();
});
advanceBtn.addEventListener('touchend', stopFastForward);

// Topic logic moved to topics.js

