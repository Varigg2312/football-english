const DB_FOLDER = './';
// Also hardcoded in pro-unlocked.html — keep both in sync if this ever changes.
const WORKER_URL = 'https://football-gaffer-api.alvaroggcasarabonela.workers.dev';
const FREE_LIMIT = 10;
const ANSWER_XP = 20;
const LESSON_COMPLETE_XP = 50;

// Persistent anonymous id used by the Worker for the free-tier message
// counter (kept server-side, not just in localStorage — see sendMessage()).
let clientId = localStorage.getItem('client_id');
if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem('client_id', clientId);
}

let vipCode = localStorage.getItem('user_is_vip_code') || '';
let isVipVerified = false;

async function verifyVip(code) {
    if (!code) return false;
    try {
        const res = await fetch(`${WORKER_URL}/verify-vip`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, clientId })
        });
        const data = await res.json();
        return data.valid === true;
    } catch {
        return false;
    }
}

const RANKS = [
    { name: "ROOKIE",      limit: 0    },
    { name: "ACADEMY",     limit: 500  },
    { name: "PRO",         limit: 1500 },
    { name: "WORLD CLASS", limit: 3000 },
    { name: "LEGEND",      limit: 5000 }
];

const sfx = {
    whistle: new Audio('audio/whistle.mp3'),
    correct: new Audio('audio/correct.mp3'),
    wrong:   new Audio('audio/wrong.mp3'),
    win:     new Audio('audio/win.mp3')
};

function playSound(name) {
    try {
        sfx[name].volume = 0.3; sfx[name].currentTime = 0;
        sfx[name].play().catch(() => {});
    } catch(e) {}
}

// ── STATE ──────────────────────────────────────────────────
let currentUser = null; // null = guest, otherwise the server user object from /api/auth/*
let usedMessages = 0;
let playerXP = 0;
let playerStreak = 0;
let currentQuiz = [];
let currentQuestionIndex = 0;
let currentLessonId = null;

// completedLessons: Set stored as JSON array in localStorage
let completedLessons = new Set(
    JSON.parse(localStorage.getItem('completed_lessons') || '[]')
);

function saveCompletedLessons() {
    localStorage.setItem('completed_lessons', JSON.stringify([...completedLessons]));
}

function markLessonComplete(id) {
    if (completedLessons.has(id)) return;
    completedLessons.add(id);
    saveCompletedLessons();
    // Award completion XP bonus the first time only
    addXP(LESSON_COMPLETE_XP);
}

// ── DOM REFS ───────────────────────────────────────────────
const ui = {
    search:         document.getElementById('magic-search'),
    results:        document.getElementById('search-results'),
    matchInfo:      document.getElementById('match-info'),
    main:           document.getElementById('main-content'),
    title:          document.getElementById('lesson-title'),
    level:          document.getElementById('lesson-level'),
    intro:          document.getElementById('lesson-intro'),
    concept:        document.getElementById('core-concept'),
    vocabList:      document.getElementById('vocabulary-list'),
    videoSection:   document.getElementById('video-section'),
    videoContainer: document.getElementById('video-container'),
    voiceWrapper:   document.getElementById('voice-control-wrapper'),
    voiceBtn:       document.getElementById('voice-btn'),
    quizHeaderText: document.getElementById('quiz-header-text'),
    quizQuestion:   document.getElementById('quiz-question'),
    quizOptions:    document.getElementById('options-container'),
    feedback:       document.getElementById('feedback-zone'),
    hud:            document.getElementById('player-hud'),
    rankDisplay:    document.getElementById('player-rank'),
    xpDisplay:      document.getElementById('player-xp'),
    streakDisplay:  document.getElementById('player-streak'),
    xpBar:          document.getElementById('xp-bar'),
    chatTrigger:    document.getElementById('coach-trigger'),
    chatModal:      document.getElementById('coach-modal'),
    chatClose:      document.getElementById('close-chat'),
    chatHistory:    document.getElementById('chat-history'),
    chatInput:      document.getElementById('user-msg'),
    chatSend:       document.getElementById('send-msg'),
    searchBtn:      document.querySelector('.search-btn'),
    passwordInput:  document.getElementById('api-key-input'),
    authBtn:        document.getElementById('auth-btn'),
    authModal:      document.getElementById('auth-modal'),
    closeAuth:      document.getElementById('close-auth'),
    googleAuthBtn:  document.getElementById('google-auth-btn'),
    authEmail:      document.getElementById('auth-email'),
    authPass:       document.getElementById('auth-pass'),
    submitAuth:     document.getElementById('submit-auth'),
    toggleAuth:     document.getElementById('toggle-auth-mode'),
    authMsg:        document.getElementById('auth-msg'),
    authTitle:      document.getElementById('auth-title')
};

let allLessons = [];  // full lesson objects from lessons.json

// ── i18n BRIDGE ────────────────────────────────────────────
window.onLangChange = function () {
    if (currentUser) {
        setAuthBtnLabel('fa-solid fa-user-check', `${currentUser.displayName} (${t('hud.logout_suffix')})`);
    } else {
        setAuthBtnLabel('fa-solid fa-user', t('hud.login_btn'));
    }
};

// Built via DOM nodes rather than innerHTML — displayName can come from a
// user-chosen email or a Google profile name, neither of which should be
// interpolated into HTML.
function setAuthBtnLabel(iconClass, text) {
    ui.authBtn.innerHTML = '';
    const icon = document.createElement('i');
    icon.className = iconClass;
    icon.setAttribute('aria-hidden', 'true');
    ui.authBtn.appendChild(icon);
    ui.authBtn.appendChild(document.createTextNode(' ' + text));
}

// ── INIT ───────────────────────────────────────────────────
async function initLeague() {
    setupChat(); setupAuth(); setupVoiceControl();
    if (window.speechSynthesis) window.speechSynthesis.getVoices();

    // PRO unlock now happens via pro-unlocked.html after a verified Stripe
    // payment (see /redeem on the Worker) — it stores the code, we just
    // confirm it's still valid with the server here.
    if (vipCode) {
        const passInput = document.getElementById('api-key-input');
        if (passInput) passInput.value = vipCode;
        isVipVerified = await verifyVip(vipCode);
        updateChatStatus();
    }

    const startBtn = document.getElementById('start-btn');
    const landing  = document.getElementById('landing-page');
    const appIface = document.getElementById('app-interface');

    if (startBtn) {
        startBtn.onclick = () => {
            if (landing)  landing.classList.add('hidden');
            if (appIface) { appIface.classList.remove('hidden'); appIface.style.display = 'flex'; }
        };
    }

    // A redirect back from Google carries this marker (see google/callback.js)
    // so we know to try a one-time legacy-progress import right after.
    const params = new URLSearchParams(window.location.search);
    const justLoggedInViaGoogle = params.get('login') === 'success';
    if (justLoggedInViaGoogle) window.history.replaceState({}, '', window.location.pathname);

    try {
        const res  = await fetch('/api/auth/me', { credentials: 'include' });
        const data = await res.json();
        if (data.loggedIn) {
            let user = data.user;
            if (justLoggedInViaGoogle) {
                const imported = await importLegacyProgressIfAny();
                if (imported) user = { ...user, ...imported };
            }
            applyServerUser(user);
            if (landing)  landing.classList.add('hidden');
            if (appIface) { appIface.classList.remove('hidden'); appIface.style.display = 'flex'; }
        } else {
            loadGuestData();
        }
    } catch (err) {
        console.error('Session check failed:', err);
        loadGuestData();
    }

    if (ui.hud) ui.hud.classList.remove('hidden');

    try {
        const res = await fetch(DB_FOLDER + 'lessons.json');
        allLessons = await res.json();
        setupSearch();
    } catch (err) { console.error("Error loading lessons catalogue:", err); }
}

// ── AUTH / SESSION ─────────────────────────────────────────
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

// Applies a user object returned by /api/auth/register, /api/auth/login,
// /api/auth/me or the Google callback redirect.
function applyServerUser(user) {
    currentUser  = user;
    playerXP     = user.xp;
    usedMessages = user.msgs;
    completedLessons = new Set(user.completedLessons || []);
    saveCompletedLessons();
    calculateStreak({ streak: user.streak, lastVisit: parseSqlDateToDateString(user.lastVisit) });
    setAuthBtnLabel('fa-solid fa-user-check', `${user.displayName} (${t('hud.logout_suffix')})`);
    ui.authBtn.classList.add('logged-in');
    updateHUD(); updateChatStatus();
    syncProgressNow(); // persist the just-recalculated streak / stamp last_visit
}

async function logoutUser() {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch {}
    currentUser = null;
    loadGuestData();
    setAuthBtnLabel('fa-solid fa-user', t('hud.login_btn'));
    ui.authBtn.classList.remove('logged-in');
}

function calculateStreak(userData) {
    const today = new Date().toDateString();
    if (userData.lastVisit !== today) {
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        userData.streak = (userData.lastVisit === yesterday.toDateString())
            ? (userData.streak || 0) + 1 : 1;
        userData.lastVisit = today;
    }
    playerStreak = userData.streak || 0;
}

// D1 stores last_visit as a SQL "YYYY-MM-DD HH:MM:SS" (UTC, no zone marker);
// normalize to the same toDateString() shape calculateStreak compares
// against, or a raw string vs. UTC-parsed Date would never match.
function parseSqlDateToDateString(sqlDateTime) {
    if (!sqlDateTime) return null;
    return new Date(sqlDateTime.replace(' ', 'T') + 'Z').toDateString();
}

function saveUserData() {
    if (currentUser) {
        scheduleProgressSync();
    } else {
        localStorage.setItem('guest_xp',   playerXP);
        localStorage.setItem('guest_msgs', usedMessages);
    }
}

// ── SERVER PROGRESS SYNC ───────────────────────────────────
let progressSyncTimer = null;

function scheduleProgressSync() {
    clearTimeout(progressSyncTimer);
    progressSyncTimer = setTimeout(syncProgressNow, 4000);
}

function currentProgressPayload() {
    return {
        xp: playerXP,
        msgs: usedMessages,
        streak: playerStreak,
        completedLessons: [...completedLessons],
    };
}

async function syncProgressNow() {
    if (!currentUser) return;
    try {
        await fetch('/api/auth/progress', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentProgressPayload()),
        });
    } catch (err) { console.error('Progress sync failed:', err); }
}

// Fires on tab close/hide — sendBeacon fires-and-forgets even as the page is
// unloading, unlike a regular fetch which the browser may abort mid-flight.
function flushProgressBeacon() {
    if (!currentUser) return;
    const blob = new Blob([JSON.stringify(currentProgressPayload())], { type: 'application/json' });
    navigator.sendBeacon('/api/auth/progress', blob);
}
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushProgressBeacon();
});
window.addEventListener('pagehide', flushProgressBeacon);

// Old localStorage-only progress lived in one of two places depending on
// whether the browser ever used the pre-account local login: guest_* keys
// for guests, or football_users_db[username] for the old local accounts.
// Imported once (server-enforced, see progress/import.js) right after the
// first login/registration under the new system.
function collectLegacyProgress() {
    const guestXp     = parseInt(localStorage.getItem('guest_xp') || '0');
    const guestMsgs   = parseInt(localStorage.getItem('guest_msgs') || '0');
    const guestStreak = parseInt(localStorage.getItem('guest_streak') || '0');

    let legacyXp = 0, legacyMsgs = 0, legacyStreak = 0;
    try {
        const oldUsername = localStorage.getItem('current_session_user');
        const oldDb = JSON.parse(localStorage.getItem('football_users_db') || '{}');
        if (oldUsername && oldDb[oldUsername]) {
            legacyXp     = oldDb[oldUsername].xp || 0;
            legacyMsgs   = oldDb[oldUsername].msgs || 0;
            legacyStreak = oldDb[oldUsername].streak || 0;
        }
    } catch {}

    return {
        xp: Math.max(guestXp, legacyXp),
        msgs: Math.max(guestMsgs, legacyMsgs),
        streak: Math.max(guestStreak, legacyStreak),
        completedLessons: [...completedLessons],
    };
}

async function importLegacyProgressIfAny() {
    const payload = collectLegacyProgress();
    const hasAnything = payload.xp || payload.msgs || payload.streak || payload.completedLessons.length;
    if (!hasAnything) return null;
    try {
        const res = await fetch('/api/auth/progress/import', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

function addXP(amount) { playerXP += amount; saveUserData(); updateHUD(); }

function updateHUD() {
    if (!ui.rankDisplay) return;
    let rank = RANKS[0]; let nextXP = RANKS[1].limit;
    for (let i = 0; i < RANKS.length; i++) {
        if (playerXP >= RANKS[i].limit) { rank = RANKS[i]; nextXP = RANKS[i + 1] ? RANKS[i + 1].limit : playerXP * 1.5; }
    }
    ui.rankDisplay.innerText  = rank.name;
    ui.xpDisplay.innerText    = `${playerXP} pts`;
    ui.streakDisplay.innerText = `${playerStreak} 🔥`;
    ui.xpBar.style.width       = `${Math.min(100, (playerXP / nextXP) * 100)}%`;
}

function setupAuth() {
    if (!ui.authBtn) return;
    ui.authBtn.onclick  = () => { if (currentUser) logoutUser(); else ui.authModal.classList.remove('hidden'); };
    ui.closeAuth.onclick = () => ui.authModal.classList.add('hidden');

    let isRegisterMode = false;
    ui.toggleAuth.onclick = () => {
        isRegisterMode = !isRegisterMode;
        ui.authTitle.innerText  = t(isRegisterMode ? 'app.auth_title_register' : 'app.auth_title_signin');
        ui.submitAuth.innerText = t(isRegisterMode ? 'app.auth_submit_register' : 'app.auth_submit_signin');
        ui.toggleAuth.innerHTML = t(isRegisterMode ? 'app.auth_toggle_signin' : 'app.auth_toggle_register');
        ui.authMsg.innerText    = '';
    };

    if (ui.googleAuthBtn) {
        ui.googleAuthBtn.onclick = () => { window.location.href = '/api/auth/google/start'; };
    }

    ui.submitAuth.onclick = async () => {
        const email = ui.authEmail.value.trim();
        const pass  = ui.authPass.value;
        if (!email || !pass) { ui.authMsg.innerText = t('errors.fill_fields'); return; }

        ui.submitAuth.disabled = true;
        ui.authMsg.innerText = '';
        try {
            const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
            const res = await fetch(endpoint, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: pass }),
            });
            const data = await res.json();
            if (!res.ok) { ui.authMsg.innerText = authErrorMessage(data.error); return; }

            let user = data.user;
            const imported = await importLegacyProgressIfAny();
            if (imported) user = { ...user, ...imported };

            applyServerUser(user);
            ui.authModal.classList.add('hidden');
            ui.authEmail.value = ''; ui.authPass.value = '';
        } catch {
            ui.authMsg.innerText = t('errors.auth_generic');
        } finally {
            ui.submitAuth.disabled = false;
        }
    };
}

function authErrorMessage(code) {
    switch (code) {
        case 'email_exists':        return t('errors.user_exists');
        case 'invalid_email':       return t('errors.invalid_email');
        case 'weak_password':       return t('errors.weak_password');
        case 'invalid_credentials': return t('errors.invalid_credentials');
        default:                    return t('errors.auth_generic');
    }
}

// ── VOICE ──────────────────────────────────────────────────
let speechSupported = false;

function setupVoiceControl() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        if (ui.voiceWrapper) ui.voiceWrapper.classList.add('hidden');
        return;
    }
    speechSupported = true;
    if (ui.voiceWrapper) ui.voiceWrapper.classList.remove('hidden');
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
    recognition.onresult = (e) => {
        const speech = e.results[0][0].transcript.toLowerCase();
        isListening = false; if (ui.voiceBtn) ui.voiceBtn.classList.remove('mic-listening');
        ui.quizOptions.querySelectorAll('button').forEach(btn => {
            if (btn.disabled) return;
            const t2 = btn.innerText.toLowerCase();
            if (speech.includes(t2) || t2.includes(speech)) btn.click();
        });
    };
    recognition.onend = () => { isListening = false; if (ui.voiceBtn) ui.voiceBtn.classList.remove('mic-listening'); };
}

// ── SEARCH ─────────────────────────────────────────────────
function performSearch() {
    const query = ui.search.value.toLowerCase();
    ui.results.innerHTML = '';
    if (query.length < 1) { ui.results.classList.add('hidden'); return; }
    const matches = allLessons.filter(l => l.title.toLowerCase().includes(query));
    if (matches.length > 0) {
        ui.results.classList.remove('hidden');
        matches.forEach(lesson => renderSearchResult(lesson));
    } else {
        ui.results.innerHTML = `<div class="result-item" style="color:#6b7280">${t('errors.no_matches')}</div>`;
        ui.results.classList.remove('hidden');
    }
}

function setupSearch() {
    if (!ui.search) return;
    ui.search.addEventListener('keyup', performSearch);
    if (ui.searchBtn) {
        ui.searchBtn.addEventListener('click', () => { ui.search.focus(); performSearch(); });
    }
    document.addEventListener('click', (e) => { if (!ui.search.contains(e.target)) ui.results.classList.add('hidden'); });
}

function renderSearchResult(lesson) {
    const done = completedLessons.has(lesson.id);
    const div  = document.createElement('div');
    div.className = 'result-item';
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    div.innerHTML = `
        <span>
            ${done ? '<span class="lesson-done" title="Completed">✓</span>' : ''}
            ${lesson.title}
        </span>
        <strong>${t('app.search_go')} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></strong>`;
    const select = () => {
        loadLesson(lesson.id);
        ui.search.value = lesson.title;
        ui.results.classList.add('hidden');
    };
    div.onclick = select;
    div.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
    };
    ui.results.appendChild(div);
}

// ── LESSON LOADER ──────────────────────────────────────────
function loadLesson(id) {
    const lesson = allLessons.find(l => l.id === id);
    if (!lesson) { alert(t('errors.load_error')); return; }
    currentLessonId = id;
    ui.main.classList.add('hidden'); ui.matchInfo.classList.add('hidden');
    renderLesson(lesson);
    ui.matchInfo.classList.remove('hidden'); ui.main.classList.remove('hidden');
}

// ── LESSON RENDERER (new lessons.json schema) ──────────────
function renderLesson(lesson) {
    playSound('whistle');

    // Video
    if (lesson.video_id) {
        ui.videoSection.classList.remove('hidden');
        if (lesson.video_id.includes('http')) {
            ui.videoContainer.innerHTML = `<video controls autoplay muted style="position:absolute;top:0;left:0;width:100%;height:100%;border:none"><source src="${lesson.video_id}" type="video/mp4"></video>`;
        } else {
            ui.videoContainer.innerHTML = `<iframe src="https://www.youtube.com/embed/${lesson.video_id}?rel=0&modestbranding=1" frameborder="0" allowfullscreen></iframe>`;
        }
    } else { ui.videoSection.classList.add('hidden'); ui.videoContainer.innerHTML = ''; }

    // Header info. The placeholder text in index.html carries data-i18n
    // attributes for the "no lesson loaded yet" state — drop them once real
    // lesson content lands here, otherwise a later language switch would
    // stomp this over with the placeholder string again.
    ui.title.removeAttribute('data-i18n');
    ui.title.innerText = lesson.title;
    if (ui.level) ui.level.innerText = `${lesson.difficulty_elo} ELO`;
    ui.intro.removeAttribute('data-i18n');
    ui.intro.innerText = lesson.content.intro_hook;

    // Core concept + analogy. Content is first-party (authored in
    // lessons.json), but built with textContent rather than innerHTML anyway
    // so this doesn't become the one exception to the "never interpolate
    // untrusted-shaped strings into HTML" rule the chat code follows.
    ui.concept.innerHTML = '';
    const conceptP = document.createElement('p');
    conceptP.textContent = lesson.content.core_concept;
    ui.concept.appendChild(conceptP);
    if (lesson.content.analogy) {
        const analogyP = document.createElement('p');
        analogyP.className = 'concept-analogy';
        const em = document.createElement('em');
        em.textContent = `💡 ${lesson.content.analogy}`;
        analogyP.appendChild(em);
        ui.concept.appendChild(analogyP);
    }

    // Vocabulary
    ui.vocabList.innerHTML = '';
    (lesson.content.vocabulary || []).forEach(word => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.className = 'audio-btn';
        btn.innerHTML = '<i class="fa-solid fa-volume-high" aria-hidden="true"></i>';
        btn.setAttribute('aria-label', `Pronounce "${word.term}"`);
        btn.onclick = () => speak(word.term);
        li.appendChild(btn);
        // Appended as a sibling node instead of `li.innerHTML +=`, which would
        // re-parse (and thus discard) the button's onclick handler above.
        // textContent throughout, not innerHTML — see core-concept comment above.
        const label = document.createElement('span');
        const strong = document.createElement('strong');
        strong.textContent = word.term;
        label.appendChild(document.createTextNode(' '));
        label.appendChild(strong);
        label.appendChild(document.createTextNode(`: ${word.meaning}`));
        li.appendChild(label);
        ui.vocabList.appendChild(li);
    });

    // Quiz
    currentQuiz = lesson.quiz || [];
    currentQuestionIndex = 0;
    showQuestion();
}

// ── QUIZ ENGINE ────────────────────────────────────────────
function showQuestion() {
    const q = currentQuiz[currentQuestionIndex];
    if (!q) return;
    // Restore the mic control (hidden by finishLesson on a previous lesson)
    // now that there's a question again to answer.
    if (ui.voiceWrapper && speechSupported) ui.voiceWrapper.classList.remove('hidden');
    if (ui.quizHeaderText) {
        ui.quizHeaderText.removeAttribute('data-i18n');
        ui.quizHeaderText.textContent = `${t('quiz.scenario_label')} ${currentQuestionIndex + 1}/${currentQuiz.length}`;
    }
    ui.quizQuestion.innerText = q.question;
    ui.quizOptions.innerHTML  = '';
    ui.feedback.className     = 'hidden';

    q.options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = option.text;
        btn.onclick   = () => handleAnswer(option, btn);
        ui.quizOptions.appendChild(btn);
    });
}

function handleAnswer(option, btnClicked) {
    const isCorrect = option.correct === true;

    ui.feedback.innerHTML = `<p>${option.feedback}</p>`;
    ui.feedback.className = isCorrect ? 'feedback-box feedback-success' : 'feedback-box feedback-error';
    ui.feedback.style.display = 'block';
    ui.quizOptions.querySelectorAll('button').forEach(b => b.disabled = true);

    if (isCorrect) {
        playSound('correct'); addXP(ANSWER_XP);
        btnClicked.style.borderColor     = '#4ade80';
        btnClicked.style.backgroundColor = '#f0fdf4';
        // Explicit dark text: in dark mode .option-btn's own rule sets a
        // light color, which against this always-light green background
        // was nearly unreadable (light-on-light).
        btnClicked.style.color           = '#166534';
        ui.feedback.innerHTML += ` <strong>${t('quiz.xp_gain')}</strong>`;
    } else {
        playSound('wrong');
        btnClicked.style.borderColor = '#fca5a5';
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'cta-button';
    nextBtn.style.cssText = 'margin-top:15px;width:100%';

    const isLastQuestion = currentQuestionIndex >= currentQuiz.length - 1;

    if (!isLastQuestion) {
        nextBtn.innerHTML = `${t('quiz.next_btn')} <i class="fa-solid fa-forward"></i>`;
        nextBtn.onclick   = () => { currentQuestionIndex++; showQuestion(); };
    } else {
        nextBtn.innerHTML = t('quiz.finish_btn');
        nextBtn.onclick   = () => finishLesson();
    }
    ui.feedback.appendChild(nextBtn);
}

function finishLesson() {
    playSound('win');
    if (typeof confetti === 'function') confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    if (ui.quizHeaderText) ui.quizHeaderText.textContent = t('quiz.results_header');
    ui.quizQuestion.innerText = t('quiz.completed');
    ui.quizOptions.innerHTML  = '';
    ui.feedback.classList.add('hidden');
    // No more question to answer, so the "tap & speak" mic control has
    // nothing left to do — leaving it visible here reads as broken/dead UI.
    if (ui.voiceWrapper) ui.voiceWrapper.classList.add('hidden');

    // Mark lesson as completed
    if (currentLessonId) markLessonComplete(currentLessonId);

    // Show progress badge
    const badge = document.createElement('div');
    badge.className = 'lesson-complete-banner';
    badge.innerHTML = `<span class="lesson-done-big">✓</span> ${t('quiz.completed')} <strong>${t('quiz.completion_bonus').replace('{xp}', LESSON_COMPLETE_XP)}</strong>`;
    ui.quizOptions.appendChild(badge);
}

// ── CHAT ───────────────────────────────────────────────────
function setupChat() {
    if (!ui.chatTrigger) return;
    const mb = document.getElementById('maximize-chat');
    ui.chatTrigger.onclick = () => ui.chatModal.classList.remove('hidden');
    ui.chatClose.onclick   = () => {
        ui.chatModal.classList.add('hidden');
        // Always leave fullscreen behind on close, so it never reopens stuck
        // in a state where its own controls could be unreachable again.
        ui.chatModal.classList.remove('fullscreen');
        if (mb) { mb.querySelector('i').className = 'fa-solid fa-expand'; mb.setAttribute('aria-label', 'Maximize'); }
    };
    if (mb) mb.onclick = () => {
        const isFullscreen = ui.chatModal.classList.toggle('fullscreen');
        mb.querySelector('i').className = isFullscreen ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
        mb.setAttribute('aria-label', isFullscreen ? 'Restore' : 'Maximize');
    };
    updateChatStatus();
    ui.passwordInput.addEventListener('change', async () => {
        const code = ui.passwordInput.value.trim();
        isVipVerified = await verifyVip(code);
        if (isVipVerified) {
            vipCode = code;
            localStorage.setItem('user_is_vip_code', vipCode);
        }
        updateChatStatus();
    });
    ui.chatSend.onclick = sendMessage;
    ui.chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
}

function updateChatStatus() {
    const msgsLeft = FREE_LIMIT - usedMessages;
    if (isVipVerified) { ui.passwordInput.style.borderColor = '#00ff88'; ui.chatInput.disabled = false; ui.chatSend.disabled = false; return; }
    if (msgsLeft > 0) { ui.passwordInput.style.borderColor = '#e5e7eb'; ui.chatInput.disabled = false; ui.chatSend.disabled = false; }
    else { ui.passwordInput.style.borderColor = '#fee2e2'; ui.chatInput.disabled = true; ui.chatSend.disabled = true; }
}

async function sendMessage() {
    const text = ui.chatInput.value;
    if (!text) return;
    // Local counter is only a UX shortcut to avoid pointless requests —
    // the Worker enforces the real limit server-side regardless.
    if (!isVipVerified && usedMessages >= FREE_LIMIT) { alert(t('errors.chat_expired')); return; }

    addMessage(text, 'user-msg');
    ui.chatInput.value = '';

    const loadingDiv = addMessage(t('quiz.thinking'), 'bot-msg');
    try {
        const res = await fetch(`${WORKER_URL}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Client-Id': clientId,
                'X-Vip-Code': isVipVerified ? vipCode : ''
            },
            body: JSON.stringify({ message: text })
        });
        if (res.status === 403) { loadingDiv.innerText = t('errors.chat_expired'); return; }
        if (!res.ok) throw new Error('API unavailable');
        const data = await res.json();
        loadingDiv.innerText = stripMarkdown(data.reply);
        // Only counted on a successful reply — the Worker mirrors this same
        // rule server-side, so a timeout/502/invalid request never costs the
        // user one of their free messages on either side.
        if (!isVipVerified) { usedMessages++; saveUserData(); updateChatStatus(); }
    } catch {
        loadingDiv.innerText = t('errors.chat_unavailable');
    }
}

// The chat renders replies as plain text (innerText, never innerHTML — an
// LLM reply is untrusted input), so raw Markdown from DeepSeek shows up as
// literal asterisks/hashes instead of being styled. Strip the common markers.
function stripMarkdown(text) {
    if (!text) return text;
    return text
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/__(.+?)__/g, '$1')
        .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^[-*]\s+/gm, '• ');
}

function addMessage(text, cls) {
    const d = document.createElement('div');
    d.className = `message ${cls}`; d.innerText = text;
    ui.chatHistory.appendChild(d); ui.chatHistory.scrollTop = ui.chatHistory.scrollHeight;
    return d;
}

function speak(text) {
    if (!window.speechSynthesis) return;
    const s = window.speechSynthesis; if (s.speaking) s.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = 'en-GB'; u.rate = 0.9; s.speak(u);
}

initLeague();
