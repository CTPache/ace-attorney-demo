console.log("Life Bar Loaded");

window.updateLifeBar = function(penalty = 0) {
    if (currentLife < 0) currentLife = 0;
    if (currentLife > maxLife) currentLife = maxLife;

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
    lifeBarFill.style.width = `${Math.max(0, safePct)}%`;
    
    // The penalty bar sits next to the safe bar
    // We position it using left property or just rely on absolute positioning
    lifeBarPenalty.style.width = `${penaltyPct}%`;
    lifeBarPenalty.style.left = `${Math.max(0, safePct)}%`;
}

window.showLifeBar = function(penalty = 0) {
    updateLifeBar(penalty);
    lifeBarContainer.classList.remove('hidden');
}

window.hideLifeBar = function() {
    lifeBarContainer.classList.add('hidden');
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
