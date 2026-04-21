// js/input/gamepad-handler.js
/**
 * Modern Gamepad Handler for the Ace Attorney Demo.
 * Uses a polling loop to translate gamepad states into logical game actions.
 */

(function() {
    console.log("Gamepad Handler Initializing...");

    const buttonStates = new Map();
    const previousAxes = [0, 0]; // Track previous axis state for stick-to-dpad conversion
    const lastActionTime = new Map();
    
    function pollGamepads() {
        const gamepads = navigator.getGamepads();
        for (const gp of gamepads) {
            if (gp) {
                processGamepad(gp);
            }
        }
        requestAnimationFrame(pollGamepads);
    }

    function processGamepad(gp) {
        if (!window.GAMEPAD_BINDINGS || !window.triggerGameAction) return;

        // 1. Process Buttons
        // We track which actions are 'down' to avoid double-triggering for the same physical button
        const activePhysicalButtons = new Set();
        
        for (const [action, indices] of Object.entries(window.GAMEPAD_BINDINGS)) {
            if (Array.isArray(indices)) {
                let isDown = false;
                for (const index of indices) {
                    if (gp.buttons[index] && gp.buttons[index].pressed) {
                        isDown = true;
                        activePhysicalButtons.add(index);
                        break;
                    }
                }
                
                handleButtonAction(action, isDown);
            }
        }

        // 2. Process Analog Sticks (Left Stick)
        const deadzone = window.GAMEPAD_BINDINGS.AXIS_THRESHOLD || 0.5;
        const repeatDelay = window.GAMEPAD_BINDINGS.STICK_REPEAT_DELAY || 250;
        
        handleAxisAsDirection(gp.axes[1], 'UP', 'DOWN', deadzone, repeatDelay, 0); // Y axis
        handleAxisAsDirection(gp.axes[0], 'LEFT', 'RIGHT', deadzone, repeatDelay, 1); // X axis
    }

    function handleButtonAction(action, isDown) {
        const prevState = buttonStates.get(action) || false;
        
        if (isDown && !prevState) {
            // Just Pressed
            window.triggerGameAction(action, 'down');
        } else if (!isDown && prevState) {
            // Just Released
            window.triggerGameAction(action, 'up');
        } else if (isDown && prevState) {
            // Held (Trigger repeat if it's a direction)
            if (['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(action)) {
                const now = Date.now();
                const last = lastActionTime.get(action) || 0;
                if (now - last > (window.GAMEPAD_BINDINGS.STICK_REPEAT_DELAY || 250)) {
                    window.triggerGameAction(action, 'repeat');
                    lastActionTime.set(action, now);
                }
            }
        }

        buttonStates.set(action, isDown);
        if (isDown && !prevState) {
            lastActionTime.set(action, Date.now());
        }
    }

    function handleAxisAsDirection(value, lowAction, highAction, deadzone, repeatDelay, axisIndex) {
        const now = Date.now();
        
        // Negative (Up/Left)
        if (value < -deadzone) {
            const last = lastActionTime.get(lowAction) || 0;
            if (now - last > repeatDelay) {
                window.triggerGameAction(lowAction, last === 0 ? 'down' : 'repeat');
                lastActionTime.set(lowAction, now);
            }
        } else {
            lastActionTime.set(lowAction, 0);
        }

        // Positive (Down/Right)
        if (value > deadzone) {
            const last = lastActionTime.get(highAction) || 0;
            if (now - last > repeatDelay) {
                window.triggerGameAction(highAction, last === 0 ? 'down' : 'repeat');
                lastActionTime.set(highAction, now);
            }
        } else {
            lastActionTime.set(highAction, 0);
        }
    }

    // Start polling
    window.addEventListener("gamepadconnected", (e) => {
        console.log(`Gamepad connected: ${e.gamepad.id}`);
        // Ensure buttons are reset
        buttonStates.clear();
        lastActionTime.clear();
    });

    pollGamepads();
})();
