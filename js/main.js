console.log("Main Loaded");

// Load the game script
fetch('game.json')
    .then(response => response.json())
    .then(async data => {
        if (data.characters) {
            characters = data.characters;
        }
        if (data.backgrounds) {
            backgrounds = data.backgrounds;
        }
        if (data.evidence) {
            evidenceDB = data.evidence;
        }
        if (data.Topics) {
            topicsDB = data.Topics;
        }
        
        await preloadAssets();

        // The game script sections are now nested in a gameScript object
        gameScript = data.gameScript;
        startGame();
    })
    .catch(error => console.error('Error loading game script:', error));

// Add click event listener to the game container
gameContainer.addEventListener('click', advanceDialogue);


