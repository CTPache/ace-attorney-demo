// js/gallery.js
console.log("Gallery UI logic loaded");

let galleryData = null;
let currentGalleryTab = "Artwork";
let currentGalleryImages = [];
let currentGalleryIndex = 0;

function ensureGalleryDOM() {
    if (typeof window.ensureLazyElementMounted === 'function') {
        window.ensureLazyElementMounted('gallery-menu', 'gallery-menu-template', '#bottom-screen');
        window.ensureLazyElementMounted('gallery-viewer', 'gallery-viewer-template', '#game-container');
    }

    return {
        galleryMenu: document.getElementById('gallery-menu'),
        galleryGrid: document.getElementById('gallery-grid'),
        galleryViewer: document.getElementById('gallery-viewer'),
        galleryViewerImg: document.getElementById('gallery-viewer-img')
    };
}

window.initGallery = async function () {
    console.log("Initializing Gallery Menu...");

    const { galleryMenu } = ensureGalleryDOM();

    if (!galleryData) {
        try {
            const response = await fetch('assets/gallery.json');
            if (response.ok) {
                galleryData = await response.json();
            } else {
                console.error("Failed to fetch gallery.json");
                galleryData = { "Artwork": [], "CG": [], "Backgrounds": [] };
            }
        } catch (e) {
            console.error("Error loading gallery data:", e);
            galleryData = { "Artwork": [], "CG": [], "Backgrounds": [] };
        }
    }

    if (galleryMenu) {
        galleryMenu.classList.remove('hidden');
        window.hideTitleScreen();

        // Make tabs focusable
        galleryMenu.querySelectorAll('.gallery-tab').forEach(tab => {
            tab.tabIndex = 0;
            tab.setAttribute('role', 'tab');
        });

        showGalleryTab("Artwork"); // Default tab
        if (typeof window.syncMenuInputBlockState === 'function') {
            window.syncMenuInputBlockState();
        }
    }
};

window.hideGallery = function () {
    const galleryMenu = document.getElementById('gallery-menu');

    if (galleryMenu) {
        galleryMenu.classList.add('hidden');
    }
    closeGalleryViewer();
    if (typeof window.hideActionMenus === 'function') {
        window.hideActionMenus();
    }
    if (typeof window.syncMenuInputBlockState === 'function') {
        window.syncMenuInputBlockState();
    }
    if (typeof window.unmountLazyElements === 'function') {
        window.unmountLazyElements(['gallery-menu', 'gallery-viewer']);
    }
    window.initTitleScreen(); // Restore title buttons
};

function showGalleryTab(category) {
    currentGalleryTab = category;

    // Update active tab UI
    document.querySelectorAll('.gallery-tab').forEach(tab => {
        if (tab.dataset.category === category) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    const { galleryGrid } = ensureGalleryDOM();
    if (!galleryGrid || !galleryData) return;

    galleryGrid.innerHTML = ''; // Clear existing images

    const items = galleryData[category] || [];
    currentGalleryImages = items;

    items.forEach((path, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'gallery-grid-item';

        const img = document.createElement('img');
        img.src = path;
        img.loading = "lazy"; // Better performance for many images
        // Extract alt text from file name roughly
        let filename = path.split('/').pop().split('.')[0];
        img.alt = filename;

        itemDiv.appendChild(img);

        itemDiv.tabIndex = 0;
        itemDiv.setAttribute('role', 'button');
        itemDiv.setAttribute('aria-label', filename);

        itemDiv.onclick = () => {
            openGalleryViewer(path, index);
        };

        galleryGrid.appendChild(itemDiv);
    });
}

function openGalleryViewer(imagePath, index = 0) {
    const { galleryViewer, galleryViewerImg } = ensureGalleryDOM();

    if (galleryViewer && galleryViewerImg) {
        galleryViewerImg.src = imagePath;
        currentGalleryIndex = index;
        galleryViewer.classList.remove('hidden');
        resetGalleryNavTimer();

        // Focus navigation
        const nextBtn = document.getElementById('gallery-viewer-next');
        if (nextBtn) nextBtn.focus();
    }
}

function closeGalleryViewer(e) {
    const galleryViewer = document.getElementById('gallery-viewer');
    const galleryViewerImg = document.getElementById('gallery-viewer-img');
    if (e && e.target.id !== 'gallery-viewer' && e.target.id !== 'gallery-viewer-close' && e.target.tagName !== 'IMG') {
        // Prevent background clicks on other buttons from closing the viewer wildly, 
        // but we allow clicking the black background or the image to close.
        return;
    }

    if (galleryViewer) {
        galleryViewer.classList.add('hidden');
        galleryViewer.classList.remove('show-nav');
        if (galleryNavTimer) clearTimeout(galleryNavTimer);
    }
    if (galleryViewerImg) {
        galleryViewerImg.src = ''; // clear to prevent visual ghosting on reopen
    }
}

window.prevGalleryImage = function (e) {
    if (e) e.stopPropagation();
    if (currentGalleryImages.length === 0) return;
    currentGalleryIndex = (currentGalleryIndex - 1 + currentGalleryImages.length) % currentGalleryImages.length;
    openGalleryViewer(currentGalleryImages[currentGalleryIndex], currentGalleryIndex);
};

window.nextGalleryImage = function (e) {
    if (e) e.stopPropagation();
    if (currentGalleryImages.length === 0) return;
    currentGalleryIndex = (currentGalleryIndex + 1) % currentGalleryImages.length;
    openGalleryViewer(currentGalleryImages[currentGalleryIndex], currentGalleryIndex);
};

window.triggerGalleryAction = function(action) {
    const galleryViewer = document.getElementById('gallery-viewer');
    if (!galleryViewer || galleryViewer.classList.contains('hidden')) {
        return false;
    }

    if (action === 'LEFT') {
        window.prevGalleryImage();
        resetGalleryNavTimer();
        return true;
    } else if (action === 'RIGHT') {
        window.nextGalleryImage();
        resetGalleryNavTimer();
        return true;
    } else if (action === 'CANCEL') {
        if (typeof window.closeGalleryViewer === 'function') {
            window.closeGalleryViewer();
            return true;
        }
    }

    resetGalleryNavTimer();
    return false;
};

window.handleGalleryKeydown = function(e) {
    // This function is still called for keyboard events, 
    // but the mapping starts in key-events.js now.
    // However, if called directly, we just return false to avoid double execution.
    return false;
};

let galleryNavTimer = null;

function resetGalleryNavTimer() {
    const galleryViewer = document.getElementById('gallery-viewer');
    if (!galleryViewer || galleryViewer.classList.contains('hidden')) return;

    galleryViewer.classList.add('show-nav');

    if (galleryNavTimer) clearTimeout(galleryNavTimer);

    galleryNavTimer = setTimeout(() => {
        if (!galleryViewer.classList.contains('hidden')) {
            galleryViewer.classList.remove('show-nav');
        }
    }, 3000);
}

// Container activity trackers
['mousemove', 'touchstart', 'touchmove', 'click', 'pointermove'].forEach(evt => {
    if (gameContainer) {
        gameContainer.addEventListener(evt, () => {
            resetGalleryNavTimer();
        }, { passive: true });
    }
});

// Immediately hide arrows when mouse leaves the viewer area
if (gameContainer) {
    gameContainer.addEventListener('mouseleave', () => {
        const galleryViewer = document.getElementById('gallery-viewer');
        if (galleryViewer && !galleryViewer.classList.contains('hidden')) {
            galleryViewer.classList.remove('show-nav');
            if (galleryNavTimer) {
                clearTimeout(galleryNavTimer);
                galleryNavTimer = null;
            }
        }
    });
}

// Ensure the menu can be closed by Escape key if we wanted,
// but sticking to Return to Title button is fine for now, handled via title-screen/main stack logic.
