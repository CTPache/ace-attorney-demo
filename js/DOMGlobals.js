console.log("DOM Globals Loaded");

let gameContainer;
let textboxContainer;
let investigationMenu;
let topicMenu;
let investigationPanel;
let evidenceContainer;
let evidenceDetails;
let bottomTopBar;

let backgroundElement;
let character;
let foregroundElement;
let topVideo;
let flashOverlay;
let autoplayIndicator;
let skipVideoBtn;
let cornerEvidenceIcon;

let nameTag;
let textContent;

let btnExamine;
let btnMove;
let btnTalk;
let btnPresent;

let moveMenu;
let moveList;
let movePreviewImage;
let btnMoveBack;

let investigationBg;
let investigationOverlay;
let btnInvestigationBack;

let cursorH;
let cursorV;
let cursorBox;

let btnTopicBack;

let courtRecordBtn;
let cePressButton;
let configBtn;
let advanceBtn;
let evidenceGrid;
let evidenceNameDisplay;
let evidenceTitle;
let evidenceDescription;
let evidenceIconLarge;
let evidenceDataBox;
let btnPrevEvidence;
let btnNextEvidence;
let btnEvidenceBack;
let crTabs;

let evidencePopup;
let popupIcon;
let popupName;
let popupDesc;

let lifeBarContainer;
let lifeBarFill;
let lifeBarPenalty;

let configMenu;
let configCloseBtn;
let configAutoSpeedRadios;
let configLanguageSelect;
let configHistoryBtn;
let configFullscreenBtn;

let historyMenu;
let historyList;
let historyCloseBtn;

let courtroomSprites;
let spriteDefense;
let spriteWitness;
let spriteProsecution;
let courtroomOverviewSprites;
let overviewDefense;
let overviewProsecution;
let overviewWitness;
let overviewJudge;
let overviewCocounsel;
let overviewGallery;

function refreshDOMGlobals() {
    gameContainer = document.getElementById('game-container');
    textboxContainer = document.getElementById('textbox-container');
    investigationMenu = document.getElementById('investigation-menu');
    topicMenu = document.getElementById('topic-menu');
    investigationPanel = document.getElementById('investigation-panel');
    evidenceContainer = document.getElementById('evidence-container');
    evidenceDetails = document.getElementById('evidence-details');
    bottomTopBar = document.getElementById('bottom-top-bar');

    backgroundElement = document.getElementById('background');
    character = document.getElementById('character');
    foregroundElement = document.getElementById('foreground');
    topVideo = document.getElementById('top-video');
    flashOverlay = document.getElementById('flash-overlay');
    autoplayIndicator = document.getElementById('autoplay-indicator');
    skipVideoBtn = document.getElementById('skip-video-btn');
    cornerEvidenceIcon = document.getElementById('corner-evidence-icon');

    nameTag = document.getElementById('name-tag');
    textContent = document.getElementById('text-content');

    btnExamine = document.getElementById('btn-examine');
    btnMove = document.getElementById('btn-move');
    btnTalk = document.getElementById('btn-talk');
    btnPresent = document.getElementById('btn-present');

    moveMenu = document.getElementById('move-menu');
    moveList = document.getElementById('move-list');
    movePreviewImage = document.getElementById('move-preview-image');
    btnMoveBack = document.getElementById('btn-move-back');

    investigationBg = document.getElementById('investigation-bg');
    investigationOverlay = document.getElementById('investigation-overlay');
    btnInvestigationBack = document.getElementById('btn-investigation-back');

    cursorH = document.getElementById('investigation-cursor-h');
    cursorV = document.getElementById('investigation-cursor-v');
    cursorBox = document.getElementById('investigation-cursor-box');

    btnTopicBack = document.getElementById('btn-topic-back');

    courtRecordBtn = document.getElementById('court-record-btn');
    cePressButton = document.getElementById('ce-press-btn');
    configBtn = document.getElementById('config-btn');
    advanceBtn = document.getElementById('advance-btn');
    evidenceGrid = document.getElementById('evidence-grid');
    evidenceNameDisplay = document.getElementById('evidence-name-display');
    evidenceTitle = document.getElementById('evidence-title');
    evidenceDescription = document.getElementById('evidence-description');
    evidenceIconLarge = document.getElementById('evidence-icon-large');
    evidenceDataBox = document.getElementById('evidence-data-box');
    btnPrevEvidence = document.getElementById('evidence-prev-btn');
    btnNextEvidence = document.getElementById('evidence-next-btn');
    btnEvidenceBack = document.getElementById('btn-evidence-back');
    crTabs = document.querySelectorAll('.cr-tab');

    evidencePopup = document.getElementById('evidence-popup');
    popupIcon = document.getElementById('popup-icon');
    popupName = document.getElementById('popup-name');
    popupDesc = document.getElementById('popup-desc');

    lifeBarContainer = document.getElementById('life-bar-container');
    lifeBarFill = document.getElementById('life-bar-fill');
    lifeBarPenalty = document.getElementById('life-bar-penalty');

    configMenu = document.getElementById('config-menu');
    configCloseBtn = document.getElementById('config-close-btn');
    configAutoSpeedRadios = document.querySelectorAll('input[name="auto-speed"]');
    configLanguageSelect = document.getElementById('config-language-select');
    configHistoryBtn = document.getElementById('config-history-btn');
    configFullscreenBtn = document.getElementById('config-fullscreen-btn');

    historyMenu = document.getElementById('history-menu');
    historyList = document.getElementById('history-list');
    historyCloseBtn = document.getElementById('history-close-btn');

    courtroomSprites = document.getElementById('courtroom-sprites');
    spriteDefense = document.getElementById('sprite-defense');
    spriteWitness = document.getElementById('sprite-witness');
    spriteProsecution = document.getElementById('sprite-prosecution');
    courtroomOverviewSprites = document.getElementById('courtroom-overview-sprites');
    overviewDefense = document.getElementById('overview-defense');
    overviewProsecution = document.getElementById('overview-prosecution');
    overviewWitness = document.getElementById('overview-witness');
    overviewJudge = document.getElementById('overview-judge');
    overviewCocounsel = document.getElementById('overview-cocounsel');
    overviewGallery = document.getElementById('overview-gallery');
}

refreshDOMGlobals();
window.refreshDOMGlobals = refreshDOMGlobals;

// Centralized Key Bindings Configuration
window.KEY_BINDINGS = {
    // Core Navigation
    UP: ['ArrowUp'],
    DOWN: ['ArrowDown'],
    LEFT: ['ArrowLeft'],
    RIGHT: ['ArrowRight'],

    // Selection & Flow Control
    CONFIRM: ['Enter'],
    CANCEL: ['Escape', 'Backspace'],
    ACTION: [' '], // Space

    // Shortcuts
    COURT_RECORD: ['e', 'E'],
    CONFIG: ['g', 'G'],
    AUTOPLAY: ['a', 'A'],
    PRESENT: ['Enter'],
    PRESS: ['q', 'Q'],
    SCREEN_MODE: ['m', 'M'],
    SWITCH_SCREEN: ['s', 'S']
};

/**
 * Global Gamepad Mappings (Standard Button Indices)
 * 0: Bottom (A/Cross), 1: Right (B/Circle), 2: Left (X/Square), 3: Top (Y/Triangle)
 * 4: L1, 5: R1, 6: L2, 7: R2, 8: Select/Share, 9: Start/Options
 * 12: DPad Up, 13: DPad Down, 14: DPad Left, 15: DPad Right
 */
window.GAMEPAD_BINDINGS = {
    UP: [12],
    DOWN: [13],
    LEFT: [14],
    RIGHT: [15],

    CONFIRM: [0], // A / Cross
    CANCEL: [1],  // B / Circle
    ACTION: [0],  // A / Cross

    COURT_RECORD: [5], // L1 / LB
    CONFIG: [9],       // Options / Start
    AUTOPLAY: [8, 8],  // Share / Back
    PRESENT: [3],      // Y / Triangle
    PRESS: [4],        // X / Square
    SWITCH_SCREEN: [7],

    AXIS_THRESHOLD: 0.5,
    STICK_REPEAT_DELAY: 250 // ms for menu scrolling
};

/**
 * Utility to check if a KeyboardEvent matches a named binding.
 * @param {KeyboardEvent} e 
 * @param {string} binding 
 * @returns {boolean}
 */
window.isKey = function (e, binding) {
    if (!window.KEY_BINDINGS[binding]) return false;
    return window.KEY_BINDINGS[binding].includes(e.key);
};
