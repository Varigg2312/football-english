const DB_FOLDER = './';
const VIP_PASSWORD = "PRO-LEAGUE";
const FREE_LIMIT = 10;

const RANKS = [
    { name: "ROOKIE",      limit: 0    },
    { name: "ACADEMY",     limit: 500  },
    { name: "PRO",         limit: 1500 },
    { name: "WORLD CLASS", limit: 3000 },
    { name: "LEGEND",      limit: 5000 }
];

const sfx = {
    whistle: new Audio('https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3'),
    correct: new Audio('https://cdn.pixabay.com/audio/2021/08/09/audio_9ec164287d.mp3'),
    wrong:   new Audio('https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3'),
    win:     new Audio('https://cdn.pixabay.com/audio/2021/08/04/audio_12b0c7443c.mp3')
};

function playSound(name) {
    try {
        sfx[name].volume = 0.3; sfx[name].currentTime = 0;
        sfx[name].play().catch(() => {});
    } catch(e) {}
}

// STATE
let currentUser = null;
let usersDB = JSON.parse(localStorage.getItem('football_users_db') || '{}');
let usedMessages = 0;
let playerXP = 0;
let playerStreak = 0;
let currentQuizQuestions = [];
let currentQuestionIndex = 0;

const ui = {
    search:       document.getElementById('magic-search'),
    results:      document.getElementById('search-results'),
    matchInfo:    document.getElementById('match-info'),
    main:         document.getElementById('main-content'),
    title:        document.getElementById('lesson-title'),
    level:        document.getElementById('lesson-level'),
    intro:        document.getElementById('lesson-intro'),
    concept:      document.getElementById('core-concept'),
    vocabList:    document.getElementById('vocabulary-list'),
    videoSection: document.getElementById('video-section'),
    videoContainer: document.getElementById('video-container'),
    voiceBtn:     document.getElementById('voice-btn'),
    quizHeaderText: document.getElementById('quiz-header-text'),
    quizQuestion: document.getElementById('quiz-question'),
    quizOptions:  document.getElementById('options-container'),
    feedback:     document.getElementById('feedback-zone'),
    hud:          document.getElementById('player-hud'),
    rankDisplay:  document.getElementById('player-rank'),
    xpDisplay:    document.getElementById('player-xp'),
    streakDisplay: document.getElementById('player-streak'),
    xpBar:        document.getElementById('xp-bar'),
    chatTrigger:  document.getElementById('coach-trigger'),
    chatModal:    document.getElementById('coach-modal'),
    chatClose:    document.getElementById('close-chat'),
    chatHistory:  document.getElementById('chat-history'),
    chatInput:    document.getElementById('user-msg'),
    chatSend:     document.getElementById('send-msg'),
    passwordInput: document.getElementById('api-key-input'),
    authBtn:      document.getElementById('auth-btn'),
    authModal:    document.getElementById('auth-modal'),
    closeAuth:    document.getElementById('close-auth'),
    authUser:     document.getElementById('auth-user'),
    authPass:     document.getElementById('auth-pass'),
    submitAuth:   document.getElementById('submit-auth'),
    toggleAuth:   document.getElementById('toggle-auth-mode'),
    authMsg:      document.getElementById('auth-msg'),
    authTitle:    document.getElementById('auth-title')
};

let allLessons = [];

// Called by i18n.js whenever the language changes — refreshes dynamic strings
window.onLangChange = function () {
    if (currentUser) {
        ui.authBtn.innerHTML = `<i class="fa-solid fa-user-check"></i> ${currentUser} (${t('hud.logout_suffix')})`;
    } else {
        ui.authBtn.innerHTML = `<i class="fa-solid fa-user"></i> ${t('hud.login_btn')}`;
    }
};

async function initLeague() {
    setupChat(); setupAuth(); setupVoiceControl();
    if (window.speechSynthesis) window.speechSynthesis.getVoices();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('status') === 'vip_unlocked') {
        const passInput = document.getElementById('api-key-input');
        if (passInput) { passInput.value = VIP_PASSWORD; localStorage.setItem('user_is_vip', 'true'); }
        alert(t('quiz.pro_unlocked'));
    }
    if (localStorage.getItem('user_is_vip') === 'true') {
        const passInput = document.getElementById('api-key-input');
        if (passInput) passInput.value = VIP_PASSWORD;
    }

    const startBtn  = document.getElementById('start-btn');
    const landing   = document.getElementById('landing-page');
    const appIface  = document.getElementById('app-interface');

    if (startBtn) {
        startBtn.onclick = () => {
            if (landing) landing.classList.add('hidden');
            if (appIface) { appIface.classList.remove('hidden'); appIface.style.display = 'flex'; }
        };
    }

    const savedUser = localStorage.getItem('current_session_user');
    if (savedUser && usersDB[savedUser]) {
        loginUser(savedUser);
        if (landing) landing.classList.add('hidden');
        if (appIface) { appIface.classList.remove('hidden'); appIface.style.display = 'flex'; }
    } else {
        loadGuestData();
    }

    if (ui.hud) ui.hud.classList.remove('hidden');

    try {
        const response = await fetch(DB_FOLDER + 'index.json');
        allLessons = await response.json();
        setupSearch();
    } catch (error) { console.error("Error loading lesson catalogue:", error); }
}

function loadGuestData() {
    playerXP = parseInt(localStorage.getItem('guest_xp') || '0');
    usedMessages = parseInt(localStorage.getItem('guest_msgs') || '0');
    const guestData = {
        streak: parseInt(localStorage.getItem('guest_streak') || '0'),
        lastVisit: localStorage.getItem('guest_last_visit')
    };
    calculateStreak(guestData);
    localStorage.setItem('guest_streak', guestData.streak);
    localStorage.setItem('guest_last_visit', guestData.lastVisit);
    updateHUD(); updateChatStatus();
}

function loginUser(username) {
    currentUser = username;
    localStorage.setItem('current_session_user', username);
    playerXP = usersDB[username].xp;
    usedMessages = usersDB[username].msgs || 0;
    calculateStreak(usersDB[username]);
    saveUsersDB();
    ui.authBtn.innerHTML = `<i class="fa-solid fa-user-check"></i> ${username} (${t('hud.logout_suffix')})`;
    ui.authBtn.classList.add('logged-in');
    updateHUD(); updateChatStatus();
}

function logoutUser() {
    currentUser = null;
    localStorage.removeItem('current_session_user');
    loadGuestData();
    ui.authBtn.innerHTML = `<i class="fa-solid fa-user"></i> ${t('hud.login_btn')}`;
    ui.authBtn.classList.remove('logged-in');
}

function calculateStreak(userData) {
    const today = new Date().toDateString();
    if (userData.lastVisit !== today) {
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        userData.streak = (userData.lastVisit === yesterday.toDateString())
            ? (userData.streak || 0) + 1
            : 1;
        userData.lastVisit = today;
    }
    playerStreak = userData.streak || 0;
}

function saveUsersDB() { localStorage.setItem('football_users_db', JSON.stringify(usersDB)); }

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

function addXP(amount) { playerXP += amount; saveUserData(); updateHUD(); }

function updateHUD() {
    if (!ui.rankDisplay) return;
    let currentRank = RANKS[0]; let nextRankXP = RANKS[1].limit;
    for (let i = 0; i < RANKS.length; i++) {
        if (playerXP >= RANKS[i].limit) {
            currentRank = RANKS[i];
            nextRankXP = RANKS[i + 1] ? RANKS[i + 1].limit : playerXP * 1.5;
        }
    }
    ui.rankDisplay.innerText = currentRank.name;
    ui.xpDisplay.innerText = `${playerXP} pts`;
    ui.streakDisplay.innerText = `${playerStreak} 🔥`;
    ui.xpBar.style.width = `${Math.min(100, (playerXP / nextRankXP) * 100)}%`;
}

function setupAuth() {
    if (!ui.authBtn) return;
    ui.authBtn.onclick = () => {
        if (currentUser) logoutUser();
        else ui.authModal.classList.remove('hidden');
    };
    ui.closeAuth.onclick = () => ui.authModal.classList.add('hidden');

    let isRegisterMode = false;
    ui.toggleAuth.onclick = () => {
        isRegisterMode = !isRegisterMode;
        ui.authTitle.innerText    = t(isRegisterMode ? 'app.auth_title_register' : 'app.auth_title_signin');
        ui.submitAuth.innerText   = t(isRegisterMode ? 'app.auth_submit_register' : 'app.auth_submit_signin');
        ui.toggleAuth.innerHTML   = t(isRegisterMode ? 'app.auth_toggle_signin' : 'app.auth_toggle_register');
        ui.authMsg.innerText = '';
    };

    ui.submitAuth.onclick = () => {
        const user = ui.authUser.value.trim();
        const pass = ui.authPass.value.trim();
        if (!user || !pass) { ui.authMsg.innerText = t('errors.fill_fields'); return; }
        if (isRegisterMode) {
            if (usersDB[user]) { ui.authMsg.innerText = t('errors.user_exists'); }
            else {
                usersDB[user] = { pass, xp: 0, msgs: 0, streak: 1, lastVisit: new Date().toDateString() };
                saveUsersDB(); loginUser(user); ui.authModal.classList.add('hidden');
            }
        } else {
            if (usersDB[user] && usersDB[user].pass === pass) {
                loginUser(user); ui.authModal.classList.add('hidden');
            } else { ui.authMsg.innerText = t('errors.invalid_credentials'); }
        }
    };
}

function setupVoiceControl() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        if (ui.voiceBtn) ui.voiceBtn.style.display = 'none'; return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; recognition.interimResults = false; recognition.maxAlternatives = 1;
    let isListening = false;

    if (ui.voiceBtn) {
        ui.voiceBtn.onclick = () => {
            if (isListening) { recognition.stop(); return; }
            playSound('whistle');
            try { recognition.start(); isListening = true; ui.voiceBtn.classList.add('mic-listening'); }
            catch(e) { isListening = false; ui.voiceBtn.classList.remove('mic-listening'); }
        };
    }
    recognition.onresult = (event) => {
        const speechResult = event.results[0][0].transcript.toLowerCase();
        isListening = false; if (ui.voiceBtn) ui.voiceBtn.classList.remove('mic-listening');
        checkVoiceAnswer(speechResult);
    };
    recognition.onend = () => { isListening = false; if (ui.voiceBtn) ui.voiceBtn.classList.remove('mic-listening'); };
}

function checkVoiceAnswer(text) {
    ui.quizOptions.querySelectorAll('button').forEach(btn => {
        if (btn.disabled) return;
        const btnText = btn.innerText.toLowerCase();
        if (text.includes(btnText) || btnText.includes(text)) btn.click();
    });
}

function setupSearch() {
    if (!ui.search) return;
    ui.search.addEventListener('keyup', (e) => {
        const query = e.target.value.toLowerCase();
        ui.results.innerHTML = '';
        if (query.length < 1) { ui.results.classList.add('hidden'); return; }
        const matches = allLessons.filter(l => l.title.toLowerCase().includes(query));
        if (matches.length > 0) {
            ui.results.classList.remove('hidden');
            matches.forEach(lesson => {
                const div = document.createElement('div');
                div.className = 'result-item';
                div.innerHTML = `<span>${lesson.title}</span> <strong>GO <i class="fa-solid fa-arrow-right"></i></strong>`;
                div.onclick = () => { loadMatch(lesson.file); ui.search.value = lesson.title; ui.results.classList.add('hidden'); };
                ui.results.appendChild(div);
            });
        } else {
            ui.results.innerHTML = `<div class="result-item" style="color:#999">${t('errors.no_matches')}</div>`;
            ui.results.classList.remove('hidden');
        }
    });
    document.addEventListener('click', (e) => { if (!ui.search.contains(e.target)) ui.results.classList.add('hidden'); });
}

async function loadMatch(filename) {
    ui.main.classList.add('hidden'); ui.matchInfo.classList.add('hidden');
    try {
        const response = await fetch(DB_FOLDER + filename);
        const data = await response.json();
        renderTactics(data);
        ui.matchInfo.classList.remove('hidden'); ui.main.classList.remove('hidden');
    } catch (error) { alert(t('errors.load_error')); }
}

function renderTactics(lesson) {
    playSound('whistle');
    if (lesson.video_id) {
        ui.videoSection.classList.remove('hidden');
        if (lesson.video_id.includes('http')) {
            ui.videoContainer.innerHTML = `<video controls autoplay muted style="position:absolute;top:0;left:0;width:100%;height:100%;border:none"><source src="${lesson.video_id}" type="video/mp4"></video>`;
        } else {
            ui.videoContainer.innerHTML = `<iframe src="https://www.youtube.com/embed/${lesson.video_id}?rel=0&modestbranding=1" frameborder="0" allowfullscreen></iframe>`;
        }
    } else { ui.videoSection.classList.add('hidden'); ui.videoContainer.innerHTML = ''; }

    ui.title.innerText = lesson.content.title;
    if (ui.level) ui.level.innerText = `${lesson.meta.difficulty_elo || '1500'} ELO`;
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

    currentQuizQuestions = lesson.interactive_engine.questions
        || [{ scenario: lesson.interactive_engine.scenario_text, options: lesson.interactive_engine.options }];
    currentQuestionIndex = 0;
    showQuestion();
}

function showQuestion() {
    const qData = currentQuizQuestions[currentQuestionIndex];
    if (ui.quizHeaderText) {
        ui.quizHeaderText.textContent = `${t('quiz.scenario_label')} ${currentQuestionIndex + 1}/${currentQuizQuestions.length}`;
    }
    ui.quizQuestion.innerText = qData.scenario || qData.scenario_text;
    ui.quizOptions.innerHTML = ''; ui.feedback.className = 'hidden';
    qData.options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'option-btn'; btn.innerText = option.text;
        btn.onclick = () => handleAnswer(option, btn);
        ui.quizOptions.appendChild(btn);
    });
}

function handleAnswer(option, btnClicked) {
    const isCorrect = /CORRECT|RIGHT/.test(option.outcome.toUpperCase());
    ui.feedback.innerHTML = `<p>${option.feedback}</p>`;
    ui.feedback.className = isCorrect ? 'feedback-box feedback-success' : 'feedback-box feedback-error';
    ui.feedback.style.display = 'block';
    ui.quizOptions.querySelectorAll('button').forEach(b => b.disabled = true);

    if (isCorrect) {
        playSound('correct'); addXP(20);
        btnClicked.style.borderColor = "#4ade80"; btnClicked.style.backgroundColor = "#f0fdf4";
        ui.feedback.innerHTML += ` <strong>${t('quiz.xp_gain')}</strong>`;
    } else {
        playSound('wrong'); btnClicked.style.borderColor = "#fee2e2";
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'cta-button'; nextBtn.style.marginTop = '15px'; nextBtn.style.width = '100%';

    if (currentQuestionIndex < currentQuizQuestions.length - 1) {
        nextBtn.innerHTML = `${t('quiz.next_btn')} <i class="fa-solid fa-forward"></i>`;
        nextBtn.onclick = () => { currentQuestionIndex++; showQuestion(); };
    } else {
        nextBtn.innerHTML = t('quiz.finish_btn');
        nextBtn.onclick = () => {
            playSound('win');
            if (typeof confetti === 'function') confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            if (ui.quizHeaderText) ui.quizHeaderText.textContent = t('quiz.results_header');
            ui.quizQuestion.innerText = t('quiz.completed');
            ui.quizOptions.innerHTML = ''; ui.feedback.classList.add('hidden');
        };
    }
    ui.feedback.appendChild(nextBtn);
}

function setupChat() {
    if (!ui.chatTrigger) return;
    ui.chatTrigger.onclick = () => ui.chatModal.classList.remove('hidden');
    ui.chatClose.onclick   = () => ui.chatModal.classList.add('hidden');
    const mb = document.getElementById('maximize-chat');
    if (mb) mb.onclick = () => {
        ui.chatModal.classList.toggle('fullscreen');
        mb.querySelector('i').className = ui.chatModal.classList.contains('fullscreen')
            ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
    };
    updateChatStatus();
    ui.passwordInput.addEventListener('input', updateChatStatus);
    ui.chatSend.onclick = sendMessage;
    ui.chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
}

function updateChatStatus() {
    const isVip = (ui.passwordInput.value === VIP_PASSWORD);
    const msgsLeft = FREE_LIMIT - usedMessages;
    if (isVip) { ui.passwordInput.style.borderColor = "#00ff88"; ui.chatInput.disabled = false; ui.chatSend.disabled = false; return; }
    if (msgsLeft > 0) { ui.passwordInput.style.borderColor = "#e5e7eb"; ui.chatInput.disabled = false; ui.chatSend.disabled = false; }
    else { ui.passwordInput.style.borderColor = "#fee2e2"; ui.chatInput.disabled = true; ui.chatSend.disabled = true; }
}

async function sendMessage() {
    const text = ui.chatInput.value;
    const isVip = (ui.passwordInput.value === VIP_PASSWORD);
    if (!text) return;
    if (!isVip && usedMessages >= FREE_LIMIT) { alert(t('errors.chat_expired')); return; }

    addMessage(text, 'user-msg');
    ui.chatInput.value = '';
    if (!isVip) { usedMessages++; saveUserData(); updateChatStatus(); }

    const loadingDiv = addMessage(t('quiz.thinking'), 'bot-msg');
    try {
        const response = await fetch("https://football-gaffer-api.alvaroggcasarabonela.workers.dev/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text })
        });
        if (!response.ok) throw new Error("API unavailable");
        const data = await response.json();
        loadingDiv.innerText = data.reply;
    } catch (error) {
        loadingDiv.innerText = t('errors.chat_unavailable');
    }
}

function addMessage(text, cls) {
    const d = document.createElement('div');
    d.className = `message ${cls}`; d.innerText = text;
    ui.chatHistory.appendChild(d); ui.chatHistory.scrollTop = ui.chatHistory.scrollHeight;
    return d;
}

function speak(text) {
    if (!window.speechSynthesis) return;
    const synth = window.speechSynthesis; if (synth.speaking) synth.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = 'en-GB'; u.rate = 0.9; synth.speak(u);
}

initLeague();
