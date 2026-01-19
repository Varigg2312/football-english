const DB_FOLDER = './';

// ==========================================
// 🚨 CONFIGURACIÓN DEL MANAGER 🚨
// ==========================================
// TU CLAVE DE DEEPSEEK REAL:
const SYSTEM_KEY = "sk-bb4843296d0f4f039379dc6bf65c53c7"; 
// CONTRASEÑA PARA LOS VIP:
const VIP_PASSWORD = "PRO-LEAGUE"; 
// MENSAJES GRATIS ANTES DE PAGAR:
const FREE_LIMIT = 10; 

// NIVELES DE JUEGO (GAMIFICACIÓN)
const RANKS = [
    { name: "ROOKIE", limit: 0 },
    { name: "ACADEMY", limit: 500 },
    { name: "PRO", limit: 1500 },
    { name: "WORLD CLASS", limit: 3000 },
    { name: "LEGEND", limit: 5000 }
];
// ==========================================

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
    
    // HUD (Barra Superior)
    hud: document.getElementById('player-hud'),
    rankDisplay: document.getElementById('player-rank'),
    xpDisplay: document.getElementById('player-xp'),
    xpBar: document.getElementById('xp-bar'),
    
    // Chatbot
    chatTrigger: document.getElementById('coach-trigger'),
    chatModal: document.getElementById('coach-modal'),
    chatClose: document.getElementById('close-chat'),
    chatHistory: document.getElementById('chat-history'),
    chatInput: document.getElementById('user-msg'),
    chatSend: document.getElementById('send-msg'),
    passwordInput: document.getElementById('api-key-input') 
};

let allLessons = [];
// Recuperar datos guardados (Persistencia)
let usedMessages = parseInt(localStorage.getItem('msgs_used') || '0');
let playerXP = parseInt(localStorage.getItem('player_xp') || '0');

// ==========================================
// 1. INICIALIZACIÓN
// ==========================================
async function initLeague() {
    updateHUD(); // Poner el marcador al día
    if(ui.hud) ui.hud.classList.remove('hidden');

    try {
        const response = await fetch(DB_FOLDER + 'index.json');
        if (!response.ok) throw new Error("Index not found");
        allLessons = await response.json();
        
        setupSearch();
        setupChat();
    } catch (error) { 
        console.error(error); 
        if(ui.title) ui.title.innerText = "❌ System Error: Check JSON files."; 
    }
}

// ==========================================
// 2. SISTEMA DE XP Y RANGO (GAMIFICACIÓN)
// ==========================================
function addXP(amount) {
    playerXP += amount;
    localStorage.setItem('player_xp', playerXP); // Guardar
    updateHUD();
    
    // Efecto visual en el marcador
    if(ui.xpDisplay) {
        ui.xpDisplay.classList.add('xp-gained');
        setTimeout(() => ui.xpDisplay.classList.remove('xp-gained'), 300);
    }
}

function updateHUD() {
    if(!ui.rankDisplay) return;
    
    // Calcular Rango actual
    let currentRank = RANKS[0];
    let nextRankXP = RANKS[1].limit;

    for (let i = 0; i < RANKS.length; i++) {
        if (playerXP >= RANKS[i].limit) {
            currentRank = RANKS[i];
            nextRankXP = RANKS[i+1] ? RANKS[i+1].limit : playerXP * 1.5; // Si es leyenda, el límite crece
        }
    }

    // Pintar valores
    ui.rankDisplay.innerText = currentRank.name;
    ui.xpDisplay.innerText = `${playerXP} pts`;
    
    // Mover barra de progreso
    const progress = Math.min(100, (playerXP / nextRankXP) * 100);
    ui.xpBar.style.width = `${progress}%`;
}

// ==========================================
// 3. BUSCADOR INTELIGENTE
// ==========================================
function setupSearch() {
    if(!ui.search) return;
    ui.search.addEventListener('keyup', (e) => {
        const query = e.target.value.toLowerCase();
        ui.results.innerHTML = ''; 
        if (query.length < 1) { ui.results.classList.add('hidden'); return; }

        const matches = allLessons.filter(lesson => 
            lesson.title.toLowerCase().includes(query) || 
            lesson.file.toLowerCase().includes(query)
        );

        if (matches.length > 0) {
            ui.results.classList.remove('hidden');
            matches.forEach(lesson => {
                const div = document.createElement('div');
                div.className = 'result-item';
                div.innerHTML = `<span>${lesson.title}</span> <strong>GO <i class="fa-solid fa-arrow-right"></i></strong>`;
                div.onclick = () => {
                    loadMatch(lesson.file); 
                    ui.search.value = lesson.title; 
                    ui.results.classList.add('hidden');
                };
                ui.results.appendChild(div);
            });
        } else { 
            ui.results.innerHTML = '<div class="result-item" style="color: #999">No matches found...</div>'; 
            ui.results.classList.remove('hidden'); 
        }
    });
    // Cerrar al hacer clic fuera
    document.addEventListener('click', (e) => { if (!ui.search.contains(e.target)) ui.results.classList.add('hidden'); });
}

// ==========================================
// 4. MOTOR DE LECCIONES
// ==========================================
async function loadMatch(filename) {
    ui.main.classList.add('hidden'); 
    ui.matchInfo.classList.add('hidden');
    try {
        const response = await fetch(DB_FOLDER + filename);
        if (!response.ok) throw new Error("File not found");
        const data = await response.json();
        renderTactics(data);
        ui.matchInfo.classList.remove('hidden'); 
        ui.main.classList.remove('hidden');
    } catch (error) { alert("Error loading match: " + filename); }
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
        li.innerHTML = `<strong>${word.term}</strong>: ${word.meaning}`;
        ui.vocabList.appendChild(li);
    });

    // Quiz Interactivo
    ui.quizQuestion.innerText = lesson.interactive_engine.scenario_text;
    ui.quizOptions.innerHTML = ''; 
    ui.feedback.className = 'hidden';
    
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
                // 🎉 PREMIO: 100 XP
                addXP(100); 
                ui.feedback.innerText += " (+100 XP 🎯)";
                btn.style.borderColor = "#4ade80"; 
                btn.style.backgroundColor = "#f0fdf4";
                // Desactivar botones para no farmear
                const allBtns = ui.quizOptions.querySelectorAll('button');
                allBtns.forEach(b => b.disabled = true);
            }
        };
        ui.quizOptions.appendChild(btn);
    });
}

// ==========================================
// 5. CHATBOT IA (THE GAFFER)
// ==========================================
function setupChat() {
    if(!ui.chatTrigger) return;
    
    // Toggle Ventana
    ui.chatTrigger.onclick = () => ui.chatModal.classList.remove('hidden');
    ui.chatClose.onclick = () => ui.chatModal.classList.add('hidden');

    // Botón Maximizar (Defensivo por si no carga el DOM a tiempo)
    const maximizeBtn = document.getElementById('maximize-chat');
    if (maximizeBtn) {
        maximizeBtn.onclick = () => {
            ui.chatModal.classList.toggle('fullscreen');
            const icon = maximizeBtn.querySelector('i');
            if (ui.chatModal.classList.contains('fullscreen')) {
                icon.className = "fa-solid fa-compress";
            } else {
                icon.className = "fa-solid fa-expand";
            }
        };
    }

    updateChatStatus();
    ui.passwordInput.addEventListener('input', updateChatStatus);
    ui.chatSend.onclick = sendMessage;
    ui.chatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendMessage(); });
}

function updateChatStatus() {
    const isVip = (ui.passwordInput.value === VIP_PASSWORD);
    const messagesLeft = FREE_LIMIT - usedMessages;

    // ESTADO 1: VIP (PAGADO)
    if (isVip) {
        ui.passwordInput.style.borderColor = "#00ff88"; 
        ui.passwordInput.style.backgroundColor = "#dcfce7";
        ui.chatInput.disabled = false; ui.chatSend.disabled = false;
        ui.chatInput.placeholder = "VIP ACCESS: The Gaffer is listening...";
        return;
    }
    // ESTADO 2: FREEMIUM (QUEDAN MENSAJES)
    if (messagesLeft > 0) {
        ui.passwordInput.style.borderColor = "#e5e7eb";
        ui.passwordInput.style.backgroundColor = "#fff";
        ui.chatInput.disabled = false; ui.chatSend.disabled = false;
        ui.chatInput.placeholder = `BETA TRIAL: ${messagesLeft} messages remaining...`;
    } 
    // ESTADO 3: BLOQUEADO (PAGAR)
    else {
        ui.passwordInput.style.borderColor = "#fee2e2";
        ui.chatInput.disabled = true; ui.chatSend.disabled = true;
        ui.chatInput.placeholder = "⛔ Trial ended. Buy PRO to continue.";
    }
}

async function sendMessage() {
    const text = ui.chatInput.value;
    const isVip = (ui.passwordInput.value === VIP_PASSWORD);

    if (!text) return;
    
    // Bloqueo final si se acabaron los mensajes y no es VIP
    if (!isVip && usedMessages >= FREE_LIMIT) {
        alert("🚨 Final Whistle! Your free trial match is over. Enter VIP password to play Extra Time.");
        return;
    }

    addMessage(text, 'user-msg');
    ui.chatInput.value = '';
    
    // Restar mensaje si es free
    if (!isVip) {
        usedMessages++;
        localStorage.setItem('msgs_used', usedMessages);
        updateChatStatus();
    }

    const loadingDiv = addMessage('Tactical analysis...', 'bot-msg');

    try {
        const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SYSTEM_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: "You are 'The Gaffer', an intense English football manager teaching English. Be brief, motivational, and use football metaphors." },
                    { role: "user", content: text }
                ]
            })
        });

        if (!response.ok) throw new Error("API Limit reached");
        const data = await response.json();
        loadingDiv.innerText = data.choices[0].message.content;

    } catch (error) { 
        loadingDiv.innerText = "❌ Server error (Check API limits)."; 
        console.error(error); 
    }
}

function addMessage(text, className) {
    const div = document.createElement('div');
    div.className = `message ${className}`;
    div.innerText = text;
    ui.chatHistory.appendChild(div);
    ui.chatHistory.scrollTop = ui.chatHistory.scrollHeight;
    return div;
}

// ARRANQUE
initLeague();
