// js/gallery.js
console.log("Gallery UI logic loaded");

let galleryData = null;
let currentGalleryTab = "Artwork";
let currentGalleryImages = [];
let currentGalleryIndex = 0;

window.initGallery = async function () {
    console.log("Initializing Gallery Menu...");

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

    const menu = document.getElementById('gallery-menu');
    if (menu) {
        menu.classList.remove('hidden');
        window.hideTitleScreen();
        showGalleryTab("Artwork"); // Default tab
    }
};

window.hideGallery = function () {
    const menu = document.getElementById('gallery-menu');
    if (menu) {
        menu.classList.add('hidden');
    }
    closeGalleryViewer();
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

    const grid = document.getElementById('gallery-grid');
    if (!grid || !galleryData) return;

    grid.innerHTML = ''; // Clear existing images

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

        itemDiv.onclick = () => {
            openGalleryViewer(path, index);
        };

        grid.appendChild(itemDiv);
    });
}

function openGalleryViewer(imagePath, index = 0) {
    const viewer = document.getElementById('gallery-viewer');
    const viewerImg = document.getElementById('gallery-viewer-img');

    if (viewer && viewerImg) {
        viewerImg.src = imagePath;
        currentGalleryIndex = index;
        viewer.classList.remove('hidden');
        resetGalleryNavTimer();
    }
}

function closeGalleryViewer(e) {
    if (e && e.target.id !== 'gallery-viewer' && e.target.id !== 'gallery-viewer-close' && e.target.tagName !== 'IMG') {
        // Prevent background clicks on other buttons from closing the viewer wildly, 
        // but we allow clicking the black background or the image to close.
        return;
    }

    const viewer = document.getElementById('gallery-viewer');
    const viewerImg = document.getElementById('gallery-viewer-img');

    if (viewer) {
        viewer.classList.add('hidden');
        viewer.classList.remove('show-nav');
        if (galleryNavTimer) clearTimeout(galleryNavTimer);
    }
    if (viewerImg) {
        viewerImg.src = ''; // clear to prevent visual ghosting on reopen
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

document.addEventListener('keydown', (e) => {
    const viewer = document.getElementById('gallery-viewer');
    if (viewer && !viewer.classList.contains('hidden')) {
        if (e.key === 'ArrowLeft') {
            window.prevGalleryImage();
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            window.nextGalleryImage();
            e.preventDefault();
        } else if (e.key === 'Escape') {
            closeGalleryViewer();
            e.preventDefault();
        }
    }
});

let galleryNavTimer = null;

function resetGalleryNavTimer() {
    const viewer = document.getElementById('gallery-viewer');
    if (!viewer || viewer.classList.contains('hidden')) return;

    viewer.classList.add('show-nav');

    if (galleryNavTimer) clearTimeout(galleryNavTimer);

    galleryNavTimer = setTimeout(() => {
        if (!viewer.classList.contains('hidden')) {
            viewer.classList.remove('show-nav');
        }
    }, 3000);
}

// Container activity trackers
['mousemove', 'touchstart', 'touchmove', 'click', 'pointermove'].forEach(evt => {
    const container = document.getElementById('game-container');
    if (container) {
        container.addEventListener(evt, () => {
            resetGalleryNavTimer();
        }, { passive: true });
    }
});

// Immediately hide arrows when mouse leaves the viewer area
if (gameContainer) {
    gameContainer.addEventListener('mouseleave', () => {
        const viewer = document.getElementById('gallery-viewer');
        if (viewer && !viewer.classList.contains('hidden')) {
            viewer.classList.remove('show-nav');
            if (galleryNavTimer) {
                clearTimeout(galleryNavTimer);
                galleryNavTimer = null;
            }
        }
    });
}

document.addEventListener('keydown', () => {
    resetGalleryNavTimer();
}, { passive: true });

// Ensure the menu can be closed by Escape key if we wanted, 
// but sticking to Return to Title button is fine for now, handled via title-screen/main stack logic.
