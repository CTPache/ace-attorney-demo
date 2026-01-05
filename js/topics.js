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
    const backBtn = document.getElementById('btn-topic-back');
    topicMenu.innerHTML = '';
    topicMenu.appendChild(backBtn);
    
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
