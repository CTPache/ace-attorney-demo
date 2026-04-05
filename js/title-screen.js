// js/title-screen.js
console.log("Title Screen logic loaded");

function fitTitleButtons() {
    const top = document.getElementById('title-screen-top');
    if (!top || top.classList.contains('hidden')) return;
    const wrapper = document.getElementById('main-wrapper');
    if (!wrapper || !wrapper.classList.contains('single-screen-mode')) return;
    const buttons = top.querySelectorAll('.title-btn');
    if (buttons.length === 0) return;

    const applyScale = () => {
        top.querySelectorAll('.title-btn > .title-btn-inner').forEach(span => {
            const btn = span.parentElement;
            const edgeMargin = Math.max(8, Math.floor(btn.clientWidth * 0.04));
            const avail = btn.clientWidth - (edgeMargin * 2);
            const natural = span.scrollWidth;
            span.style.transform = (natural > avail && avail > 0)
                ? `scaleX(${Math.max(0.6, avail / natural)})`
                : 'scaleX(1)';
        });
    };

    buttons.forEach(btn => {
        let span = btn.querySelector(':scope > .title-btn-inner');
        const text = span ? span.textContent.trim() : btn.textContent.trim();

        if (!span) {
            btn.textContent = '';
            span = document.createElement('span');
            span.className = 'title-btn-inner';
            span.style.cssText = 'display:inline-block;white-space:nowrap;transform-origin:center;';
            btn.appendChild(span);
        }

        span.textContent = text;
    });

    requestAnimationFrame(applyScale);

    // Re-apply after fonts are ready because glyph metrics can change after initial paint.
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
            requestAnimationFrame(applyScale);
        });
    }
}

window.rearrangeTitleButtons = function() {
    const titleTop = document.getElementById('title-screen-top');
    const titleBottom = document.getElementById('title-screen-bottom');
    const titleButtons = document.getElementById('title-buttons');
    const wrapper = document.getElementById('main-wrapper');

    if (wrapper && titleButtons) {
        if (wrapper.classList.contains('single-screen-mode')) {
            if (titleTop && !titleTop.contains(titleButtons)) {
                titleTop.appendChild(titleButtons);
            }
            if (titleBottom) titleBottom.classList.add('hidden');
            fitTitleButtons();
        } else {
            if (titleBottom && !titleBottom.contains(titleButtons)) {
                titleBottom.appendChild(titleButtons);
            }
            if (!titleTop || !titleTop.classList.contains('hidden')) {
                // Only show bottom if the top is also active (title screen is open)
                if (titleBottom) titleBottom.classList.remove('hidden');
            }
        }
    }
};

window.initTitleScreen = function() {
    const titleTop = document.getElementById('title-screen-top');
    const titleBottom = document.getElementById('title-screen-bottom');
    const logo = document.getElementById('title-logo');
    const btnCaseSelect = document.getElementById('btn-case-select');
    const btnTitleLoad = document.getElementById('btn-title-load');
    const btnGallery = document.getElementById('btn-gallery');
    const btnTitleConfig = document.getElementById('btn-title-config');

    if (titleTop) titleTop.classList.remove('hidden');
    if (titleBottom) titleBottom.classList.remove('hidden');

    // Ensure gameplay-only overlays are fully hidden when returning to menu UIs
    // (e.g. from Gallery or Case Select back buttons).
    if (typeof window.hideActionMenus === 'function') {
        window.hideActionMenus();
    }

    const ceControls = document.getElementById('ce-controls');
    if (ceControls) {
        ceControls.classList.add('hidden');
    }
    const ceArrowContainer = document.getElementById('ce-arrow-container');
    if (ceArrowContainer) {
        ceArrowContainer.classList.add('hidden');
    }
    if (typeof window.shelveLazyElements === 'function') {
        window.shelveLazyElements(['ce-controls', 'ce-arrow-container']);
    }

    window.rearrangeTitleButtons();

    const currentLang = typeof window.getGameLanguage === 'function' ? window.getGameLanguage() : 'EN';
    if (logo) {
        if (currentLang === 'JP') {
            logo.src = 'assets/img/sprites/TitleScreen_Logo_JP.png';
        } else {
            logo.src = 'assets/img/sprites/TitleScreen_Logo_EN.png';
        }
    }

    if (btnCaseSelect) {
        btnCaseSelect.onclick = () => {
            console.log("Case Select clicked");
            if (typeof window.initCaseSelect === 'function') {
                window.initCaseSelect();
            }
        };
    }

    if (btnGallery) {
        btnGallery.onclick = () => {
            console.log("Gallery clicked");
            if (typeof window.initGallery === 'function') {
                window.initGallery();
            }
        };
    }

    if (btnTitleLoad) {
        btnTitleLoad.onclick = async () => {
            console.log("Load clicked from title screen");
            if (typeof window.loadGame === 'function') {
                await window.loadGame(1);
            }
        };
    }

    if (btnTitleConfig) {
        btnTitleConfig.onclick = () => {
            console.log("Settings clicked from title screen");
            if (typeof window.openConfigMenu === 'function') {
                window.openConfigMenu(true);
            }
        };
    }
};

window.hideTitleScreen = function() {
    const titleTop = document.getElementById('title-screen-top');
    const titleBottom = document.getElementById('title-screen-bottom');
    const titleButtons = document.getElementById('title-buttons');

    if (titleTop) titleTop.classList.add('hidden');
    if (titleBottom) titleBottom.classList.add('hidden');

    // Restore buttons to titleBottom if they were moved
    if (titleButtons && titleBottom && !titleBottom.contains(titleButtons)) {
        titleBottom.appendChild(titleButtons);
    }
};

document.addEventListener('uiTextUpdated', () => {
    const top = document.getElementById('title-screen-top');
    if (top && !top.classList.contains('hidden') && top.querySelector('#title-buttons')) {
        fitTitleButtons();
    }
});

window.addEventListener('load', fitTitleButtons);
window.addEventListener('resize', fitTitleButtons);
window.addEventListener('orientationchange', fitTitleButtons);