console.log("Court Record Loaded");

// Local State
let currentRecordTab = 'evidence'; // 'evidence' or 'profiles'

function getCurrentRecordData() {
    const currentInventory = (currentRecordTab === 'evidence') ? evidenceInventory : profilesInventory;
    const currentDB = (currentRecordTab === 'evidence') ? evidenceDB : profilesDB;
    return { currentInventory, currentDB };
}

function getSlotFromEventTarget(target) {
    if (!target || !target.closest) return null;
    const slot = target.closest('.evidence-slot');
    const liveEvidenceGrid = document.getElementById('evidence-grid') || evidenceGrid;
    if (!slot || !liveEvidenceGrid || !liveEvidenceGrid.contains(slot)) return null;
    return slot;
}

function shouldKeepEvidenceDetailsOpen(target) {
    if (!target || !target.closest) return false;
    return !!target.closest('#evidence-present-btn, #evidence-prev-btn, #evidence-next-btn');
}

const COURT_RECORD_COLOR_ALIASES = {
    red: '#ff4d4d',
    orange: 'orange',
    yellow: '#ffd700',
    green: '#7CFC00',
    lime: 'lime',
    blue: '#4a90e2',
    lightblue: '#8fd3ff',
    cyan: '#7df9ff',
    purple: '#c792ea',
    pink: '#ff8ad8',
    white: '#ffffff',
    black: '#222222',
    gray: '#aaaaaa',
    grey: '#aaaaaa'
};

function resolveCourtRecordColor(rawValue) {
    const colorValue = String(rawValue || '').trim().toLowerCase();
    if (!colorValue) return null;

    if (['default', 'inherit', 'reset', 'initial', 'auto'].includes(colorValue)) {
        return '';
    }

    if (Object.prototype.hasOwnProperty.call(COURT_RECORD_COLOR_ALIASES, colorValue)) {
        return COURT_RECORD_COLOR_ALIASES[colorValue];
    }

    if (/^#[0-9a-f]{3,8}$/i.test(colorValue)) {
        return colorValue;
    }

    if (/^[a-z]+$/i.test(colorValue)) {
        return colorValue;
    }

    return null;
}

function renderCourtRecordRichText(element, text) {
    if (!element) return;

    const source = text == null ? '' : String(text);
    if (!/(\{nl\}|\{color:[^}]+\}|\r?\n)/.test(source)) {
        element.textContent = source;
        return;
    }

    const fragment = document.createDocumentFragment();
    const tokenRegex = /\{nl\}|\{color:([^}]+)\}|\r?\n/g;
    let currentColor = '';
    let lastIndex = 0;
    let match;

    const appendText = (content) => {
        if (!content) return;
        const span = document.createElement('span');
        span.textContent = content;
        if (currentColor) {
            span.style.color = currentColor;
        }
        fragment.appendChild(span);
    };

    while ((match = tokenRegex.exec(source)) !== null) {
        if (match.index > lastIndex) {
            appendText(source.slice(lastIndex, match.index));
        }

        if (match[0] === '{nl}' || match[0] === '\n' || match[0] === '\r\n') {
            fragment.appendChild(document.createElement('br'));
        } else {
            const resolvedColor = resolveCourtRecordColor(match[1]);
            if (resolvedColor !== null) {
                currentColor = resolvedColor;
            } else {
                appendText(match[0]);
            }
        }

        lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < source.length) {
        appendText(source.slice(lastIndex));
    }

    element.textContent = '';
    element.appendChild(fragment);
}

window.renderCourtRecordRichText = renderCourtRecordRichText;

function showEvidencePopupItem(item) {
    if (!item) return;

    if (typeof window.ensureLazyElementMounted === 'function') {
        window.ensureLazyElementMounted('evidence-popup', 'evidence-popup-template', '#game-container');
    }

    const evidencePopup = document.getElementById('evidence-popup');
    const popupIcon = document.getElementById('popup-icon');
    const popupName = document.getElementById('popup-name');
    const popupDesc = document.getElementById('popup-desc');

    if (!evidencePopup || !popupIcon || !popupName || !popupDesc) return;

    popupIcon.src = item.image;
    popupName.textContent = item.name;
    renderCourtRecordRichText(popupDesc, item.description);
    evidencePopup.classList.remove('hidden');
}

function hideEvidencePopup() {
    const evidencePopup = document.getElementById('evidence-popup');
    if (!evidencePopup) return;
    evidencePopup.classList.add('hidden');
    if (typeof window.shelveLazyElement === 'function') {
        window.shelveLazyElement('evidence-popup');
    }
}

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

function syncCourtRecordModeUI(mode = (isPresentingMode ? 'present' : 'view')) {
    const hasForcedPresentCommand = (typeof window.hasPendingPresentCommand === 'function')
        && window.hasPendingPresentCommand();
    const shouldHideBackButton = mode === 'present' && hasForcedPresentCommand;

    if (btnEvidenceBack) {
        btnEvidenceBack.classList.toggle('hidden', shouldHideBackButton);
        btnEvidenceBack.disabled = shouldHideBackButton;
        btnEvidenceBack.setAttribute('aria-hidden', shouldHideBackButton ? 'true' : 'false');
    }
}

function closeCourtRecord() {
    isCourtRecordOpen = false;
    if (evidenceContainer) evidenceContainer.classList.add('hidden');
    if (evidenceDetails) evidenceDetails.classList.add('hidden');
    if (typeof window.shelveLazyElement === 'function') {
        window.shelveLazyElement('evidence-container');
    }
    if (bottomTopBar) bottomTopBar.classList.remove('hidden');

    if (!isScenePlaying) {
        isPresentingMode = false;
    }

    syncCourtRecordModeUI('view');
    syncCourtRecordDependentControls();
}

function syncActiveRecordTabs() {
    const liveTabs = document.querySelectorAll('#cr-tabs .cr-tab');
    liveTabs.forEach((tab, index) => {
        const tabName = (index === 0) ? 'evidence' : 'profiles';
        tab.classList.toggle('active', currentRecordTab === tabName);
    });
}

function setCurrentRecordTab(tabName) {
    currentRecordTab = (tabName === 'profiles') ? 'profiles' : 'evidence';
    syncActiveRecordTabs();

    if (isCourtRecordOpen) {
        renderEvidence();
    }
}

function bindCourtRecordEvents() {
    if (btnPresent && btnPresent.dataset.boundCourtRecord !== 'true') {
        btnPresent.dataset.boundCourtRecord = 'true';
        btnPresent.addEventListener('click', () => {
            if (typeof window.ensureLazyElementMounted === 'function') {
                window.ensureLazyElementMounted('evidence-container', 'evidence-container-template', '#bottom-main-window');
            }
            if (typeof window.refreshDOMGlobals === 'function') {
                window.refreshDOMGlobals();
            }
            bindCourtRecordEvents();

            evidenceContainer.classList.remove('hidden');
            bottomTopBar.classList.add('hidden');
            isCourtRecordOpen = true;
            isPresentingMode = true;
            syncCourtRecordModeUI('present');
            syncActiveRecordTabs();
            renderEvidence();
            syncCourtRecordDependentControls();
        });
    }

    if (btnEvidenceBack && btnEvidenceBack.dataset.boundCourtRecord !== 'true') {
        btnEvidenceBack.dataset.boundCourtRecord = 'true';
        btnEvidenceBack.addEventListener('click', () => {
            closeCourtRecord();
        });
    }

    if (courtRecordBtn && courtRecordBtn.dataset.boundCourtRecord !== 'true') {
        courtRecordBtn.dataset.boundCourtRecord = 'true';
        courtRecordBtn.addEventListener('click', () => {
            isCourtRecordOpen = !isCourtRecordOpen;

            if (isCourtRecordOpen) {
                openCourtRecord('view');
            } else {
                closeCourtRecord();
            }
        });
    }

    document.querySelectorAll('#cr-tabs .cr-tab').forEach((tab, index) => {
        if (tab.dataset.boundCourtRecord === 'true') return;
        tab.dataset.boundCourtRecord = 'true';
        tab.addEventListener('click', () => {
            setCurrentRecordTab((index === 0) ? 'evidence' : 'profiles');
        });
    });

    const liveEvidenceGrid = document.getElementById('evidence-grid');
    if (liveEvidenceGrid && liveEvidenceGrid.dataset.boundCourtRecord !== 'true') {
        liveEvidenceGrid.dataset.boundCourtRecord = 'true';

        liveEvidenceGrid.addEventListener('mouseover', (e) => {
            const slot = getSlotFromEventTarget(e.target);
            if (!slot || !slot.dataset.key) {
                if (evidenceNameDisplay) evidenceNameDisplay.textContent = '';
                return;
            }

            const { currentDB } = getCurrentRecordData();
            const item = currentDB[slot.dataset.key];
            if (evidenceNameDisplay) evidenceNameDisplay.textContent = item ? item.name : '';
        });

        liveEvidenceGrid.addEventListener('mouseout', (e) => {
            const slot = getSlotFromEventTarget(e.target);
            if (!slot) return;

            const nextSlot = getSlotFromEventTarget(e.relatedTarget);
            if (nextSlot === slot) return;
            if (evidenceNameDisplay) evidenceNameDisplay.textContent = '';
        });

        liveEvidenceGrid.addEventListener('click', (e) => {
            const slot = getSlotFromEventTarget(e.target);
            if (!slot || !slot.dataset.key) return;

            const { currentDB } = getCurrentRecordData();
            const key = slot.dataset.key;
            const item = currentDB[key];
            if (!item) return;

            showEvidenceDetails(item, key);
        });
    }

    const liveEvidenceDetails = document.getElementById('evidence-details');
    if (liveEvidenceDetails && liveEvidenceDetails.dataset.boundCourtRecord !== 'true') {
        liveEvidenceDetails.dataset.boundCourtRecord = 'true';
        liveEvidenceDetails.addEventListener('click', (e) => {
            if (shouldKeepEvidenceDetailsOpen(e.target)) return;
            liveEvidenceDetails.classList.add('hidden');
        });
    }
}

function getCourtRecordSnapshot() {
    return {
        isOpen: !!isCourtRecordOpen,
        tab: currentRecordTab,
        isPresentingMode: !!isPresentingMode
    };
}

function restoreCourtRecordSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
        return false;
    }

    setCurrentRecordTab(snapshot.tab);

    if (snapshot.isOpen) {
        openCourtRecord(snapshot.isPresentingMode ? 'present' : 'view');
    } else {
        closeCourtRecord();
    }

    return true;
}

bindCourtRecordEvents();
window.bindCourtRecordEvents = bindCourtRecordEvents;

function openCourtRecord(mode = 'view') {
    if (typeof window.ensureLazyElementMounted === 'function') {
        window.ensureLazyElementMounted('evidence-container', 'evidence-container-template', '#bottom-main-window');
    }
    if (typeof window.refreshDOMGlobals === 'function') {
        window.refreshDOMGlobals();
    }
    bindCourtRecordEvents();

    isCourtRecordOpen = true;
    isPresentingMode = (mode === 'present');

    if (bottomTopBar) bottomTopBar.classList.add('hidden');
    if (evidenceContainer) evidenceContainer.classList.remove('hidden');
    syncCourtRecordModeUI(mode);
    syncActiveRecordTabs();
    renderEvidence();

    syncCourtRecordDependentControls();
}

window.openCourtRecord = openCourtRecord;
window.getCourtRecordSnapshot = getCourtRecordSnapshot;
window.restoreCourtRecordSnapshot = restoreCourtRecordSnapshot;


// Listen for evidence added event
document.addEventListener('evidenceAdded', (e) => {
    const key = e.detail.key;
    const item = evidenceDB[key];
    
    if (item) {
        showEvidencePopupItem(item);
        
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
        showEvidencePopupItem(item);
        
        // Refresh grid if open
        if (isCourtRecordOpen && currentRecordTab === 'profiles') {
            renderEvidence();
        }
    }
});

// Listen for dialogue advance to hide popup
document.addEventListener('dialogueAdvanced', () => {
    const evidencePopup = document.getElementById('evidence-popup');
    if (evidencePopup && !evidencePopup.classList.contains('hidden')) {
        hideEvidencePopup();
    }
});


function renderEvidence() {
    evidenceGrid.innerHTML = '';
    evidenceNameDisplay.textContent = ''; // Clear name display
    
    const { currentInventory, currentDB } = getCurrentRecordData();

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
                slot.dataset.key = key;
            }
        }
        
        evidenceGrid.appendChild(slot);
    }
}

function showEvidenceDetails(item, key) {
    evidenceTitle.textContent = item.name;
    renderCourtRecordRichText(evidenceDescription, item.description);
    evidenceIconLarge.src = item.image;
    renderCourtRecordRichText(evidenceDataBox, item.data || "");
    
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
    const hasForcedPresentCommand = (typeof window.hasPendingPresentCommand === 'function')
        && window.hasPendingPresentCommand();
    
    if (isPresentingMode || canPresentInCE) {
        presentBtn.classList.remove('hidden');
        
        // Update Present Handler
        presentBtn.onclick = (e) => {
            e.stopPropagation(); // Prevent closing details
            
            // Close Court Record
            isCourtRecordOpen = false;
            evidenceContainer.classList.add('hidden');
            evidenceDetails.classList.add('hidden');
            
            if (hasForcedPresentCommand && window.handlePresentEvidence) {
                window.handlePresentEvidence(key);
            } else if (canPresentInCE) {
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
}
