console.log("Globals Loaded");

const nameTag = document.getElementById('name-tag');
const textContent = document.getElementById('text-content');
const gameContainer = document.getElementById('game-container');
const character = document.getElementById('character');
const backgroundElement = document.getElementById('background');
const flashOverlay = document.getElementById('flash-overlay');
const advanceBtn = document.getElementById('advance-btn');
const courtRecordBtn = document.getElementById('court-record-btn');

// Data Containers
let characters = {};
let backgrounds = {};
let evidenceDB = {};
let evidenceInventory = [];
let topicsDB = {};
let unlockedTopics = [];
let soundsDB = {};
let musicDB = {};
const gameState = {};
let gameScript = {};

// State Variables
let currentSectionName = "Demo_Main_01";
let currentLineIndex = 0;
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
