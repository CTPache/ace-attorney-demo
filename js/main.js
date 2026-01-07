console.log("Main Loaded");

// Function to load game data (exposed globally)
window.loadGameData = function(jsonPath, startSection = null) {
    console.log(`Loading game data from: ${jsonPath}`);
    
    // Show a loading indicator if you have one, or simple log
    // Maybe pause the game/input?
    
    fetch(jsonPath)
        .then(response => response.json())
        .then(async data => {
            // Reset/Update Data Containers
            // Always overwrite DBs to ensure strict scene scoping
            characters = data.characters || {};
            backgrounds = data.backgrounds || {};
            
            // For Evidence and Profiles, MERGE to preserve definitions of items in inventory
            evidenceDB = { ...evidenceDB, ...(data.evidence || {}) };
            profilesDB = { ...profilesDB, ...(data.profiles || {}) };
            
            topicsDB = data.Topics || {};
            investigations = data.investigations || {};
            optionsDB = data.options || {};
            soundsDB = data.sounds || {};
            musicDB = data.music || {};

            // Update Game Script
            if (data.gameScript) gameScript = data.gameScript;

            // Determine Start Section
            if (startSection) {
                currentSectionName = startSection;
            } else if (data.initialSection) {
                currentSectionName = data.initialSection;
            } else {
                currentSectionName = "Demo_Main_01"; // Fallback
            }
            
            // Set initial globals
            initialSectionName = currentSectionName;
            
            // Re-run preload (this updates the new objects in-place with blob URLs)
            await preloadAssets();

            // Start the game logic
            startGame();
        })
        .catch(error => {
            console.error('Error loading game script:', error);
            alert("Failed to load game data: " + jsonPath);
        });
};

// Initial Load
loadGameData('assets/scenes/demo.json');

// Add click event listener to the game container
gameContainer.addEventListener('click', advanceDialogue);


