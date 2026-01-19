const DB_FOLDER = './'; // Ruta raíz

// ==========================================
// 1. ELEMENTOS DE LA INTERFAZ (UI)
// ==========================================
const ui = {
    // Buscador y Contenido Principal
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

    // Chatbot (El Tutor)
    chatTrigger: document.getElementById('coach-trigger'),
    chatModal: document.getElementById('coach-modal'),
    chatClose: document.getElementById('close-chat'),
    chatHistory: document.getElementById('chat-history'),
    chatInput: document.getElementById('user-msg'),
    chatSend: document.getElementById('send-msg'),
    apiKeyInput: document.getElementById('api-key-input')
};

let allLessons = []; // Aquí guardaremos todas las lecciones

// ==========================================
// 2. INICIALIZACIÓN (LIGA)
// ==========================================
async function initLeague() {
    try {
        const response = await fetch(DB_FOLDER + 'index.json');
        if (!response.ok) throw new Error("Index not found");
        
        allLessons = await response.json();
        console.log("Lessons loaded:", allLessons);

        setupSearch(); // Activar el buscador
        setupChat();   // Activar el Chatbot

    } catch (error) {
        console.error(error);
        ui.title.innerText = "❌ System Error";
        ui.intro.innerText = "Check connection or JSON files.";
    }
}

// ==========================================
// 3. LÓGICA DEL BUSCADOR (TIPO CANVA)
// ==========================================
function setupSearch() {
    ui.search.addEventListener('keyup', (e) => {
        const query = e.target.value.toLowerCase();
        ui.results.innerHTML = ''; // Limpiar

        if (query.length < 1) {
            ui.results.classList.add('hidden');
            return;
        }

        // Filtrar lecciones
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
            ui.results.innerHTML = '<div class="result-item" style="color: #999">No matches found. Try "VAR"...</div>';
            ui.results.classList.remove('hidden');
        }
    });

    // Ocultar al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!ui.search.contains(e.target)) {
            ui.results.classList.add('hidden');
        }
    });
}

// ==========================================
// 4. CARGAR LECCIÓN (MATCH)
// ==========================================
async function loadMatch(filename) {
    ui.main.classList.add('hidden');
    ui.matchInfo.classList.add('hidden');

    try {
        const response = await fetch(DB_FOLDER + filename);
        if (!response.ok) throw new Error("Lesson file not found");
        
        const data = await response.json();
        renderTactics(data);
        
        ui.matchInfo.classList.remove('hidden');
        ui.main.classList.remove('hidden');
        
    } catch (error) {
        console.error(error);
        alert("Error loading match: " + filename);
    }
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
        };
        ui.quizOptions.appendChild(btn);
    });
}

// ==========================================
// 5. CHATBOT IA (THE GAFFER)
// ==========================================
function setupChat() {
    // Abrir y cerrar ventana
    ui.chatTrigger.onclick = () => ui.chatModal.classList.remove('hidden');
    ui.chatClose.onclick = () => ui.chatModal.classList.add('hidden');

    // Habilitar input solo si hay API Key
    ui.apiKeyInput.addEventListener('input', (e) => {
        if(e.target.value.length > 5) {
            ui.chatInput.disabled = false;
            ui.chatSend.disabled = false;
            ui.chatInput.placeholder = "Ask me about football grammar...";
        }
    });

    // Enviar mensaje
    ui.chatSend.onclick = sendMessage;
    ui.chatInput.addEventListener('keypress', (e) => { 
        if(e.key === 'Enter') sendMessage(); 
    });
}

async function sendMessage() {
    const text = ui.chatInput.value;
    const key = ui.apiKeyInput.value;
    
    if (!text || !key) return;

    // 1. Pintar mensaje usuario
    addMessage(text, 'user-msg');
    ui.chatInput.value = '';
    
    // 2. Pintar "Pensando..."
    const loadingDiv = addMessage('Tactical analysis...', 'bot-msg');

    try {
        // 3. LLAMADA A LA API DEEPSEEK
        const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${key}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { 
                        role: "system", 
                        content: "You are 'The Gaffer', an intense, charismatic English football manager teaching English. Use football metaphors (VAR, offside, red card) to explain grammar and vocabulary. Be brief, direct, and motivational." 
                    },
                    { role: "user", content: text }
                ]
            })
        });

        if (!response.ok) throw new Error("API Error");

        const data = await response.json();
        
        // 4. Mostrar respuesta
        loadingDiv.innerText = data.choices[0].message.content;

    } catch (error) {
        loadingDiv.innerText = "❌ Foul Play: Invalid API Key or Connection Error.";
        console.error(error);
    }
}

// Función auxiliar para añadir globos de chat
function addMessage(text, className) {
    const div = document.createElement('div');
    div.className = `message ${className}`;
    div.innerText = text;
    ui.chatHistory.appendChild(div);
    ui.chatHistory.scrollTop = ui.chatHistory.scrollHeight; // Auto-scroll al final
    return div;
}

// ARRANQUE DEL SISTEMA
initLeague();
