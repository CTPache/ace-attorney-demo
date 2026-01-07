console.log("Investigation Loaded");

let currentInvestigationDefault = null;

// Investigation Menu Handlers
btnExamine.addEventListener('click', () => {
    investigationMenu.classList.add('hidden');
    investigationPanel.classList.remove('hidden');
    bottomTopBar.classList.add('hidden'); // Hide top bar
    gameContainer.classList.add('investigating');
    isExamining = true;
    renderInvestigation();
});

btnInvestigationBack.addEventListener('click', (e) => {
    e.stopPropagation();
    isExamining = false;
    investigationPanel.classList.add('hidden');
    investigationMenu.classList.remove('hidden');
    bottomTopBar.classList.remove('hidden'); // Show top bar
    gameContainer.classList.remove('investigating');
});

btnMove.addEventListener('click', () => {
    investigationMenu.classList.add('hidden');
    moveMenu.classList.remove('hidden');
    renderMoveMenu();
});

btnMoveBack.addEventListener('click', () => {
    moveMenu.classList.add('hidden');
    investigationMenu.classList.remove('hidden');
});

function renderMoveMenu() {
    moveList.innerHTML = '';
    
    const currentLocData = investigations[currentBackgroundKey];
    const moveOptions = (currentLocData && currentLocData.move) ? currentLocData.move : [];

    if (moveOptions.length === 0) {
        movePreviewImage.style.display = 'none';
        return;
    }

    moveOptions.forEach(loc => {
        const btn = document.createElement('button');
        btn.className = 'topic-button';
        btn.textContent = loc.label;
        
        const updatePreview = () => {
            const bgKey = loc.preview || loc.bg; // Use preview key or bg key
            if (bgKey && backgrounds[bgKey]) {
                movePreviewImage.src = backgrounds[bgKey];
                movePreviewImage.style.display = 'block';
            } else {
                movePreviewImage.style.display = 'none';
            }
        };

        btn.addEventListener('mouseenter', updatePreview);
        btn.addEventListener('touchstart', updatePreview, { passive: true });

        btn.addEventListener('click', () => {
            if (loc.target) {
                // Ensure UI is cleaned up (handled by sceneStateChanged, but being safe)
                moveMenu.classList.add('hidden');
                
                if (loc.json) {
                    if (window.loadGameData) {
                        window.loadGameData(loc.json, loc.target);
                    } else {
                        console.error("loadGameData function is missing!");
                    }
                } else {
                    jumpToSection(loc.target);
                }
            }
        });

        moveList.appendChild(btn);
    });
    
    // Set initial preview
    if (moveOptions.length > 0) {
        const first = moveOptions[0];
        const bgKey = first.preview || first.bg;
        if (bgKey && backgrounds[bgKey]) {
            movePreviewImage.src = backgrounds[bgKey];
            movePreviewImage.style.display = 'block';
        } else {
            movePreviewImage.style.display = 'none';
        }
    }
}

investigationPanel.addEventListener('click', (e) => {
    if (isExamining) {
        if (window.jumpToSection && currentInvestigationDefault) {
             window.jumpToSection(currentInvestigationDefault);
        }
    }
});

function renderInvestigation() {
    // Set image
    const bgUrl = backgrounds[currentBackgroundKey];
    if (bgUrl) {
        investigationBg.src = bgUrl;
    }
    
    // Clear overlay
    investigationOverlay.innerHTML = '';
    
    // Get points and default
    let points = [];
    currentInvestigationDefault = null;

    const data = investigations[currentBackgroundKey];
    if (Array.isArray(data)) {
        points = data;
    } else if (data && typeof data === 'object') {
        points = data.points || [];
        currentInvestigationDefault = data.default;
    }
    
    points.forEach(point => {
        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        
        // Convert bounds array to string "x,y x,y"
        let pointsStr = "";
        if (point.bounds && Array.isArray(point.bounds)) {
            for (let i = 0; i < point.bounds.length; i += 2) {
                pointsStr += `${point.bounds[i]},${point.bounds[i+1]} `;
            }
        }
        
        polygon.setAttribute("points", pointsStr.trim());
        polygon.setAttribute("class", "investigation-polygon");
        
        if (typeof debugShowInvestigationBounds !== 'undefined' && debugShowInvestigationBounds) {
            polygon.classList.add('debug');
        }

        // Check if visited
        const isVisited = gameState[point.label + "_visited"];
        if (isVisited) {
            polygon.classList.add('visited');
        }
        
        // Hover effects for cursor
        polygon.addEventListener('mouseenter', () => {
            cursorBox.classList.add('active');
            if (gameState[point.label + "_visited"]) {
                cursorBox.classList.add('visited');
            }
        });
        
        polygon.addEventListener('mouseleave', () => {
            cursorBox.classList.remove('active');
            cursorBox.classList.remove('visited');
        });

        // Touch start to simulate hover/click logic
        polygon.addEventListener('touchstart', (e) => {
            // e.stopPropagation(); // Don't stop propagation, let move handle it?
            // On touch start, we highlight it
            cursorBox.classList.add('active');
            if (gameState[point.label + "_visited"]) {
                cursorBox.classList.add('visited');
            }
        }, {passive: true});


        polygon.addEventListener('click', (e) => {
            e.stopPropagation();
            // Mark visited
            gameState[point.label + "_visited"] = true;
            polygon.classList.add('visited');
            
            // Jump to label
            if (window.jumpToSection) {
                window.jumpToSection(point.label);
            }
        });
        
        investigationOverlay.appendChild(polygon);
    });
}

// Cursor Movement
function updateCursor(clientX, clientY) {
    const rect = investigationPanel.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // Update Box Position
    cursorBox.style.left = `${x}px`;
    cursorBox.style.top = `${y}px`;
    
    // Update Lines
    cursorH.style.top = `${y}px`;
    cursorV.style.left = `${x}px`;
}

investigationPanel.addEventListener('mousemove', (e) => {
    updateCursor(e.clientX, e.clientY);
});

investigationPanel.addEventListener('touchmove', (e) => {
    e.preventDefault(); // Prevent scrolling
    const touch = e.touches[0];
    updateCursor(touch.clientX, touch.clientY);
}, { passive: false });

function checkHover(clientX, clientY) {
    // Hide cursor if it's visible to not block elementFromPoint
    cursorBox.style.display = 'none';
    const element = document.elementFromPoint(clientX, clientY);
    cursorBox.style.display = 'flex'; // Restore cursor

    if (element && element.classList.contains('investigation-polygon')) {
        // Trigger hover effect manually
        cursorBox.classList.add('active');
        
        // Find which point this polygon belongs to check visited status
        // We need a way to link polygon to data. 
        // Best way is to check the 'visited' class on the polygon itself
        if (element.classList.contains('visited')) {
            cursorBox.classList.add('visited');
        } else {
            cursorBox.classList.remove('visited');
        }
    } else {
        cursorBox.classList.remove('active');
        cursorBox.classList.remove('visited');
    }
}

// Add touch hover support
investigationPanel.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    checkHover(touch.clientX, touch.clientY);
}, { passive: false });

investigationPanel.addEventListener('mousemove', (e) => {
    // Mouse hover is handled by CSS/Events on elements, 
    // but the cursorBox styling is manually handled in renderInvestigation
    // so we don't need checkHover here unless we refactor renderInvestigation logic.
    // The renderInvestigation puts listeners on the polygons directly.
});
// Add touch hover support for Move List
moveList.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element && element.tagName === 'BUTTON' && moveList.contains(element)) {
        element.dispatchEvent(new Event('mouseenter'));
    }
}, { passive: false });