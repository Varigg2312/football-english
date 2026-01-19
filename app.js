const DB_FOLDER = './';

// ==========================================
// 🚨 ZONA DE CONFIGURACIÓN 🚨
// ==========================================
// TU CLAVE DE DEEPSEEK (Ya incluida)
const SYSTEM_KEY = "sk-bb4843296d0f4f039379dc6bf65c53c7"; 

// LA CONTRASEÑA PARA TUS ALUMNOS VIP
const VIP_PASSWORD = "PRO-LEAGUE"; 
// ==========================================

const ui = {
    // UI Principal
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
    
    // UI del Chatbot
    chatTrigger: document.getElementById('coach-trigger'),
    chatModal: document.getElementById('coach-modal'),
    chatMaximize: document.getElementById('maximize-chat'), // Botón nuevo
    chatClose: document.getElementById('close-chat'),
    chatHistory: document.getElementById('chat-history'),
    chatInput: document.getElementById('user-msg'),
    chatSend: document.getElementById('send-msg'),
    passwordInput: document.getElementById('api-key-input') 
};

let allLessons = [];

// 1. INICIALIZAR LIGA
async function initLeague() {
    try {
        const response = await fetch(DB_FOLDER + 'index.json');
        if (!response.ok) throw new Error("Index not found");
        allLessons = await response.json();
        
        setupSearch();
        setupChat();
    } catch (error) { console.error(error); if(ui.title) ui.title.innerText = "❌ System Error"; }
}

// 2. BUSCADOR
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
                    loadMatch(lesson.file); ui.search.value = lesson.title; ui.results.classList.add('hidden');
                };
                ui.results.appendChild(div);
            });
        } else { ui.results.innerHTML = '<div class="result-item" style="color: #999">No matches found...</div>'; ui.results.classList.remove('hidden'); }
    });
    document.addEventListener('click', (e) => { if (!ui.search.contains(e.target)) ui.results.classList.add('hidden'); });
}

// 3. CARGAR LECCIÓN
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
        li.innerHTML = `<strong>${word.term}</strong>: ${word.meaning}`;
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
        };
        ui.quizOptions.appendChild(btn);
    });
}

// 4. CHATBOT VIP (FULL SCREEN)
function setupChat() {
    if(!ui.chatTrigger) return;
    ui.chatTrigger.onclick = () => ui.chatModal.classList.remove('hidden');
    ui.chatClose.onclick = () => ui.chatModal.classList.add('hidden');

    // LOGICA PANTALLA COMPLETA
    if(ui.chatMaximize) {
        ui.chatMaximize.onclick = () => {
            ui.chatModal.classList.toggle('fullscreen');
            const icon = ui.chatMaximize.querySelector('i');
            if(ui.chatModal.classList.contains('fullscreen')) {
                icon.className = "fa-solid fa-compress"; // Icono reducir
            } else {
                icon.className = "fa-solid fa-expand"; // Icono expandir
            }
        };
    }

    // PASSWORD VIP
    ui.passwordInput.addEventListener('input', (e) => {
        if(e.target.value === VIP_PASSWORD) {
            ui.passwordInput.style.borderColor = "#00ff88"; 
            ui.passwordInput.style.backgroundColor = "#dcfce7";
            ui.chatInput.disabled = false; ui.chatSend.disabled = false;
            ui.chatInput.placeholder = "Coach is listening... Ask anything!";
        } else {
            ui.passwordInput.style.borderColor = "#e5e7eb";
            ui.passwordInput.style.backgroundColor = "#f9fafb";
            ui.chatInput.disabled = true; ui.chatSend.disabled = true;
        }
    });

    ui.chatSend.onclick = sendMessage;
    ui.chatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendMessage(); });
}

async function sendMessage() {
    const text = ui.chatInput.value;
    const userPass = ui.passwordInput.value;
    
    if (!text || userPass !== VIP_PASSWORD) { alert("Access Denied"); return; }

    addMessage(text, 'user-msg');
    ui.chatInput.value = '';
    const loadingDiv = addMessage('Analyzing tactics...', 'bot-msg');

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
                    { role: "system", content: "You are 'The Gaffer', an intense English football manager. Brief, motivational, football metaphors." },
                    { role: "user", content: text }
                ]
            })
        });
        if (!response.ok) throw new Error("API Limit");
        const data = await response.json();
        loadingDiv.innerText = data.choices[0].message.content;
    } catch (error) { loadingDiv.innerText = "❌ Server error. Check API limits."; console.error(error); }
}

function addMessage(text, className) {
    const div = document.createElement('div');
    div.className = `message ${className}`;
    div.innerText = text;
    ui.chatHistory.appendChild(div);
    ui.chatHistory.scrollTop = ui.chatHistory.scrollHeight;
    return div;
}

initLeague();
