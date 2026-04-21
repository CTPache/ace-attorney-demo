// js/ui/modal-system.js
// Modern, gamepad-friendly replacement for alert() and confirm().

(function() {
    console.log("Modal System Loaded");

    const MODAL_HTML = `
        <div id="modal-overlay" class="hidden" role="presentation">
            <div id="modal-container" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-body">
                <h2 id="modal-title">Notification</h2>
                <div id="modal-body">Message goes here.</div>
                <div id="modal-footer">
                    <button id="modal-btn-cancel" class="modal-btn hidden" data-i18n="ui.cancel" tabindex="0">Cancel</button>
                    <button id="modal-btn-ok" class="modal-btn" data-i18n="ui.ok" tabindex="0">OK</button>
                </div>
            </div>
        </div>
    `;

    // Inject HTML into the body if it doesn't exist
    function ensureModalInDOM() {
        if (!document.getElementById('modal-overlay')) {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = MODAL_HTML;
            const overlay = wrapper.firstElementChild;
            
            // Append to game-container if available, otherwise fallback to main-wrapper or body
            const parent = document.getElementById('game-container') || document.getElementById('main-wrapper') || document.body;
            parent.appendChild(overlay);
            
            // Re-bind localization if available
            if (window.Localizer && typeof window.Localizer.translateElement === 'function') {
                window.Localizer.translateElement(overlay);
            }
        }
    }

    let activeModalConfig = null;

    /**
     * Shows a custom modal.
     * @param {Object} config - { title, message, type: 'alert'|'confirm', onConfirm, onCancel }
     */
    window.showCustomModal = function(config) {
        ensureModalInDOM();
        
        activeModalConfig = config;
        
        const overlay = document.getElementById('modal-overlay');
        const titleEl = document.getElementById('modal-title');
        const bodyEl = document.getElementById('modal-body');
        const btnOk = document.getElementById('modal-btn-ok');
        const btnCancel = document.getElementById('modal-btn-cancel');

        titleEl.textContent = config.title || (config.type === 'confirm' ? 'Confirm' : 'Notification');
        bodyEl.textContent = config.message || '';
        
        if (config.type === 'confirm') {
            btnCancel.classList.remove('hidden');
            btnOk.textContent = config.okText || 'Yes';
            btnCancel.textContent = config.cancelText || 'No';
        } else {
            btnCancel.classList.add('hidden');
            btnOk.textContent = config.okText || 'OK';
        }

        overlay.classList.remove('hidden');
        
        // Sync blocking state
        if (typeof window.syncMenuInputBlockState === 'function') {
            window.syncMenuInputBlockState();
        }

        // Focus the OK button by default after the browser has had a chance to process the visibility change
        setTimeout(() => {
            if (btnOk) {
                btnOk.focus();
                // If it still doesn't have focus (e.g. browser restrictions), try again
                if (document.activeElement !== btnOk) {
                    btnOk.setAttribute('tabindex', '0');
                    btnOk.focus();
                }
            }
        }, 50);
        
        // Bind events
        btnOk.onclick = () => {
            hideModal();
            if (config.onConfirm) config.onConfirm();
        };

        btnCancel.onclick = () => {
            hideModal();
            if (config.onCancel) config.onCancel();
        };
    };

    window.hideModal = function() {
        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
        
        if (typeof window.syncMenuInputBlockState === 'function') {
            window.syncMenuInputBlockState();
        }
        
        activeModalConfig = null;
    };

    /**
     * Replacement for alert()
     */
    window.showAlert = function(message, title = 'Notification') {
        window.showCustomModal({
            title: title,
            message: message,
            type: 'alert'
        });
    };

    /**
     * Replacement for confirm()
     */
    window.showConfirm = function(message, onConfirm, onCancel, title = 'Confirmation') {
        window.showCustomModal({
            title: title,
            message: message,
            type: 'confirm',
            onConfirm: onConfirm,
            onCancel: onCancel
        });
    };

    // Global listeners for spatial navigation / cleanup
    window.isModalOpen = function() {
        const overlay = document.getElementById('modal-overlay');
        return overlay && !overlay.classList.contains('hidden');
    };

})();
