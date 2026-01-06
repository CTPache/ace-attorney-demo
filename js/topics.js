console.log("Topics Loaded");

btnTalk.addEventListener('click', () => {
    investigationMenu.classList.add('hidden');
    topicMenu.classList.remove('hidden');
    renderTopics();
});

btnTopicBack.addEventListener('click', () => {
    topicMenu.classList.add('hidden');
    investigationMenu.classList.remove('hidden');
});

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
