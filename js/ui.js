console.log("UI Loaded");

const evidenceContainer = document.getElementById('evidence-container');
const evidenceGrid = document.getElementById('evidence-grid');
const evidenceNameDisplay = document.getElementById('evidence-name-display');
const evidenceDetails = document.getElementById('evidence-details');
const evidenceTitle = document.getElementById('evidence-title');
const evidenceDescription = document.getElementById('evidence-description');

// Popup Elements
const evidencePopup = document.getElementById('evidence-popup');
const popupIcon = document.getElementById('popup-icon');
const popupName = document.getElementById('popup-name');
const popupDesc = document.getElementById('popup-desc');

const topicMenu = document.getElementById('topic-menu');
let isCourtRecordOpen = false;
let wasTopicMenuOpen = false;

// Listen for scene state changes
document.addEventListener('sceneStateChanged', (e) => {
    const isPlaying = e.detail.isPlaying;
    if (isPlaying) {
        textboxContainer.classList.remove('hidden');
    } else {
        textboxContainer.classList.add('hidden');
    }
});

// Listen for evidence added event
document.addEventListener('evidenceAdded', (e) => {
    const key = e.detail.key;
    const item = evidenceDB[key];
    
    if (item) {
        // Show Popup
        popupIcon.src = item.image;
        popupName.textContent = item.name;
        popupDesc.textContent = item.description;
        
        evidencePopup.classList.remove('hidden');
        
        // Refresh grid if open
        if (isCourtRecordOpen) {
            renderEvidence();
        }
    }
});

// Listen for dialogue advance to hide popup
document.addEventListener('dialogueAdvanced', () => {
    if (!evidencePopup.classList.contains('hidden')) {
        evidencePopup.classList.add('hidden');
    }
});

// Court Record Button
courtRecordBtn.addEventListener('click', (e) => {
    isCourtRecordOpen = !isCourtRecordOpen;
    
    if (isCourtRecordOpen) {
        // Check if topic menu is currently open
        if (!topicMenu.classList.contains('hidden')) {
            wasTopicMenuOpen = true;
            topicMenu.classList.add('hidden');
        } else {
            wasTopicMenuOpen = false;
        }

        advanceBtn.classList.add('hidden');
        evidenceContainer.classList.remove('hidden');
        renderEvidence();
    } else {
        evidenceContainer.classList.add('hidden');
        evidenceDetails.classList.add('hidden'); // Hide details if open

        if (wasTopicMenuOpen) {
            topicMenu.classList.remove('hidden');
        } else {
            advanceBtn.classList.remove('hidden');
        }
    }
});

function renderEvidence() {
    evidenceGrid.innerHTML = '';
    evidenceNameDisplay.textContent = ''; // Clear name display
    
    // Create 8 slots (2x4)
    for (let i = 0; i < 8; i++) {
        const slot = document.createElement('div');
        slot.className = 'evidence-slot';
        
        if (i < evidenceInventory.length) {
            const key = evidenceInventory[i];
            const item = evidenceDB[key];
            
            if (item) {
                const img = document.createElement('img');
                img.src = item.image;
                img.alt = item.name;
                
                slot.appendChild(img);
                
                // Hover: Show name
                slot.addEventListener('mouseenter', () => {
                    evidenceNameDisplay.textContent = item.name;
                });
                
                slot.addEventListener('mouseleave', () => {
                    evidenceNameDisplay.textContent = '';
                });
                
                // Click: Show details
                slot.addEventListener('click', () => {
                    showEvidenceDetails(item, key);
                });
            }
        }
        
        evidenceGrid.appendChild(slot);
    }
}

function showEvidenceDetails(item, key) {
    evidenceTitle.textContent = item.name;
    evidenceDescription.textContent = item.description;
    
    // Check/Create Present Button
    let presentBtn = document.getElementById('evidence-present-btn');
    if (!presentBtn) {
        presentBtn = document.createElement('button');
        presentBtn.id = 'evidence-present-btn';
        presentBtn.textContent = "Present";
        presentBtn.className = "topic-button"; // Reuse topic button style
        presentBtn.style.marginTop = "15px";
        presentBtn.style.width = "auto";
        presentBtn.style.padding = "10px 20px";
        evidenceDetails.appendChild(presentBtn);
    }

    // Only show Present button if NOT in a scene (i.e., in menu mode)
    if (!isScenePlaying) {
        presentBtn.classList.remove('hidden');
        
        // Update Present Handler
        presentBtn.onclick = (e) => {
            e.stopPropagation(); // Prevent closing details
            
            // Close Court Record
            isCourtRecordOpen = false;
            evidenceContainer.classList.add('hidden');
            evidenceDetails.classList.add('hidden');
            advanceBtn.classList.remove('hidden'); // Show advance button again (or let engine handle it)
            
            // Trigger Engine Logic
            if (window.handlePresentEvidence) {
                window.handlePresentEvidence(key);
            } else {
                console.error("handlePresentEvidence not defined");
            }
        };
    } else {
        presentBtn.classList.add('hidden');
    }

    evidenceDetails.classList.remove('hidden');
    
    // Click anywhere on details to close
    const closeHandler = (e) => {
        if (e.target !== presentBtn) {
            evidenceDetails.classList.add('hidden');
            evidenceDetails.removeEventListener('click', closeHandler);
        }
    };
    evidenceDetails.addEventListener('click', closeHandler);
}

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

// Topic Menu Logic
// const topicMenu = document.getElementById('topic-menu'); // Moved to top

document.addEventListener('showTopicMenu', () => {
    renderTopics();
    advanceBtn.classList.add('hidden');
    evidenceContainer.classList.add('hidden');
    topicMenu.classList.remove('hidden');
});

function renderTopics() {
    topicMenu.innerHTML = '';
    
    unlockedTopics.forEach(topicId => {
        const topic = topicsDB[topicId];
        if (topic) {
            const btn = document.createElement('button');
            btn.className = 'topic-button';
            btn.textContent = topic.text;
            
            btn.addEventListener('click', () => {
                // Hide menu and jump
                topicMenu.classList.add('hidden');
                advanceBtn.classList.remove('hidden');
                
                jumpToSection(topic.label);
            });
            
            topicMenu.appendChild(btn);
        }
    });
}

