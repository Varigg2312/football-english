const DB_FOLDER = './';

// ==========================================
// 🚨 CONFIGURACIÓN TÁCTICA 🚨
// ==========================================
// TU CLAVE DE DEEPSEEK REAL:
const SYSTEM_KEY = "sk-bb4843296d0f4f039379dc6bf65c53c7"; 
// CONTRASEÑA VIP:
const VIP_PASSWORD = "PRO-LEAGUE"; 
// LÍMITE DE MENSAJES GRATIS:
const FREE_LIMIT = 10; 

// NIVELES DE CARRERA (Gamificación)
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
    
    // HUD (Barra de Progreso)
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
// Persistencia (Guardar progreso en el navegador)
let usedMessages = parseInt(localStorage.getItem('msgs_used') || '0');
let playerXP = parseInt(localStorage.getItem('player_xp') || '0');

// ==========================================
// 1. INICIALIZACIÓN
// ==========================================
async function initLeague() {
    updateHUD(); // Cargar XP y Rango
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
// 2. SISTEMA DE XP Y RANKING
// ==========================================
function addXP(amount) {
    playerXP += amount;
    localStorage.setItem('player_xp', playerXP); // Guardar
    updateHUD();
    
    // Efecto visual
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
// 3. BUSCADOR
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
    document.addEventListener('click', (e) => { if (!ui.search.contains(e.target)) ui.results.classList.add('hidden'); });
}

// ==========================================
// 4. MOTOR DE LECCIONES (+ AUDIO)
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
    
    // VOCABULARIO (Con botones de Audio)
    ui.vocabList.innerHTML = '';
    lesson.content.vocabulary_rich.forEach(word => {
        const li = document.createElement('li');
        
        // Botón Altavoz
        const audioBtn = document.createElement('button');
        audioBtn.className = 'audio-btn';
        audioBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        audioBtn.onclick = () => speak(word.term); // Llama a la función de voz
        
        li.appendChild(audioBtn);
        li.innerHTML += ` <strong>${word.term}</strong>: ${word.meaning}`;
        ui.vocabList.appendChild(li);
    });

    // Quiz
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
                // Premio: XP
                addXP(100); 
                ui.feedback.innerText += " (+100 XP 🎯)";
                btn.style.borderColor = "#4ade80"; 
                btn.style.backgroundColor = "#f0fdf4";
                // Desactivar botones
                const allBtns = ui.quizOptions.querySelectorAll('button');
                allBtns.forEach(b => b.disabled = true);
            }
        };
        ui.quizOptions.appendChild(btn);
    });
}

// ==========================================
// 5. CHATBOT IA
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
    const messagesLeft = FREE_LIMIT - usedMessages;

    if (isVip) {
        ui.passwordInput.style.borderColor = "#00ff88"; 
        ui.passwordInput.style.backgroundColor = "#dcfce7";
        ui.chatInput.disabled = false; ui.chatSend.disabled = false;
        ui.chatInput.placeholder = "VIP ACCESS: The Gaffer is listening...";
        return;
    }
    if (messagesLeft > 0) {
        ui.passwordInput.style.borderColor = "#e5e7eb";
        ui.passwordInput.style.backgroundColor = "#fff";
        ui.chatInput.disabled = false; ui.chatSend.disabled = false;
        ui.chatInput.placeholder = `BETA TRIAL: ${messagesLeft} messages remaining...`;
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

// ==========================================
// 6. MOTOR DE AUDIO (CORREGIDO)
// ==========================================
function speak(text) {
    // Verificar soporte
    if (!window.speechSynthesis) {
        console.error("Audio not supported");
        return;
    }

    const synth = window.speechSynthesis;

    // 🛑 RESET DE SEGURIDAD: Si está hablando, lo callamos para que no se atasque
    if (synth.speaking) {
        synth.cancel();
    }

    // Configurar voz
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB'; // Acento Británico 🇬🇧
    utterance.rate = 0.8;     // Velocidad didáctica
    utterance.pitch = 1;

    // Ejecutar
    synth.speak(utterance);
    console.log("🔊 Speaking:", text);
}

// ARRANQUE DEL SISTEMA
initLeague();
