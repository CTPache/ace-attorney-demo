
console.log('Case Select logic loaded');

let casesData = null;
let selectedCaseKey = null;

window.initCaseSelect = async function() {
    // Hide title screen
    window.hideTitleScreen();

    // Show case select screens
    document.getElementById('case-select-top').classList.remove('hidden');
    document.getElementById('case-select-bottom').classList.remove('hidden');

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
};

window.hideCaseSelect = function() {
    const csTop = document.getElementById('case-select-top');
    const csBottom = document.getElementById('case-select-bottom');
    if (csTop) csTop.classList.add('hidden');
    if (csBottom) csBottom.classList.add('hidden');
};

function renderCaseList() {
    const container = document.getElementById('cases-container');
    container.innerHTML = '';
    
    for (const [key, caseInfo] of Object.entries(casesData)) {
        const btn = document.createElement('button');
        btn.className = 'cs-item-btn';
        btn.textContent = caseInfo.name;
        
        btn.onmouseover = () => {
            document.getElementById('case-select-title').textContent = caseInfo.name;
            if (caseInfo.cover) {
                document.getElementById('case-select-cover').src = caseInfo.cover;
                document.getElementById('case-select-cover').style.display = 'block';
            }
        };

        btn.onclick = () => {
            selectedCaseKey = key;
            renderChapterList(key);
        };
        
        container.appendChild(btn);
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
        btn.onclick = () => {
            loadSelectedChapter(caseKey, chapterKey);
        };

        container.appendChild(btn);
    }
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
            Object.assign(evidenceDB, chapterInfo.courtRecord.evidence);
            evidenceInventory.push(...Object.keys(chapterInfo.courtRecord.evidence));
            // Ensure evidence status reflects in gamestate
            evidenceInventory.forEach(key => {
                gameState['evidence_' + key] = true;
            });
        }
        
        if (typeof profilesDB !== 'undefined' && chapterInfo.courtRecord.profiles) {
            Object.assign(profilesDB, chapterInfo.courtRecord.profiles);
            profilesInventory.push(...Object.keys(chapterInfo.courtRecord.profiles));
        }
    }

    // Start scene
    await window.loadGameData(chapterInfo.scene);
}

// Bind back buttons
document.addEventListener('DOMContentLoaded', () => {
    const backToTitleBtn = document.getElementById('btn-case-select-back');
    if (backToTitleBtn) {
        backToTitleBtn.onclick = () => {
            window.hideCaseSelect();
            if (typeof window.initTitleScreen === 'function') {
                window.initTitleScreen();
            }
        };
    }

    const backToCasesBtn = document.getElementById('btn-chapter-back');
    if (backToCasesBtn) {
        backToCasesBtn.onclick = () => {
            document.getElementById('chapter-list-view').classList.add('hidden');
            document.getElementById('case-list-view').classList.remove('hidden');
            
            // Re-trigger current hover effect for selected case 
            if (selectedCaseKey && casesData[selectedCaseKey]) {
               document.getElementById('case-select-title').textContent = casesData[selectedCaseKey].name;
            }
        };
    }
});

