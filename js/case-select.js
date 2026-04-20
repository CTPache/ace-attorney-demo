
console.log('Case Select logic loaded');

let casesData = null;
let selectedCaseKey = null;

function ensureCaseSelectDOM() {
    if (typeof window.ensureLazyElementMounted === 'function') {
        window.ensureLazyElementMounted('case-select-top', 'case-select-top-template', '#game-container');
        window.ensureLazyElementMounted('case-select-bottom', 'case-select-bottom-template', '#bottom-screen');
    }

    bindCaseSelectEvents();
}

function bindCaseSelectEvents() {
    const coverEl = document.getElementById('case-select-cover');
    if (coverEl && coverEl.dataset.boundCaseSelect !== 'true') {
        coverEl.dataset.boundCaseSelect = 'true';
        coverEl.onclick = (e) => {
            e.stopPropagation();
            const caseListView = document.getElementById('case-list-view');
            if (caseKeys.length > 0 && caseListView && !caseListView.classList.contains('hidden')) {
                selectedCaseKey = caseKeys[currentCaseIndex];
                renderChapterList(selectedCaseKey);
            }
        };
    }

    const backToTitleBtn = document.getElementById('btn-case-select-back');
    if (backToTitleBtn && backToTitleBtn.dataset.boundCaseSelect !== 'true') {
        backToTitleBtn.dataset.boundCaseSelect = 'true';
        backToTitleBtn.onclick = (e) => {
            e.stopPropagation();
            window.hideCaseSelect();
            if (typeof window.initTitleScreen === 'function') {
                window.initTitleScreen();
            }
        };
    }

    const backToCasesBtn = document.getElementById('btn-chapter-back');
    if (backToCasesBtn && backToCasesBtn.dataset.boundCaseSelect !== 'true') {
        backToCasesBtn.dataset.boundCaseSelect = 'true';
        backToCasesBtn.onclick = (e) => {
            e.stopPropagation();
            const chapterListView = document.getElementById('chapter-list-view');
            const caseListView = document.getElementById('case-list-view');
            if (chapterListView) chapterListView.classList.add('hidden');
            if (caseListView) caseListView.classList.remove('hidden');

            if (typeof updateCarouselView === 'function') {
                updateCarouselView();
            }
        };
    }
}

window.initCaseSelect = async function() {
    ensureCaseSelectDOM();

    // Hide title screen
    window.hideTitleScreen();

    // Show case select screens
    const caseSelectTop = document.getElementById('case-select-top');
    const caseSelectBottom = document.getElementById('case-select-bottom');
    if (caseSelectTop) caseSelectTop.classList.remove('hidden');
    if (caseSelectBottom) caseSelectBottom.classList.remove('hidden');

    // Reset views
    document.getElementById('case-list-view').classList.remove('hidden');
    document.getElementById('chapter-list-view').classList.add('hidden');
    
    // Clear top screen defaults
    document.getElementById('case-select-title').textContent = window.t ? window.t('ui.caseSelect', 'Case Select') : 'Case Select';
    document.getElementById('case-select-cover').src = '';
    document.getElementById('case-select-cover').style.display = 'none';

    // Fetch cases.json if not already loaded
    if (!casesData) {
        try {
            const resp = await fetch('assets/cases.json');
            if (resp.ok) {
                const data = await resp.json();
                casesData = data.cases || {};
            } else {
                console.error('Failed to load cases.json');
                return;
            }
        } catch (e) {
            console.error(e);
            return;
        }
    }

    renderCaseList();
    if (typeof window.syncMenuInputBlockState === 'function') {
        window.syncMenuInputBlockState();
    }
};

window.hideCaseSelect = function() {
    const csTop = document.getElementById('case-select-top');
    const csBottom = document.getElementById('case-select-bottom');
    if (csTop) csTop.classList.add('hidden');
    if (csBottom) csBottom.classList.add('hidden');

    if (typeof window.unmountLazyElements === 'function') {
        window.unmountLazyElements(['case-select-top', 'case-select-bottom']);
    }

    if (typeof window.syncMenuInputBlockState === 'function') {
        window.syncMenuInputBlockState();
    }
};

let currentCaseIndex = 0;
let caseKeys = [];

function renderCaseList() {
    const container = document.getElementById("cases-container");
    container.innerHTML = "";
    
    caseKeys = Object.keys(casesData);
    if(caseKeys.length === 0) return;
    
    if (selectedCaseKey) {
        let idx = caseKeys.indexOf(selectedCaseKey);
        if (idx !== -1) currentCaseIndex = idx;
    } else {
        currentCaseIndex = 0;
    }

    const navDiv = document.createElement("div");
    navDiv.className = "cs-carousel-nav";
    
    const prevBtn = document.createElement("button");
    prevBtn.className = "cs-arrow-btn";
    prevBtn.textContent = "◀";
    prevBtn.onclick = (e) => {
        e.stopPropagation();
        currentCaseIndex = (currentCaseIndex - 1 + caseKeys.length) % caseKeys.length;
        updateCarouselView();
    };

    const labelDiv = document.createElement("div");
    labelDiv.className = "cs-carousel-label";
    labelDiv.id = "carousel-case-label";

    const nextBtn = document.createElement("button");
    nextBtn.className = "cs-arrow-btn";
    nextBtn.textContent = "▶";
    nextBtn.onclick = (e) => {
        e.stopPropagation();
        currentCaseIndex = (currentCaseIndex + 1) % caseKeys.length;
        updateCarouselView();
    };

    navDiv.appendChild(prevBtn);
    navDiv.appendChild(labelDiv);
    navDiv.appendChild(nextBtn);
    container.appendChild(navDiv);

    const selectBtn = document.createElement("button");
    selectBtn.className = "cs-item-btn cs-carousel-select";
    selectBtn.textContent = window.t ? window.t("ui.selectCase", "Select Case") : "Select Case";
    selectBtn.onclick = (e) => {
        e.stopPropagation();
        selectedCaseKey = caseKeys[currentCaseIndex];
        renderChapterList(selectedCaseKey);
    };
    container.appendChild(selectBtn);

    updateCarouselView();

    // Focus select button
    setTimeout(() => {
        selectBtn.focus();
    }, 10);
}

function updateCarouselView() {
    if (caseKeys.length === 0) return;
    const key = caseKeys[currentCaseIndex];
    const caseInfo = casesData[key];
    
    const labelEl = document.getElementById("carousel-case-label");
    if (labelEl) labelEl.textContent = caseInfo.name;
    
    const titleEl = document.getElementById("case-select-title");
    if (titleEl) titleEl.textContent = caseInfo.name;
    
    const coverEl = document.getElementById("case-select-cover");
    if (coverEl) {
        if (caseInfo.cover) {
            coverEl.src = caseInfo.cover;
            coverEl.style.display = "block";
        } else {
            coverEl.style.display = "none";
            coverEl.src = "";
        }
    }
}

function renderChapterList(caseKey) {
    const caseInfo = casesData[caseKey];
    document.getElementById('case-list-view').classList.add('hidden');
    document.getElementById('chapter-list-view').classList.remove('hidden');

    const container = document.getElementById('chapters-container');
    container.innerHTML = '';

    for (const [chapterKey, chapterInfo] of Object.entries(caseInfo.Chapters)) {
        const btn = document.createElement('button');
        btn.className = 'cs-item-btn';
        btn.textContent = chapterInfo.name || chapterKey;
        btn.onclick = (e) => {
            e.stopPropagation();
            loadSelectedChapter(caseKey, chapterKey);
        };

        container.appendChild(btn);
    }

    // Focus first button with slight delay
    setTimeout(() => {
        const firstBtn = container.querySelector('.cs-item-btn');
        if (firstBtn) firstBtn.focus();
    }, 50);
}

async function loadSelectedChapter(caseKey, chapterKey) {
    const caseInfo = casesData[caseKey];
    const chapterInfo = caseInfo.Chapters[chapterKey];

    if (!chapterInfo || !chapterInfo.scene) {
        alert('Invalid chapter configuration.');
        return;
    }

    // Hide Case Select Screen
    window.hideCaseSelect();

    // Prepare court record and state overrides if needed
    // The engine globals.js holds evidenceInventory, profilesInventory
    // We should probably just initialize them here before loadGameData.
    
    if (chapterInfo.courtRecord) {
        // Clear global inventory safely by mutating the existing variables directly 
        // since they are defined with 'let' in globals.js and shared in the same execution context.
        if (typeof evidenceInventory !== 'undefined') {
            evidenceInventory.length = 0;
        }
        if (typeof profilesInventory !== 'undefined') {
            profilesInventory.length = 0;
        }
        
        // Let's also reset gamestate
        if (typeof gameState !== 'undefined') {
            for (let k in gameState) delete gameState[k];
        }

        // Populate
        if (typeof evidenceDB !== 'undefined' && chapterInfo.courtRecord.evidence) {
            for (const key in evidenceDB) delete evidenceDB[key];
            Object.assign(evidenceDB, chapterInfo.courtRecord.evidence);
            evidenceInventory.push(...Object.keys(chapterInfo.courtRecord.evidence));
            // Ensure evidence status reflects in gamestate
            evidenceInventory.forEach(key => {
                gameState['evidence_' + key] = true;
            });
        }
        
        if (typeof profilesDB !== 'undefined' && chapterInfo.courtRecord.profiles) {
            for (const key in profilesDB) delete profilesDB[key];
            Object.assign(profilesDB, chapterInfo.courtRecord.profiles);
            profilesInventory.push(...Object.keys(chapterInfo.courtRecord.profiles));
        }
    }

    // Start scene
    await window.loadGameData(chapterInfo.scene);
}

// State Management
window.CaseSelectState = {
    get currentCaseIndex() { return currentCaseIndex; },
    set currentCaseIndex(v) { currentCaseIndex = v; },
    get caseKeys() { return caseKeys; }
};

window.CaseSelect = {
    nextCase: () => {
        if (caseKeys.length === 0) return;
        currentCaseIndex = (currentCaseIndex + 1) % caseKeys.length;
        updateCarouselView();
    },
    prevCase: () => {
        if (caseKeys.length === 0) return;
        currentCaseIndex = (currentCaseIndex - 1 + caseKeys.length) % caseKeys.length;
        updateCarouselView();
    },
    selectCurrentCase: () => {
        const caseListView = document.getElementById('case-list-view');
        if (caseKeys.length > 0 && caseListView && !caseListView.classList.contains('hidden')) {
            selectedCaseKey = caseKeys[currentCaseIndex];
            renderChapterList(selectedCaseKey);
        }
    }
};

// Events are bound when the lazy-mounted case select DOM is created.

