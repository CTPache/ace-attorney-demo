console.log("Script Actions Loaded");

/**
 * Handles non-rendering logic commands (game state, evidence, audio, etc.)
 * Returns true if the segment was handled.
 */
function executeScriptAction(segment) {
    // Check flow control first, although usually handled separately
    // DO NOT handle flow control here as it requires stopping the renderer loop
    if (['jump', 'jumpIf', 'option'].includes(segment.type)) {
        return false;
    }

    switch (segment.type) {
        case 'bg':
            changeBackground(segment.bgName);
            return true;
        case 'setState':
            setGameState(segment.key, segment.value);
            return true;
        case 'blip':
            currentBlipType = segment.value;
            // Note: currentTalkingAnimationEnabled is a global state used by text-renderer
            // We might need to access it. If it's a let in global scope (it is not, let's check globals.js)
            // It seems currentTalkingAnimationEnabled is NOT in globals.js? 
            // It was likely in text-renderer.js module scope. 
            // We need to verify where currentTalkingAnimationEnabled lives.
            // If it's local to text-renderer, we can't change it here easily unless we expose a setter.
            // Let's assume for now we might need to leave 'blip' in text-renderer or expose a setter.
            if (window.setTalkingAnimationState) {
                let shouldSpeak = true;
                if (segment.shouldSpeak !== undefined) shouldSpeak = segment.shouldSpeak;
                if (segment.shouldSpeak === false) shouldSpeak = false;
                window.setTalkingAnimationState(shouldSpeak);
            }
            return true;
        case 'addEvidence':
            if (evidenceDB[segment.key] && !evidenceInventory.includes(segment.key)) {
                evidenceInventory.push(segment.key);
                gameState['evidence_' + segment.key] = true;
                console.log(`Added evidence: ${segment.key}`);
                if (segment.showPopup) {
                    const event = new CustomEvent('evidenceAdded', { detail: { key: segment.key } });
                    document.dispatchEvent(event);
                }
            }
            return true;
        case 'removeEvidence':
            const removeIndex = evidenceInventory.indexOf(segment.key);
            if (removeIndex > -1) {
                evidenceInventory.splice(removeIndex, 1);
                delete gameState['evidence_' + segment.key];
                console.log(`Removed evidence: ${segment.key}`);
            }
            return true;
        case 'updateEvidence':
            // Remove old
            const updateIndex = evidenceInventory.indexOf(segment.oldKey);
            if (updateIndex > -1) {
                evidenceInventory.splice(updateIndex, 1);
                delete gameState['evidence_' + segment.oldKey];
            }
            // Add new
            if (evidenceDB[segment.newKey] && !evidenceInventory.includes(segment.newKey)) {
                evidenceInventory.push(segment.newKey);
                gameState['evidence_' + segment.newKey] = true;
                console.log(`Updated evidence ${segment.oldKey} to ${segment.newKey}`);
                if (segment.showPopup) {
                    const event = new CustomEvent('evidenceAdded', { detail: { key: segment.newKey } });
                    document.dispatchEvent(event);
                }
            }
            return true;
        case 'addProfile':
            if (profilesDB[segment.key] && !profilesInventory.includes(segment.key)) {
                profilesInventory.push(segment.key);
                console.log(`Added profile: ${segment.key}`);
                if (segment.showPopup) {
                    const event = new CustomEvent('profileAdded', { detail: { key: segment.key } });
                    document.dispatchEvent(event);
                }
            }
            return true;
        case 'topicUnlock':
            if (!unlockedTopics.includes(segment.topicId)) {
                unlockedTopics.push(segment.topicId);
                console.log(`Unlocked topic: ${segment.topicId}`);
            }
            return true;
        case 'sectionEnd':
            showTopicsOnEnd = true;
            return true;
        case 'playSound':
            if (window.playSound) window.playSound(segment.soundName);
            return true;
        case 'startBGM':
            if (window.playBGM) window.playBGM(segment.musicName);
            return true;
        case 'stopBGM':
            if (window.stopBGM) window.stopBGM(segment.fadeOut);
            return true;
        case 'lifeMod':
            if (window.modifyLife) window.modifyLife(segment.amount);
            return true;
        case 'showLifeBar':
            if (window.showLifeBar) window.showLifeBar(segment.penalty);
            return true;
        case 'hideLifeBar':
            if (window.hideLifeBar) window.hideLifeBar();
            return true;
        case 'setGameOver':
            // gameOverLabel is likely global (in engine.js? check globals.js)
            if (typeof gameOverLabel !== 'undefined') gameOverLabel = segment.label;
            else window.gameOverLabel = segment.label; 
            return true;
        case 'checkpoint':
            lastCheckpointSection = segment.sectionName;
            console.log(`Checkpoint saved: ${lastCheckpointSection}`);
            return true;
        case 'endGame':
            // showEndGameOverlay is in text-renderer.js usually.
            // We should call it.
            if (window.showEndGameOverlay) window.showEndGameOverlay();
            // We return STOP-like signal? 
            // the caller needs to know to stop typing.
            // Returning 'true' just means handled.
            // The logic in text-renderer needs to handle the STOP effect.
            return 'STOP';
        
        default:
            return false;
    }
}

/**
 * Handles Control Flow (jumping, options)
 */
function handleFlowControl(segment) {
    // Only intercept actual flow control segments to avoid hijacking text/visuals
    // during fast-forward (finishTyping)
    const flowTypes = ['jump', 'jumpIf', 'option'];
    if (!flowTypes.includes(segment.type)) {
        return false;
    }

    if (window.isGameOverPending) {
        if (window.jumpToSection && typeof gameOverLabel !== 'undefined') {
            // Prevent escaping Game Over
            // But if we are ALREADY in the Game Over section, we shouldn't jump recursively?
            // Actually, if we are in Game Over section, there shouldn't be any 'jump' commands 
            // except maybe restart? But Restart is button-based.
            // If the script has a jump, we block it.
            jumpToSection(gameOverLabel);
        }
        return true; 
    }

    if (segment.type === 'jump') {
        if (window.jumpToSection) jumpToSection(segment.label);
        return true;
    } else if (segment.type === 'jumpIf') {
        if (gameState[segment.condition]) {
            if (window.jumpToSection) jumpToSection(segment.labelTrue);
            return true;
        } else if (segment.labelFalse) {
            if (window.jumpToSection) jumpToSection(segment.labelFalse);
            return true;
        } else {
            return false; // Proceed
        }
    } else if (segment.type === 'option') {
        // Stop typing is handled by the caller (renderer) usually
        // But we need to signal it.
        
        if (window.renderOptionsMenu) {
            window.renderOptionsMenu(segment.optionKey);
        }
        return true;
    }
    return false;
}
