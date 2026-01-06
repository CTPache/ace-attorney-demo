console.log("Investigation Loaded");

let currentInvestigationDefault = null;

// Investigation Menu Handlers
btnExamine.addEventListener('click', () => {
    investigationMenu.classList.add('hidden');
    investigationPanel.classList.remove('hidden');
    bottomTopBar.classList.add('hidden'); // Hide top bar
    isExamining = true;
    renderInvestigation();
});

btnInvestigationBack.addEventListener('click', (e) => {
    e.stopPropagation();
    isExamining = false;
    investigationPanel.classList.add('hidden');
    investigationMenu.classList.remove('hidden');
    bottomTopBar.classList.remove('hidden'); // Show top bar
});

btnMove.addEventListener('click', () => {
    console.log("Move clicked - Not implemented");
});

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
investigationPanel.addEventListener('mousemove', (e) => {
    const rect = investigationPanel.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Update Box Position
    cursorBox.style.left = `${x}px`;
    cursorBox.style.top = `${y}px`;
    
    // Update Lines
    cursorH.style.top = `${y}px`;
    cursorV.style.left = `${x}px`;
});
