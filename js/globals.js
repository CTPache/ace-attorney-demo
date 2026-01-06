console.log("Globals Loaded");

// Data Containers
let characters = {};
let backgrounds = {};
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
const gameState = {};
let gameScript = {};

// State Variables
let currentSectionName = "Demo_Main_01";
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
let currentBGM = null; // Track current background music


// Config
const defaultTextSpeed = 30;
let currentTextSpeed = defaultTextSpeed;
let currentBlipType = 1;
let debugShowInvestigationBounds = false;

// UI State
let isCourtRecordOpen = false;
let isPresentingMode = false;
let isExamining = false;
let isInputBlocked = false;
