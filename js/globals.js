console.log("Globals Loaded");

// Data Containers
let characters = {};
let backgrounds = {};
let foregrounds = {};
let evidenceDB = {};
let evidenceInventory = [];
let profilesDB = {};
let profilesInventory = [];
let topicsDB = {};
let unlockedTopics = [];
let investigations = {};
let optionsDB = {};
let soundsDB = {};
let musicDB = {};
let videosDB = {};
const gameState = {};
let gameScript = {};

// Action States
let actionStates = {
    examine: true,
    move: true,
    talk: true,
    present: true
};

// State Variables
let initialSectionName = "";
let currentSectionName = "";
let lastCheckpointSection = ""; // Used for Game Over retry
let currentLineIndex = 0;
let currentBackgroundKey = "";
let isScenePlaying = true;
let isTyping = false;
let typingInterval;
let segments = [];
let segmentIndex = 0;
let charIndex = 0;
let currentSpan = null;
let currentCharacterName = "";
let currentAnimationKey = "";
let isWaitingForAutoSkip = false;
let isFastForwarding = false;
let fastForwardInterval = null;
let fastForwardTimeout = null;
let isAutoPlayEnabled = false;
let autoPlaySpeedPreset = 'normal';
let isVideoPlaying = false;
let currentLanguage = 'EN';
let currentSceneRequestPath = '';
let currentSceneResolvedPath = '';
let autoPlayTimeout = null;
let autoPlayBaseDelay = 2200;
let autoPlayPerCharDelay = 45;
let autoPlayMaxExtraDelay = 4500;
let dialogueHistory = [];
const maxDialogueHistoryEntries = 300;
let currentBGM = null; // Track current background music


// Config
const defaultTextSpeed = 30;
const defaultInitialSceneKey = 'intro';
let currentTextSpeed = defaultTextSpeed;
let currentBlipType = 1;
let currentTalkingAnimationEnabled = true;
let debugShowInvestigationBounds = false;
let currentLife = 10;
let maxLife = 10;
let gameOverLabel = "GameOver"; // Default
window.isGameOverPending = false;
let gameOverMessage = "GAME OVER";
// UI State
let isCourtRecordOpen = false;
let isPresentingMode = false;
let isExamining = false;
let isInputBlocked = false;
