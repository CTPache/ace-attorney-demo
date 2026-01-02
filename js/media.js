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
