const DB_FOLDER = './';

// ==========================================
// 🚨 CONFIGURACIÓN 🚨
// ==========================================
const SYSTEM_KEY = "sk-bb4843296d0f4f039379dc6bf65c53c7"; 
const VIP_PASSWORD = "PRO-LEAGUE"; 
const FREE_LIMIT = 10; 

const RANKS = [
    { name: "ROOKIE", limit: 0 },
    { name: "ACADEMY", limit: 500 },
    { name: "PRO", limit: 1500 },
    { name: "WORLD CLASS", limit: 3000 },
    { name: "LEGEND", limit: 5000 }
];

// VARIABLES DE ESTADO
let currentUser = null; 
let usersDB = JSON.parse(localStorage.getItem('football_users_db') || '{}');
let usedMessages = 0;
let playerXP = 0;

// VARIABLES DEL QUIZ (NUEVO)
let currentQuizQuestions = [];
let currentQuestionIndex = 0;

const ui = {
    // UI General
    search: document.getElementById('magic-search'),
    results: document.getElementById('search-results'),
    matchInfo: document.getElementById('match-info'),
    main: document.getElementById('main-content'),
    title: document.getElementById('lesson-title'),
    level: document.getElementById('lesson-level'),
    intro: document.getElementById('lesson-intro'),
    concept: document.getElementById('core-concept'),
    vocabList: document.getElementById('vocabulary-list'),
    
    // QUIZ ELEMENTS
    quizHeader: document.querySelector('.highlight-card .card-header'), // Para cambiar el titulo "Question 1/10"
    quizQuestion: document.getElementById('quiz-question'),
    quizOptions: document.getElementById('options-container'),
    feedback: document.getElementById('feedback-zone'),
    
    // HUD
    hud: document.getElementById('player-hud'),
    rankDisplay: document.getElementById('player-rank'),
    xpDisplay: document.getElementById('player-xp'),
    xpBar: document.getElementById('xp-bar'),
    
    // Chat & Auth (Sin cambios)
    chatTrigger: document.getElementById('coach-trigger'),
    chatModal: document.getElementById('coach-modal'),
    chatClose: document.getElementById('close-chat'),
    chatHistory: document.getElementById('chat-history'),
    chatInput: document.getElementById('user-msg'),
    chatSend: document.getElementById('send-msg'),
    passwordInput: document.getElementById('api-key-input'),
    authBtn: document.getElementById('auth-btn'),
    authModal: document.getElementById('auth-modal'),
    closeAuth: document.getElementById('close-auth'),
    authUser: document.getElementById('auth-user'),
    authPass: document.getElementById('auth-pass'),
    submitAuth: document.getElementById('submit-auth'),
    toggleAuth: document.getElementById('toggle-auth-mode'),
    authMsg: document.getElementById('auth-msg'),
    authTitle: document.getElementById('auth-title')
};

let allLessons = [];

async function initLeague() {
    const startBtn = document.getElementById('start-btn');
    const landingPage = document.getElementById('landing-page');
    const appInterface = document.getElementById('app-interface');

    if (startBtn) {
        startBtn.onclick = () => {
            landingPage.classList.add('hidden');
            appInterface.classList.remove('hidden');
            appInterface.style.display = 'flex';
        };
    }

    const savedUser = localStorage.getItem('current_session_user');
    if (savedUser && usersDB[savedUser]) {
        loginUser(savedUser);
        if(landingPage) landingPage.classList.add('hidden');
        if(appInterface) {
            appInterface.classList.remove('hidden');
            appInterface.style.display = 'flex';
        }
    } else {
        loadGuestData();
    }

    if(ui.hud) ui.hud.classList.remove('hidden');

    try {
        const response = await fetch(DB_FOLDER + 'index.json');
        allLessons = await response.json();
        setupSearch();
        setupChat();
        setupAuth();
    } catch (error) { console.error(error); }
}

// ... (FUNCIONES DE AUTH, SEARCH Y XP IGUAL QUE ANTES, OMITIDAS POR ESPACIO PERO NECESARIAS) ...
// PEGA AQUÍ LAS FUNCIONES DE AUTH (setupAuth, loginUser...), XP (addXP) Y SEARCH (setupSearch) DEL APP.JS ANTERIOR
// VOY A INCLUIR LAS IMPORTANTES PARA EL QUIZ ABAJO

// ==========================================
// 🚀 MOTOR DE LECCIONES Y QUIZ (ACTUALIZADO)
// ==========================================
async function loadMatch(filename) {
    ui.main.classList.add('hidden'); ui.matchInfo.classList.add('hidden');
    try {
        const response = await fetch(DB_FOLDER + filename);
        const data = await response.json();
        renderTactics(data);
        ui.matchInfo.classList.remove('hidden'); ui.main.classList.remove('hidden');
    } catch (error) { alert("Error loading match"); }
}

function renderTactics(lesson) {
    ui.title.innerText = lesson.content.title;
    if(ui.level) ui.level.innerText = `${lesson.meta.difficulty_elo || '1500'} ELO`;
    ui.intro.innerText = lesson.content.intro_hook;
    ui.concept.innerHTML = `<p>${lesson.content.core_concept.explanation}</p>`;
    
    // Vocabulario
    ui.vocabList.innerHTML = '';
    lesson.content.vocabulary_rich.forEach(word => {
        const li = document.createElement('li');
        const audioBtn = document.createElement('button');
        audioBtn.className = 'audio-btn';
        audioBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        audioBtn.onclick = () => speak(word.term);
        li.appendChild(audioBtn);
        li.innerHTML += ` <strong>${word.term}</strong>: ${word.meaning}`;
        ui.vocabList.appendChild(li);
    });

    // 🚨 INICIALIZAR QUIZ DE 10 PREGUNTAS
    if (lesson.interactive_engine.questions) {
        // Formato Nuevo (Array)
        currentQuizQuestions = lesson.interactive_engine.questions;
    } else {
        // Formato Viejo (Fallback para no romper lecciones antiguas)
        currentQuizQuestions = [{
            scenario: lesson.interactive_engine.scenario_text,
            options: lesson.interactive_engine.options
        }];
    }
    
    currentQuestionIndex = 0;
    showQuestion(); // Muestra la primera pregunta
}

function showQuestion() {
    const qData = currentQuizQuestions[currentQuestionIndex];
    
    // Actualizar cabecera (Ej: "Question 1/10")
    ui.quizHeader.innerHTML = `<i class="fa-solid fa-whistle"></i> Match Scenario ${currentQuestionIndex + 1}/${currentQuizQuestions.length}`;
    
    ui.quizQuestion.innerText = qData.scenario || qData.scenario_text; // Soporte para ambos formatos
    ui.quizOptions.innerHTML = ''; 
    ui.feedback.className = 'hidden';

    // Generar botones
    qData.options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = option.text;
        
        btn.onclick = () => {
            handleAnswer(option, btn);
        };
        
        ui.quizOptions.appendChild(btn);
    });
}

function handleAnswer(option, btnClicked) {
    const isCorrect = /CORRECT|RIGHT/.test(option.outcome.toUpperCase());
    
    // Mostrar Feedback
    ui.feedback.innerHTML = `<p>${option.feedback}</p>`;
    ui.feedback.className = isCorrect ? 'feedback-box feedback-success' : 'feedback-box feedback-error';
    ui.feedback.style.display = 'block';

    // Desactivar botones
    const allBtns = ui.quizOptions.querySelectorAll('button');
    allBtns.forEach(b => b.disabled = true);

    if (isCorrect) {
        addXP(20); // 20 XP por pregunta (200 XP total si aciertas las 10)
        btnClicked.style.borderColor = "#4ade80"; 
        btnClicked.style.backgroundColor = "#f0fdf4";
        ui.feedback.innerHTML += " <strong>(+20 XP 🎯)</strong>";
    } else {
        btnClicked.style.borderColor = "#fee2e2";
    }

    // BOTÓN SIGUIENTE PREGUNTA
    const nextBtn = document.createElement('button');
    nextBtn.className = 'cta-button';
    nextBtn.style.marginTop = '15px';
    nextBtn.style.width = '100%';
    
    // Si quedan preguntas -> "Next Play", si no -> "Finish Match"
    if (currentQuestionIndex < currentQuizQuestions.length - 1) {
        nextBtn.innerHTML = `Next Play <i class="fa-solid fa-forward"></i>`;
        nextBtn.onclick = () => {
            currentQuestionIndex++;
            showQuestion();
        };
    } else {
        nextBtn.innerHTML = `🏁 FINISH MATCH`;
        nextBtn.onclick = () => {
            ui.quizHeader.innerHTML = `<i class="fa-solid fa-trophy"></i> Match Results`;
            ui.quizQuestion.innerText = "Training Session Completed! Great job, lad.";
            ui.quizOptions.innerHTML = "";
            ui.feedback.classList.add('hidden');
        };
    }

    ui.feedback.appendChild(nextBtn);
}

// ... (RESTO DE FUNCIONES IGUALES: AUTH, CHAT, AUDIO, XP) ...
// Asegúrate de copiar las funciones auxiliares (addXP, loginUser, etc.) del código anterior
// o pide el archivo completo si prefieres.

// -----------------------------------------------------------
// BLOQUE DE FUNCIONES AUXILIARES NECESARIAS (Copia esto si falta)
// -----------------------------------------------------------
function addXP(amount) {
    playerXP += amount;
    saveUserData();
    updateHUD();
    if(ui.xpDisplay) {
        ui.xpDisplay.classList.add('xp-gained');
        setTimeout(() => ui.xpDisplay.classList.remove('xp-gained'), 300);
    }
}
function updateHUD() {
    if(!ui.rankDisplay) return;
    let currentRank = RANKS[0];
    let nextRankXP = RANKS[1].limit;
    for (let i = 0; i < RANKS.length; i++) {
        if (playerXP >= RANKS[i].limit) {
            currentRank = RANKS[i];
            nextRankXP = RANKS[i+1] ? RANKS[i+1].limit : playerXP * 1.5;
        }
    }
    ui.rankDisplay.innerText = currentRank.name;
    ui.xpDisplay.innerText = `${playerXP} pts`;
    const progress = Math.min(100, (playerXP / nextRankXP) * 100);
    ui.xpBar.style.width = `${progress}%`;
}
function speak(text) {
    if (!window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    if (synth.speaking) synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB'; utterance.rate = 0.8; 
    synth.speak(utterance);
}
// -----------------------------------------------------------

// ARRANQUE (Asegúrate que setupAuth y loginUser están definidas arriba o en tu archivo previo)
// Si has copiado el bloque anterior, necesitarás setupAuth y loginUser definidas.
// Si no quieres líos, pídeme el app.js COMPLETO DE NUEVO.
initLeague();
