console.log("Media Loaded");

// Audio
const blipSounds = {
    1: new Audio('assets/audio/blip_1.ogg'),
    2: new Audio('assets/audio/blip_2.ogg'),
    3: new Audio('assets/audio/typewriter.ogg')
};

function playBlip() {
    if (currentBlipType === 4) return; // Silence

    const audio = blipSounds[currentBlipType];
    if (audio) {
        if (!audio.paused) return;
        audio.currentTime = 0;
        audio.play().catch(e => console.warn("Audio play failed:", e));
    }
}

function playSound(soundName) {
    const soundPath = soundsDB[soundName];
    if (soundPath) {
        const audio = new Audio(soundPath);
        audio.play().catch(e => console.warn("SFX play failed:", e));
    } else {
        console.warn(`Sound not found: ${soundName}`);
    }
}

function playBGM(musicName) {
    const musicPath = musicDB[musicName];
    if (musicPath) {
        // Stop current BGM if playing
        stopBGM(false);

        currentBGM = new Audio(musicPath);
        currentBGM.loop = true;
        currentBGM.play().catch(e => console.warn("BGM play failed:", e));
    } else {
        console.warn(`Music not found: ${musicName}`);
    }
}

function stopBGM(fadeOut = true) {
    if (currentBGM) {
        if (fadeOut) {
            const audio = currentBGM; // Capture reference
            const fadeInterval = setInterval(() => {
                if (audio.volume > 0.05) {
                    audio.volume -= 0.05;
                } else {
                    clearInterval(fadeInterval);
                    audio.pause();
                    audio.currentTime = 0;
                    audio.volume = 1; // Reset for next use if reused
                }
            }, 100);
            
            // If we start a new BGM immediately, we don't want to overwrite the fading one's reference
            // But since currentBGM is global, we set it to null so the engine knows "active" music is gone
            if (currentBGM === audio) {
                currentBGM = null;
            }
        } else {
            currentBGM.pause();
            currentBGM.currentTime = 0;
            currentBGM = null;
        }
    }
}

function triggerFlash() {
    flashOverlay.classList.remove('flashing');
    void flashOverlay.offsetWidth; // Trigger reflow
    flashOverlay.classList.add('flashing');
}

function setSpriteState(state) {
    if (!currentCharacterName || !currentAnimationKey) return;

    const charData = characters[currentCharacterName];
    if (!charData) return;

    const animData = charData[currentAnimationKey];
    if (!animData) return;

    let spriteUrl = "";

    if (state === 'talking' && animData.talking) {
        spriteUrl = animData.talking;
    } else {
        // Fallback to default, then talking, then empty
        spriteUrl = animData.default || animData.talking || "";
    }

    if (spriteUrl) {
        character.style.backgroundImage = `url('${spriteUrl}')`;
    }
}

function changeBackground(bgName) {
    const bgUrl = backgrounds[bgName];
    if (bgUrl) {
        backgroundElement.style.backgroundImage = `url('${bgUrl}')`;
    }
}

function changeSprite(charName, spriteKey) {
    currentCharacterName = charName;
    currentAnimationKey = spriteKey;
    setSpriteState('default');
}
