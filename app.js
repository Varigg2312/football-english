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

// ==========================================
// 🧠 ESTADO DEL JUEGO Y USUARIOS
// ==========================================
let currentUser = null; // null = Invitado
let usersDB = JSON.parse(localStorage.getItem('football_users_db') || '{}');

// Variables de sesión actual
let usedMessages = 0;
let playerXP = 0;

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
    quizQuestion: document.getElementById('quiz-question'),
    quizOptions: document.getElementById('options-container'),
    feedback: document.getElementById('feedback-zone'),
    
    // HUD
    hud: document.getElementById('player-hud'),
    rankDisplay: document.getElementById('player-rank'),
    xpDisplay: document.getElementById('player-xp'),
    xpBar: document.getElementById('xp-bar'),
    
    // Chat UI
    chatTrigger: document.getElementById('coach-trigger'),
    chatModal: document.getElementById('coach-modal'),
    chatClose: document.getElementById('close-chat'),
    chatHistory: document.getElementById('chat-history'),
    chatInput: document.getElementById('user-msg'),
    chatSend: document.getElementById('send-msg'),
    passwordInput: document.getElementById('api-key-input'),

    // AUTH UI
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

// ==========================================
// 1. INICIALIZACIÓN
// ==========================================
async function initLeague() {
    // Recuperar sesión
    const savedUser = localStorage.getItem('current_session_user');
    if (savedUser && usersDB[savedUser]) {
        loginUser(savedUser);
    } else {
        loadGuestData();
    }

    if(ui.hud) ui.hud.classList.remove('hidden');

    try {
        const response = await fetch(DB_FOLDER + 'index.json');
        if (!response.ok) throw new Error("Index not found");
        allLessons = await response.json();
        
        setupSearch();
        setupChat();
        setupAuth();
    } catch (error) { console.error(error); if(ui.title) ui.title.innerText = "❌ System Error"; }
}

// ==========================================
// 2. SISTEMA DE LOGIN / REGISTRO
// ==========================================
let isRegisterMode = false;

function setupAuth() {
    ui.authBtn.onclick = () => {
        if (currentUser) logoutUser();
        else ui.authModal.classList.remove('hidden');
    };
    
    ui.closeAuth.onclick = () => ui.authModal.classList.add('hidden');

    ui.toggleAuth.onclick = () => {
        isRegisterMode = !isRegisterMode;
        ui.authTitle.innerText = isRegisterMode ? "Create Account" : "Sign In";
        ui.submitAuth.innerText = isRegisterMode ? "Register" : "Sign In";
        ui.toggleAuth.innerHTML = isRegisterMode ? "Have an account? <strong>Sign In</strong>" : "Need an account? <strong>Register</strong>";
        ui.authMsg.innerText = "";
    };

    ui.submitAuth.onclick = () => {
        const user = ui.authUser.value.trim();
        const pass = ui.authPass.value.trim();

        if (!user || !pass) { ui.authMsg.innerText = "Please fill all fields."; return; }

        if (isRegisterMode) {
            if (usersDB[user]) { ui.authMsg.innerText = "Username exists!"; } 
            else {
                usersDB[user] = { pass: pass, xp: 0, msgs: 0 };
                saveUsersDB();
                loginUser(user);
                ui.authModal.classList.add('hidden');
            }
        } else {
            if (usersDB[user] && usersDB[user].pass === pass) {
                loginUser(user);
                ui.authModal.classList.add('hidden');
            } else { ui.authMsg.innerText = "Invalid credentials."; }
        }
    };
}

function loginUser(username) {
    currentUser = username;
    localStorage.setItem('current_session_user', username);
    playerXP = usersDB[username].xp;
    usedMessages = usersDB[username].msgs || 0;
    
    ui.authBtn.innerHTML = `<i class="fa-solid fa-user-check"></i> ${username} (Exit)`;
    ui.authBtn.classList.add('logged-in');
    updateHUD();
    updateChatStatus();
}

function logoutUser() {
    currentUser = null;
    localStorage.removeItem('current_session_user');
    loadGuestData();
    ui.authBtn.innerHTML = `<i class="fa-solid fa-user"></i> Login`;
    ui.authBtn.classList.remove('logged-in');
}

function loadGuestData() {
    playerXP = parseInt(localStorage.getItem('guest_xp') || '0');
    usedMessages = parseInt(localStorage.getItem('guest_msgs') || '0');
    updateHUD();
    updateChatStatus();
}

function saveUserData() {
    if (currentUser) {
        usersDB[currentUser].xp = playerXP;
        usersDB[currentUser].msgs = usedMessages;
        saveUsersDB();
    } else {
        localStorage.setItem('guest_xp', playerXP);
        localStorage.setItem('guest_msgs', usedMessages);
    }
}

function saveUsersDB() { localStorage.setItem('football_users_db', JSON.stringify(usersDB)); }

// ==========================================
// 3. GAMIFICACIÓN (XP)
// ==========================================
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

// ==========================================
// 4. MOTOR PRINCIPAL
// ==========================================
function setupSearch() {
    if(!ui.search) return;
    ui.search.addEventListener('keyup', (e) => {
        const query = e.target.value.toLowerCase();
        ui.results.innerHTML = ''; 
        if (query.length < 1) { ui.results.classList.add('hidden'); return; }
        const matches = allLessons.filter(lesson => 
            lesson.title.toLowerCase().includes(query) || lesson.file.toLowerCase().includes(query)
        );
        if (matches.length > 0) {
            ui.results.classList.remove('hidden');
            matches.forEach(lesson => {
                const div = document.createElement('div');
                div.className = 'result-item';
                div.innerHTML = `<span>${lesson.title}</span> <strong>GO <i class="fa-solid fa-arrow-right"></i></strong>`;
                div.onclick = () => { loadMatch(lesson.file); ui.search.value = lesson.title; ui.results.classList.add('hidden'); };
                ui.results.appendChild(div);
            });
        } else { ui.results.innerHTML = '<div class="result-item" style="color: #999">No matches found...</div>'; ui.results.classList.remove('hidden'); }
    });
    document.addEventListener('click', (e) => { if (!ui.search.contains(e.target)) ui.results.classList.add('hidden'); });
}

async function loadMatch(filename) {
    ui.main.classList.add('hidden'); ui.matchInfo.classList.add('hidden');
    try {
        const response = await fetch(DB_FOLDER + filename);
        if (!response.ok) throw new Error("File not found");
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

    ui.quizQuestion.innerText = lesson.interactive_engine.scenario_text;
    ui.quizOptions.innerHTML = ''; ui.feedback.className = 'hidden';
    
    lesson.interactive_engine.options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = option.text;
        btn.onclick = () => {
            const isCorrect = /CORRECT|RIGHT/.test(option.outcome.toUpperCase());
            ui.feedback.innerText = option.feedback;
            ui.feedback.className = isCorrect ? 'feedback-box feedback-success' : 'feedback-box feedback-error';
            ui.feedback.style.display = 'block';
            if (isCorrect) {
                addXP(100); 
                ui.feedback.innerText += " (+100 XP 🎯)";
                btn.style.borderColor = "#4ade80"; 
                btn.style.backgroundColor = "#f0fdf4";
                const allBtns = ui.quizOptions.querySelectorAll('button');
                allBtns.forEach(b => b.disabled = true);
            }
        };
        ui.quizOptions.appendChild(btn);
    });
}

// ==========================================
// 5. CHATBOT
// ==========================================
function setupChat() {
    if(!ui.chatTrigger) return;
    ui.chatTrigger.onclick = () => ui.chatModal.classList.remove('hidden');
    ui.chatClose.onclick = () => ui.chatModal.classList.add('hidden');

    const maximizeBtn = document.getElementById('maximize-chat');
    if (maximizeBtn) {
        maximizeBtn.onclick = () => {
            ui.chatModal.classList.toggle('fullscreen');
            const icon = maximizeBtn.querySelector('i');
            icon.className = ui.chatModal.classList.contains('fullscreen') ? "fa-solid fa-compress" : "fa-solid fa-expand";
        };
    }
    updateChatStatus();
    ui.passwordInput.addEventListener('input', updateChatStatus);
    ui.chatSend.onclick = sendMessage;
    ui.chatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendMessage(); });
}

function updateChatStatus() {
    const isVip = (ui.passwordInput.value === VIP_PASSWORD);
    const msgsLeft = FREE_LIMIT - usedMessages;

    if (isVip) {
        ui.passwordInput.style.borderColor = "#00ff88"; 
        ui.passwordInput.style.backgroundColor = "#dcfce7";
        ui.chatInput.disabled = false; ui.chatSend.disabled = false;
        ui.chatInput.placeholder = "VIP ACCESS: The Gaffer is listening...";
        return;
    }
    if (msgsLeft > 0) {
        ui.passwordInput.style.borderColor = "#e5e7eb";
        ui.passwordInput.style.backgroundColor = "#fff";
        ui.chatInput.disabled = false; ui.chatSend.disabled = false;
        ui.chatInput.placeholder = `BETA TRIAL: ${msgsLeft} messages remaining...`;
    } else {
        ui.passwordInput.style.borderColor = "#fee2e2";
        ui.chatInput.disabled = true; ui.chatSend.disabled = true;
        ui.chatInput.placeholder = "⛔ Trial ended. Buy PRO to continue.";
    }
}

async function sendMessage() {
    const text = ui.chatInput.value;
    const isVip = (ui.passwordInput.value === VIP_PASSWORD);
    if (!text) return;
    if (!isVip && usedMessages >= FREE_LIMIT) {
        alert("🚨 Trial ended! Enter VIP password."); return;
    }
    addMessage(text, 'user-msg');
    ui.chatInput.value = '';
    
    if (!isVip) { 
        usedMessages++; 
        saveUserData(); // Guardar consumo de mensajes
        updateChatStatus(); 
    }

    const loadingDiv = addMessage('Thinking...', 'bot-msg');
    try {
        const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SYSTEM_KEY}` },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [ { role: "system", content: "You are 'The Gaffer'. Brief, motivational, football metaphors." }, { role: "user", content: text } ]
            })
        });
        if (!response.ok) throw new Error("API Limit");
        const data = await response.json();
        loadingDiv.innerText = data.choices[0].message.content;
    } catch (error) { loadingDiv.innerText = "❌ Server error."; console.error(error); }
}

function addMessage(text, className) {
    const div = document.createElement('div');
    div.className = `message ${className}`;
    div.innerText = text;
    ui.chatHistory.appendChild(div);
    ui.chatHistory.scrollTop = ui.chatHistory.scrollHeight;
    return div;
}

// 🔊 AUDIO ROBUSTO
function speak(text) {
    if (!window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    if (synth.speaking) synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB'; utterance.rate = 0.8; 
    synth.speak(utterance);
    console.log("🔊 Speaking:", text);
}

initLeague();
