console.log("Investigation Loaded");

let currentInvestigationDefault = null;

function setInvestigationCursorState(active, visited = false) {
    cursorBox.classList.toggle('active', active);
    cursorH.classList.toggle('active', active);
    cursorV.classList.toggle('active', active);
    cursorBox.classList.toggle('visited', !!visited);
}

function getBackgroundAsset(bgKey) {
    const bgData = backgrounds[bgKey];
    if (!bgData) {
        return null;
    }

    if (typeof bgData === 'string') {
        return {
            src: bgData,
            positionName: null
        };
    }

    if (typeof bgData === 'object' && bgData.path) {
        return {
            src: bgData.path,
            positionName: bgData.positions?.default || null
        };
    }

    return null;
}

function getInvestigationObjectPosition(positionName) {
    switch (positionName) {
        case 'top':
            return 'center top';
        case 'bottom':
            return 'center bottom';
        case 'left':
            return 'left center';
        case 'right':
            return 'right center';
        case 'middle':
        case 'center':
        default:
            return 'center center';
    }
}

function setPreviewBackgroundImage(imageElement, bgKey) {
    const asset = getBackgroundAsset(bgKey);
    if (asset?.src) {
        imageElement.src = asset.src;
        imageElement.style.display = 'block';
        return;
    }

    imageElement.removeAttribute('src');
    imageElement.style.display = 'none';
}

function setInvestigationBackground(bgKey) {
    const asset = getBackgroundAsset(bgKey);
    if (!asset?.src) {
        investigationBg.removeAttribute('src');
        investigationBg.style.objectPosition = 'center center';
        return;
    }

    investigationBg.src = asset.src;
    investigationBg.style.objectPosition = getInvestigationObjectPosition(asset.positionName);
}

function ensureInvestigationMenuMounted() {
    if (typeof window.ensureLazyElementMounted === 'function') {
        window.ensureLazyElementMounted('investigation-menu', 'investigation-menu-template', '#bottom-main-window');
    }
    if (typeof window.refreshDOMGlobals === 'function') {
        window.refreshDOMGlobals();
    }
    bindInvestigationUIEvents();
    if (typeof window.bindTopicEvents === 'function') {
        window.bindTopicEvents();
    }
    if (typeof window.bindCourtRecordEvents === 'function') {
        window.bindCourtRecordEvents();
    }
    if (typeof window.updateActionButtons === 'function') {
        window.updateActionButtons();
    }
}

function ensureMoveMenuMounted() {
    if (typeof window.ensureLazyElementMounted === 'function') {
        window.ensureLazyElementMounted('move-menu', 'move-menu-template', '#bottom-main-window');
    }
    if (typeof window.refreshDOMGlobals === 'function') {
        window.refreshDOMGlobals();
    }
    bindInvestigationUIEvents();
}

function ensureInvestigationPanelMounted() {
    if (typeof window.ensureLazyElementMounted === 'function') {
        window.ensureLazyElementMounted('investigation-panel', 'investigation-panel-template', '#bottom-main-window');
    }
    if (typeof window.refreshDOMGlobals === 'function') {
        window.refreshDOMGlobals();
    }
    bindInvestigationUIEvents();
}

function bindInvestigationUIEvents() {
    if (btnExamine && btnExamine.dataset.boundInvestigation !== 'true') {
        btnExamine.dataset.boundInvestigation = 'true';
        btnExamine.addEventListener('click', () => {
            ensureInvestigationPanelMounted();

            investigationMenu.classList.add('hidden');
            if (typeof window.shelveLazyElement === 'function') {
                window.shelveLazyElement('investigation-menu');
            }
            investigationPanel.classList.remove('hidden');
            bottomTopBar.classList.add('hidden');
            gameContainer.classList.add('investigating');
            isExamining = true;
            renderInvestigation();
        });
    }

    if (btnInvestigationBack && btnInvestigationBack.dataset.boundInvestigation !== 'true') {
        btnInvestigationBack.dataset.boundInvestigation = 'true';
        btnInvestigationBack.addEventListener('click', (e) => {
            e.stopPropagation();
            isExamining = false;
            investigationPanel.classList.add('hidden');
            if (typeof window.shelveLazyElement === 'function') {
                window.shelveLazyElement('investigation-panel');
            }
            ensureInvestigationMenuMounted();
            investigationMenu.classList.remove('hidden');
            bottomTopBar.classList.remove('hidden');
            gameContainer.classList.remove('investigating');
        });
    }

    if (btnMove && btnMove.dataset.boundInvestigation !== 'true') {
        btnMove.dataset.boundInvestigation = 'true';
        btnMove.addEventListener('click', () => {
            ensureMoveMenuMounted();

            investigationMenu.classList.add('hidden');
            if (typeof window.shelveLazyElement === 'function') {
                window.shelveLazyElement('investigation-menu');
            }
            moveMenu.classList.remove('hidden');
            renderMoveMenu();
        });
    }

    if (btnMoveBack && btnMoveBack.dataset.boundInvestigation !== 'true') {
        btnMoveBack.dataset.boundInvestigation = 'true';
        btnMoveBack.addEventListener('click', () => {
            moveMenu.classList.add('hidden');
            if (typeof window.shelveLazyElement === 'function') {
                window.shelveLazyElement('move-menu');
            }
            ensureInvestigationMenuMounted();
            investigationMenu.classList.remove('hidden');
        });
    }

    if (investigationPanel && investigationPanel.dataset.boundInvestigation !== 'true') {
        investigationPanel.dataset.boundInvestigation = 'true';
        investigationPanel.addEventListener('click', () => {
            if (isExamining) {
                if (window.jumpToSection && currentInvestigationDefault) {
                    window.jumpToSection(currentInvestigationDefault);
                }
            }
        });

        investigationPanel.addEventListener('mousemove', (e) => {
            handleInvestigationPointerMove(e.clientX, e.clientY, false);
        });

        investigationPanel.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            if (!touch) return;
            handleInvestigationPointerMove(touch.clientX, touch.clientY, true);
        }, { passive: false });
    }

    if (investigationOverlay && investigationOverlay.dataset.boundInvestigation !== 'true') {
        investigationOverlay.dataset.boundInvestigation = 'true';
        investigationOverlay.addEventListener('mouseover', (e) => {
            const polygon = e.target.closest('.investigation-polygon');
            if (!polygon || !investigationOverlay.contains(polygon)) return;
            setInvestigationCursorState(true, polygon.classList.contains('visited'));
        });

        investigationOverlay.addEventListener('mouseout', (e) => {
            const polygon = e.target.closest('.investigation-polygon');
            if (!polygon || !investigationOverlay.contains(polygon)) return;

            const nextPolygon = e.relatedTarget && e.relatedTarget.closest
                ? e.relatedTarget.closest('.investigation-polygon')
                : null;

            if (nextPolygon && investigationOverlay.contains(nextPolygon)) {
                return;
            }

            setInvestigationCursorState(false, false);
        });

        investigationOverlay.addEventListener('touchstart', (e) => {
            const polygon = e.target.closest('.investigation-polygon');
            if (!polygon || !investigationOverlay.contains(polygon)) return;
            setInvestigationCursorState(true, polygon.classList.contains('visited'));
        }, { passive: true });

        investigationOverlay.addEventListener('click', (e) => {
            const polygon = e.target.closest('.investigation-polygon');
            if (!polygon || !investigationOverlay.contains(polygon)) return;

            e.stopPropagation();
            const label = polygon.dataset.label;
            if (!label) return;

            gameState[label + '_visited'] = true;
            polygon.classList.add('visited');

            if (window.jumpToSection) {
                window.jumpToSection(label);
            }
        });
    }

    if (moveList && moveList.dataset.boundInvestigation !== 'true') {
        moveList.dataset.boundInvestigation = 'true';
        moveList.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            if (element && element.tagName === 'BUTTON' && moveList.contains(element)) {
                element.dispatchEvent(new Event('mouseenter'));
            }
        }, { passive: false });
    }
}

function renderMoveMenu() {
    moveList.innerHTML = '';
    
    const moveOptions = typeof sceneMoveLocations !== 'undefined' ? sceneMoveLocations : [];

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
            setPreviewBackgroundImage(movePreviewImage, bgKey);
        };

        btn.addEventListener('mouseenter', updatePreview);
        btn.addEventListener('touchstart', updatePreview, { passive: true });

        btn.addEventListener('click', () => {
            if (loc.target) {
                // Ensure UI is cleaned up (handled by sceneStateChanged, but being safe)
                moveMenu.classList.add('hidden');
                if (typeof window.shelveLazyElement === 'function') {
                    window.shelveLazyElement('move-menu');
                }
                
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
        setPreviewBackgroundImage(movePreviewImage, bgKey);
    }
}


function renderInvestigation() {
    setInvestigationBackground(currentBackgroundKey);
    
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
        if (typeof point.label === 'string') {
            polygon.dataset.label = point.label;
        }
        
        if (typeof debugShowInvestigationBounds !== 'undefined' && debugShowInvestigationBounds) {
            polygon.classList.add('debug');
        }

        // Check if visited
        const isVisited = gameState[point.label + "_visited"];
        if (isVisited) {
            polygon.classList.add('visited');
        }
        
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

function handleInvestigationPointerMove(clientX, clientY, shouldCheckHover = false) {
    updateCursor(clientX, clientY);
    if (shouldCheckHover) {
        checkHover(clientX, clientY);
    }
}


function checkHover(clientX, clientY) {
    // Hide cursor if it's visible to not block elementFromPoint
    cursorBox.style.display = 'none';
    const element = document.elementFromPoint(clientX, clientY);
    cursorBox.style.display = 'flex'; // Restore cursor

    if (element && element.classList.contains('investigation-polygon')) {
        // Trigger hover effect manually
        cursorBox.classList.add('active');
        cursorH.classList.add('active');
        cursorV.classList.add('active');
        
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
        cursorH.classList.remove('active');
        cursorV.classList.remove('active');
        cursorBox.classList.remove('visited');
    }
}

// Keyboard Movement
function moveInvestigationCursor(direction) {
    if (!isExamining || !investigationPanel) return;

    const step = 10; // Pixels to move
    const rect = investigationPanel.getBoundingClientRect();
    
    // Get current position from cursorBox style
    let x = parseFloat(cursorBox.style.left) || (rect.width / 2);
    let y = parseFloat(cursorBox.style.top) || (rect.height / 2);

    switch (direction) {
        case 'UP': y -= step; break;
        case 'DOWN': y += step; break;
        case 'LEFT': x -= step; break;
        case 'RIGHT': x += step; break;
    }

    // Clamp to bounds
    x = Math.max(0, Math.min(rect.width, x));
    y = Math.max(0, Math.min(rect.height, y));

    // Convert back to client coordinates for the existing update functions
    const clientX = x + rect.left;
    const clientY = y + rect.top;

    handleInvestigationPointerMove(clientX, clientY, true);
}

function selectInvestigationCursor() {
    if (!isExamining || !investigationPanel) return;

    const rect = investigationPanel.getBoundingClientRect();
    const x = parseFloat(cursorBox.style.left) || (rect.width / 2);
    const y = parseFloat(cursorBox.style.top) || (rect.height / 2);

    const clientX = x + rect.left;
    const clientY = y + rect.top;

    // Simulate click at coordinates
    cursorBox.style.display = 'none';
    const element = document.elementFromPoint(clientX, clientY);
    cursorBox.style.display = 'flex';

    if (element && element.classList.contains('investigation-polygon')) {
        element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    } else {
        // Fallback to default investigation click
        investigationPanel.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
}

// Bind lazy-mounted investigation UI immediately when available.
bindInvestigationUIEvents();
window.bindInvestigationUIEvents = bindInvestigationUIEvents;
window.moveInvestigationCursor = moveInvestigationCursor;
window.selectInvestigationCursor = selectInvestigationCursor;