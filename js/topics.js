console.log("Topics Loaded");

function bindTopicEvents() {
    if (btnTalk && btnTalk.dataset.boundTopics !== 'true') {
        btnTalk.dataset.boundTopics = 'true';
        btnTalk.addEventListener('click', () => {
            if (typeof window.ensureLazyElementMounted === 'function') {
                window.ensureLazyElementMounted('topic-menu', 'topic-menu-template', '#bottom-main-window');
            }
            if (typeof window.refreshDOMGlobals === 'function') {
                window.refreshDOMGlobals();
            }
            bindTopicEvents();

            investigationMenu.classList.add('hidden');
            if (typeof window.shelveLazyElement === 'function') {
                window.shelveLazyElement('investigation-menu');
            }
            topicMenu.classList.remove('hidden');
            renderTopics();
        });
    }

    if (btnTopicBack && btnTopicBack.dataset.boundTopics !== 'true') {
        btnTopicBack.dataset.boundTopics = 'true';
        btnTopicBack.addEventListener('click', () => {
            topicMenu.classList.add('hidden');
            if (typeof window.shelveLazyElement === 'function') {
                window.shelveLazyElement('topic-menu');
            }
            if (typeof window.ensureLazyElementMounted === 'function') {
                window.ensureLazyElementMounted('investigation-menu', 'investigation-menu-template', '#bottom-main-window');
            }
            if (typeof window.refreshDOMGlobals === 'function') {
                window.refreshDOMGlobals();
            }
            if (typeof window.bindCourtRecordEvents === 'function') {
                window.bindCourtRecordEvents();
            }
            investigationMenu.classList.remove('hidden');
        });
    }
}

function renderTopics() {
    // Clear existing buttons except the Back button
    topicMenu.innerHTML = '';
    
    // Check if the back button is still in the DOM or use the global reference
    // Since using innerHTML='' removes it, we rely on the global variable btnTopicBack
    // which should hold the reference to the element with the event listeners attached.
    if (btnTopicBack) {
        topicMenu.appendChild(btnTopicBack);
    } else {
        console.error("btnTopicBack global not found!");
    }
    
    unlockedTopics.forEach(topicId => {
        const topic = topicsDB[topicId];
        if (topic) {
            const btn = document.createElement('button');
            btn.className = 'topic-button';
            btn.textContent = topic.text;
            
            btn.addEventListener('click', () => {
                // Hide menu and jump
                topicMenu.classList.add('hidden');
                if (typeof window.shelveLazyElement === 'function') {
                    window.shelveLazyElement('topic-menu');
                }
                advanceBtn.classList.remove('hidden');
                
                if (window.jumpToSection) {
                    window.jumpToSection(topic.label);
                } else {
                    console.error("jumpToSection not found");
                }
            });
            
            topicMenu.appendChild(btn);
        }
    });
}

bindTopicEvents();
window.bindTopicEvents = bindTopicEvents;
