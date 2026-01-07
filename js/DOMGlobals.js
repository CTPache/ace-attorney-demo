console.log("DOM Globals Loaded");

// Main Containers
const gameContainer = document.getElementById('game-container');
const textboxContainer = document.getElementById('textbox-container');
const investigationMenu = document.getElementById('investigation-menu');
const topicMenu = document.getElementById('topic-menu');
const investigationPanel = document.getElementById('investigation-panel');
const evidenceContainer = document.getElementById('evidence-container');
const evidenceDetails = document.getElementById('evidence-details');
const bottomTopBar = document.getElementById('bottom-top-bar');

// Scene Layers
const backgroundElement = document.getElementById('background');
const character = document.getElementById('character');
const flashOverlay = document.getElementById('flash-overlay');

// Text Box
const nameTag = document.getElementById('name-tag');
const textContent = document.getElementById('text-content');

// Investigation Menu Buttons
const btnExamine = document.getElementById('btn-examine');
const btnMove = document.getElementById('btn-move');
const btnTalk = document.getElementById('btn-talk');
const btnPresent = document.getElementById('btn-present');

// Move Menu Elements
const moveMenu = document.getElementById('move-menu');
const moveList = document.getElementById('move-list');
const movePreviewImage = document.getElementById('move-preview-image');
const btnMoveBack = document.getElementById('btn-move-back');

// Investigation Panel Elements
const investigationBg = document.getElementById('investigation-bg');
const investigationOverlay = document.getElementById('investigation-overlay');
const btnInvestigationBack = document.getElementById('btn-investigation-back');

// Investigation Cursor
const cursorH = document.getElementById('investigation-cursor-h');
const cursorV = document.getElementById('investigation-cursor-v');
const cursorBox = document.getElementById('investigation-cursor-box');

// Topic Menu Elements
const btnTopicBack = document.getElementById('btn-topic-back');

// Evidence & Court Record
const courtRecordBtn = document.getElementById('court-record-btn');
const advanceBtn = document.getElementById('advance-btn');
const evidenceGrid = document.getElementById('evidence-grid');
const evidenceNameDisplay = document.getElementById('evidence-name-display');
const evidenceTitle = document.getElementById('evidence-title');
const evidenceDescription = document.getElementById('evidence-description');
const evidenceIconLarge = document.getElementById('evidence-icon-large');
const evidenceDataBox = document.getElementById('evidence-data-box');
const btnPrevEvidence = document.getElementById('evidence-prev-btn');
const btnNextEvidence = document.getElementById('evidence-next-btn');
const btnEvidenceBack = document.getElementById('btn-evidence-back');
const crTabs = document.querySelectorAll('.cr-tab');

// Popups
const evidencePopup = document.getElementById('evidence-popup');
const popupIcon = document.getElementById('popup-icon');
const popupName = document.getElementById('popup-name');
const popupDesc = document.getElementById('popup-desc');

// Life Bar
const lifeBarContainer = document.getElementById('life-bar-container');
const lifeBarFill = document.getElementById('life-bar-fill');
const lifeBarPenalty = document.getElementById('life-bar-penalty');
