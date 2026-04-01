console.log("Court Record Loaded");

// Local State
let currentRecordTab = 'evidence'; // 'evidence' or 'profiles'

function syncCourtRecordDependentControls() {
    if (window.CrossExamination) {
        window.CrossExamination.updateUI();
    }

    if (!advanceBtn) {
        return;
    }

    const shouldHideAdvanceForCE = !!(
        window.CrossExamination &&
        window.CrossExamination.isCEMode &&
        window.CrossExamination.isLoopActive &&
        !isCourtRecordOpen
    );

    if (isCourtRecordOpen) {
        advanceBtn.classList.add('hidden');
    } else if (isScenePlaying && !shouldHideAdvanceForCE) {
        advanceBtn.classList.remove('hidden');
    }
}

function closeCourtRecord() {
    isCourtRecordOpen = false;
    evidenceContainer.classList.add('hidden');
    evidenceDetails.classList.add('hidden');
    bottomTopBar.classList.remove('hidden');

    if (!isScenePlaying) {
        isPresentingMode = false;
    }

    syncCourtRecordDependentControls();
}

// Tab Handlers
crTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
        // Update active state
        crTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update logic
        currentRecordTab = (index === 0) ? 'evidence' : 'profiles';
        renderEvidence();
    });
});

// Menu Button Handler (Open in Present Mode)
btnPresent.addEventListener('click', () => {
    evidenceContainer.classList.remove('hidden');
    bottomTopBar.classList.add('hidden'); // Hide top bar
    isCourtRecordOpen = true;
    isPresentingMode = true;
    renderEvidence();
    syncCourtRecordDependentControls();
});

// Back Button Handler
btnEvidenceBack.addEventListener('click', () => {
    closeCourtRecord();
});

function openCourtRecord(mode = 'view') {
    isCourtRecordOpen = true;
    isPresentingMode = (mode === 'present');

    bottomTopBar.classList.add('hidden'); // Hide top bar
    evidenceContainer.classList.remove('hidden');
    renderEvidence();

    syncCourtRecordDependentControls();
}

window.openCourtRecord = openCourtRecord;

// Top Bar Button Handler (Toggle View Mode)
courtRecordBtn.addEventListener('click', (e) => {
    isCourtRecordOpen = !isCourtRecordOpen;

    if (isCourtRecordOpen) {
        openCourtRecord('view');
    } else {
        closeCourtRecord();
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
        if (isCourtRecordOpen && currentRecordTab === 'evidence') {
            renderEvidence();
        }
    }
});

// Listen for profile added event
document.addEventListener('profileAdded', (e) => {
    const key = e.detail.key;
    const item = profilesDB[key];
    
    if (item) {
        // Show Popup
        popupIcon.src = item.image;
        popupName.textContent = item.name;
        popupDesc.textContent = item.description;
        
        evidencePopup.classList.remove('hidden');
        
        // Refresh grid if open
        if (isCourtRecordOpen && currentRecordTab === 'profiles') {
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

function renderEvidence() {
    evidenceGrid.innerHTML = '';
    evidenceNameDisplay.textContent = ''; // Clear name display
    
    const currentInventory = (currentRecordTab === 'evidence') ? evidenceInventory : profilesInventory;
    const currentDB = (currentRecordTab === 'evidence') ? evidenceDB : profilesDB;

    // Create 8 slots (2x4)
    for (let i = 0; i < 8; i++) {
        const slot = document.createElement('div');
        slot.className = 'evidence-slot';
        
        if (i < currentInventory.length) {
            const key = currentInventory[i];
            const item = currentDB[key];
            
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
    evidenceIconLarge.src = item.image;
    evidenceDataBox.textContent = item.data || "";
    
    // Navigation Logic
    const currentInventory = (currentRecordTab === 'evidence') ? evidenceInventory : profilesInventory;
    const currentDB = (currentRecordTab === 'evidence') ? evidenceDB : profilesDB;
    const currentIndex = currentInventory.indexOf(key);

    // Previous Button
    if (currentIndex > 0) {
        btnPrevEvidence.disabled = false;
        btnPrevEvidence.onclick = (e) => {
            e.stopPropagation();
            const prevKey = currentInventory[currentIndex - 1];
            showEvidenceDetails(currentDB[prevKey], prevKey);
        };
    } else {
        btnPrevEvidence.disabled = true;
        btnPrevEvidence.onclick = null;
    }

    // Next Button
    if (currentIndex < currentInventory.length - 1) {
        btnNextEvidence.disabled = false;
        btnNextEvidence.onclick = (e) => {
            e.stopPropagation();
            const nextKey = currentInventory[currentIndex + 1];
            showEvidenceDetails(currentDB[nextKey], nextKey);
        };
    } else {
        btnNextEvidence.disabled = true;
        btnNextEvidence.onclick = null;
    }

    // Check/Create Present Button
    let presentBtn = document.getElementById('evidence-present-btn');
    if (!presentBtn) {
        presentBtn = document.createElement('button');
        presentBtn.id = 'evidence-present-btn';
        evidenceDetails.appendChild(presentBtn);
    }
    presentBtn.textContent = window.t('ui.present', 'Present');

    // Only show Present button if in presenting mode
    // (Either via investigation menu or CE mode)
    const canPresentInCE = (window.CrossExamination && window.CrossExamination.isCEMode);
    
    if (isPresentingMode || canPresentInCE) {
        presentBtn.classList.remove('hidden');
        
        // Update Present Handler
        presentBtn.onclick = (e) => {
            e.stopPropagation(); // Prevent closing details
            
            // Close Court Record
            isCourtRecordOpen = false;
            evidenceContainer.classList.add('hidden');
            evidenceDetails.classList.add('hidden');
            
            if (canPresentInCE) {
                window.CrossExamination.present(key);
            } else if (window.handlePresentEvidence) {
                window.handlePresentEvidence(key);
            } else {
                console.error("No presentation handler found");
            }
        };
    } else {
        presentBtn.classList.add('hidden');
    }

    evidenceDetails.classList.remove('hidden');
    
    // Click anywhere on details to close
    const closeHandler = (e) => {
        // Don't close if clicking nav buttons or present button
        if (e.target !== presentBtn && 
            e.target !== btnPrevEvidence && 
            e.target !== btnNextEvidence) {
            evidenceDetails.classList.add('hidden');
            evidenceDetails.removeEventListener('click', closeHandler);
        }
    };
    evidenceDetails.addEventListener('click', closeHandler);
}
