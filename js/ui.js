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

let isCourtRecordOpen = false;

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
        advanceBtn.classList.add('hidden');
        evidenceContainer.classList.remove('hidden');
        renderEvidence();
    } else {
        advanceBtn.classList.remove('hidden');
        evidenceContainer.classList.add('hidden');
        evidenceDetails.classList.add('hidden'); // Hide details if open
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
                    showEvidenceDetails(item);
                });
            }
        }
        
        evidenceGrid.appendChild(slot);
    }
}

function showEvidenceDetails(item) {
    evidenceTitle.textContent = item.name;
    evidenceDescription.textContent = item.description;
    evidenceDetails.classList.remove('hidden');
    
    // Click anywhere on details to close
    const closeHandler = () => {
        evidenceDetails.classList.add('hidden');
        evidenceDetails.removeEventListener('click', closeHandler);
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
const topicMenu = document.getElementById('topic-menu');

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

