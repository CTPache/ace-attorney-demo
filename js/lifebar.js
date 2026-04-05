console.log("Life Bar Loaded");

function getLifeBarElements() {
    return {
        container: document.getElementById('life-bar-container'),
        fill: document.getElementById('life-bar-fill'),
        penalty: document.getElementById('life-bar-penalty')
    };
}

window.updateLifeBar = function(penalty = 0) {
    if (currentLife < 0) currentLife = 0;
    if (currentLife > maxLife) currentLife = maxLife;

    const { fill, penalty: penaltyBar } = getLifeBarElements();
    if (!fill || !penaltyBar) return;

    // Calculate Percentages
    // Fill: The safe green part. 
    // If penalty > 0, it eats into the green part starting from the right.
    // Example: Life 10, Penalty 2. Green = 8, Yellow = 2.
    // Current Life is always the "potential total" before penalty is applied.
    // Actually, usually "Penalty" flashes the part you are ABOUT to lose.
    // So if you have 10 HP, and trigger {showLifeBar:2}, it shows 8 green, 2 flashing. 
    // Meaning if you mess up, you drop to 8.
    
    // Width calculations
    const penaltyPct = (penalty / maxLife) * 100;
    const currentPct = (currentLife / maxLife) * 100;
    
    const safePct = currentPct - penaltyPct;
    
    // Update widths
    fill.style.width = `${Math.max(0, safePct)}%`;
    
    // The penalty bar sits next to the safe bar
    // We position it using left property or just rely on absolute positioning
    penaltyBar.style.width = `${penaltyPct}%`;
    penaltyBar.style.left = `${Math.max(0, safePct)}%`;
}

window.showLifeBar = function(penalty = 0) {
    if (typeof window.ensureLazyElementMounted === 'function') {
        window.ensureLazyElementMounted('life-bar-container', 'life-bar-template', '#game-container');
    }

    const { container } = getLifeBarElements();
    if (!container) return;

    updateLifeBar(penalty);
    container.classList.remove('hidden');
}

window.hideLifeBar = function() {
    const { container } = getLifeBarElements();
    if (!container) return;

    container.classList.add('hidden');
    if (typeof window.shelveLazyElement === 'function') {
        window.shelveLazyElement('life-bar-container');
    }
}

window.modifyLife = function(amount) {
    currentLife += amount;
    // Animate change?
    // For now, snap to new value.
    updateLifeBar(0); // Clear penalty visualization on change

    if (currentLife <= 0) {
        currentLife = 0;
        console.log("Life reached 0. Game Over Pending...");
        window.isGameOverPending = true;
    } else {
        window.isGameOverPending = false;
    }
}
