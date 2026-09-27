// Also hardcoded in pro-unlocked.js — keep both in sync if this ever changes.
const WORKER_URL = 'https://football-gaffer-api.alvaroggcasarabonela.workers.dev';
const LESSONS_URL = '/lessons.json';
const FREE_LIMIT = 10;
const ANSWER_XP = 20;
const LESSON_COMPLETE_XP = 50;
// Previous chat turns sent along with each message so the coach can follow
// the conversation. Kept in memory only (never stored), capped so requests
// stay small; the Worker applies the same limits server-side.
const CHAT_HISTORY_TURNS = 6;
const CHAT_TURN_MAX_CHARS = 1000;

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function storageGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
function storageSet(key, value) { try { localStorage.setItem(key, value); } catch {} }

// Persistent anonymous id used by the Worker for the free-tier message
// counter (kept server-side, not just in localStorage — see sendMessage()).
let clientId = storageGet('client_id');
if (!clientId) {
    clientId = crypto.randomUUID();
    storageSet('client_id', clientId);
}

let vipCode = storageGet('user_is_vip_code') || '';
let isVipVerified = false;

// Returns { valid, reason } — reason is set by the Worker for the
// device-limit and rate-limit cases so the UI can say why.
async function verifyVip(code) {
    if (!code) return { valid: false };
    try {
        const res = await fetch(`${WORKER_URL}/verify-vip`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, clientId })
        });
        const data = await res.json();
        return { valid: data.valid === true, reason: data.reason || (res.status === 429 ? 'rate_limited' : null) };
    } catch {
        return { valid: false, reason: 'network' };
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
    whistle: new Audio('/audio/whistle.mp3'),
    correct: new Audio('/audio/correct.mp3'),
    wrong:   new Audio('/audio/wrong.mp3'),
    win:     new Audio('/audio/win.mp3')
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
let quizCorrect = 0;
let isReplay = false;    // lesson was already completed when opened → no XP
let chatTurns = [];      // [{ role: 'user'|'assistant', content }]

// completedLessons: the guest's list lives in localStorage; a logged-in
// user's list comes from the server and is never written there, so logging
// out on a shared device doesn't leave one account's progress behind for
// the next person (it used to overwrite the guest list on every login).
function loadGuestCompletedLessons() {
    try { return new Set(JSON.parse(storageGet('completed_lessons') || '[]')); }
    catch { return new Set(); }
}
let completedLessons = loadGuestCompletedLessons();

function saveCompletedLessons() {
    if (currentUser) return; // synced to the server instead (see saveUserData)
    storageSet('completed_lessons', JSON.stringify([...completedLessons]));
}

function markLessonComplete(id) {
    if (completedLessons.has(id)) return false;
    completedLessons.add(id);
    saveCompletedLessons();
    addXP(LESSON_COMPLETE_XP); // first time only
    return true;
}

// ── DOM REFS ───────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const ui = {
    landing:        $('landing-page'),
    appIface:       $('app-interface'),
    main:           $('main'),
    homeHero:       $('home-hero'),
    homeView:       $('home-view'),
    vocabView:      $('vocab-view'),
    lessonView:     $('lesson-view'),
    lessonGrid:     $('lesson-grid'),
    catalogProgress: $('catalog-progress'),
    catalogFill:    $('catalog-progress-fill'),
    vocabBank:      $('vocab-bank'),
    vocabFilter:    $('vocab-filter'),
    vocabCount:     $('vocab-count'),
    vocabEmpty:     $('vocab-empty'),
    backBtn:        $('back-to-lessons'),
    premiumBanner:  $('premium-banner'),
    search:         $('magic-search'),
    results:        $('search-results'),
    title:          $('lesson-title'),
    level:          $('lesson-level'),
    intro:          $('lesson-intro'),
    concept:        $('core-concept'),
    vocabList:      $('vocabulary-list'),
    videoSection:   $('video-section'),
    videoContainer: $('video-container'),
    voiceWrapper:   $('voice-control-wrapper'),
    voiceBtn:       $('voice-btn'),
    quizHeaderText: $('quiz-header-text'),
    quizQuestion:   $('quiz-question'),
    quizOptions:    $('options-container'),
    feedback:       $('feedback-zone'),
    hud:            $('player-hud'),
    rankDisplay:    $('player-rank'),
    xpDisplay:      $('player-xp'),
    streakDisplay:  $('player-streak'),
    xpBar:          $('xp-bar'),
    xpProgress:     $('xp-progress'),
    chatTrigger:    $('coach-trigger'),
    chatModal:      $('coach-modal'),
    chatClose:      $('close-chat'),
    chatMaximize:   $('maximize-chat'),
    chatHistory:    $('chat-history'),
    chatInput:      $('user-msg'),
    chatSend:       $('send-msg'),
    freeLeft:       $('free-msgs-left'),
    vipStatus:      $('vip-status'),
    searchBtn:      document.querySelector('.search-btn'),
    passwordInput:  $('api-key-input'),
    authBtn:        $('auth-btn'),
    authModal:      $('auth-modal'),
    authForm:       $('auth-form'),
    closeAuth:      $('close-auth'),
    googleAuthBtn:  $('google-auth-btn'),
    authDivider:    $('auth-divider'),
    authEmail:      $('auth-email'),
    authPass:       $('auth-pass'),
    submitAuth:     $('submit-auth'),
    toggleAuth:     $('toggle-auth-mode'),
    toggleAuthWrap: $('toggle-auth-wrap'),
    forgotLink:     $('forgot-password-link'),
    backToSigninLink: $('back-to-signin-link'),
    authMsg:        $('auth-msg'),
    authTitle:      $('auth-title'),
    authSubtitle:   $('auth-subtitle')
};

let allLessons = [];  // full lesson objects from lessons.json, sorted by difficulty
let lessonsLoadFailed = false;

// ── i18n BRIDGE ────────────────────────────────────────────
window.onLangChange = function () {
    if (currentUser) {
        setAuthBtnLabel('fa-solid fa-user-check', `${currentUser.displayName} (${t('hud.logout_suffix')})`);
    } else {
        setAuthBtnLabel('fa-solid fa-user', t('hud.login_btn'));
    }
    updateChatStatus();
    renderCatalog();
    renderVocabBank();
    if (currentLessonId && !ui.lessonView.classList.contains('hidden')) {
        const lesson = allLessons.find(l => l.id === currentLessonId);
        if (lesson) { renderLessonHeader(lesson); renderLessonVocab(lesson); }
    }
    syncMaximizeLabel();
};

// Built via DOM nodes rather than innerHTML — displayName can come from a
// user-chosen email or a Google profile name, neither of which should be
// interpolated into HTML.
// The text sits in its own span so narrow screens can show just the icon
// (see .auth-label in football.css); aria-label keeps it announced.
function setAuthBtnLabel(iconClass, text) {
    ui.authBtn.innerHTML = '';
    const icon = document.createElement('i');
    icon.className = iconClass;
    icon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'auth-label';
    label.textContent = text;
    ui.authBtn.append(icon, label);
    ui.authBtn.setAttribute('aria-label', text);
}

function levelLabel(lesson) {
    return `${t('levels.' + lesson.difficulty)} · ${lesson.difficulty_elo} ELO`;
}

// ── ROUTER ─────────────────────────────────────────────────
// Real URLs (served as index.html by public/_redirects) so the Android
// app's launcher shortcuts and shared links land on the right screen.
function parseRoute(pathname) {
    const path = pathname.replace(/\/+$/, '') || '/';
    if (path === '/vocabulary') return { view: 'vocab' };
    const m = path.match(/^\/lessons\/([\w-]+)$/);
    if (m) return { view: 'lesson', id: m[1] };
    if (path === '/lessons') return { view: 'home', explicit: true };
    return { view: 'home' };
}

function navigate(path, { replace = false } = {}) {
    if (path !== location.pathname) {
        if (replace) history.replaceState({}, '', path);
        else history.pushState({}, '', path);
    }
    renderRoute();
}

function showApp() {
    ui.landing.classList.add('hidden');
    ui.appIface.classList.remove('hidden');
    ui.appIface.style.display = 'flex';
}

function renderRoute() {
    const route = parseRoute(location.pathname);
    ui.results.classList.add('hidden');

    if (route.view === 'lesson') {
        if (!allLessons.length) return; // re-run once lessons.json arrives
        const lesson = allLessons.find(l => l.id === route.id);
        if (!lesson) {
            navigate('/lessons', { replace: true });
            showCatalogNotice(t('errors.lesson_not_found'));
            return;
        }
        // Fresh quiz every time the lesson is entered (from the catalogue,
        // search, back/forward) — only a same-lesson re-render is skipped.
        const entering = ui.lessonView.classList.contains('hidden');
        showView('lesson');
        if (entering || currentLessonId !== lesson.id) renderLesson(lesson);
        document.title = `${lesson.title} — Football English Academy`;
        ui.title.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: 'auto' });
        return;
    }

    document.title = 'Football English Academy';
    if (route.view === 'vocab') {
        showView('vocab');
        renderVocabBank();
    } else {
        showView('home');
        renderCatalog();
    }
}

function showView(name) {
    ui.homeView.classList.toggle('hidden', name !== 'home');
    ui.vocabView.classList.toggle('hidden', name !== 'vocab');
    ui.lessonView.classList.toggle('hidden', name !== 'lesson');
    ui.homeHero.classList.toggle('hidden', name === 'lesson');
    // Keep the lesson screen focused on the lesson; the upsell stays on the
    // catalogue/vocabulary screens (and is hidden for PRO users anyway).
    ui.premiumBanner.classList.toggle('in-lesson', name === 'lesson');
    document.querySelectorAll('.view-tab').forEach(tab => {
        const active = (tab.dataset.route === 'lessons' && name === 'home') || (tab.dataset.route === 'vocabulary' && name === 'vocab');
        tab.classList.toggle('active', active);
        if (active) tab.setAttribute('aria-current', 'page'); else tab.removeAttribute('aria-current');
    });
    if (name !== 'lesson' && window.speechSynthesis) window.speechSynthesis.cancel();
}

// Same-origin in-app links (tabs, lesson cards) go through the router
// instead of a full page load.
document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="/lessons"], a[href="/vocabulary"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(a.getAttribute('href'));
});
window.addEventListener('popstate', renderRoute);

// ── INIT ───────────────────────────────────────────────────
async function initLeague() {
    setupChat(); setupAuth(); setupVoiceControl(); setupSearch(); setupVocabFilter(); setupModals();
    if (window.speechSynthesis) window.speechSynthesis.getVoices();

    ui.backBtn.onclick = () => navigate('/lessons');

    // Returning visitors and deep links (launcher shortcuts, shared lesson
    // links) skip the landing splash; first-time visitors to / still see it.
    const route = parseRoute(location.pathname);
    const skipLanding = route.view !== 'home' || route.explicit || storageGet('landing_seen') === '1';
    if (skipLanding) showApp();

    $('start-btn').onclick = () => {
        storageSet('landing_seen', '1');
        showApp();
        ui.main.focus({ preventScroll: true });
    };

    // A redirect back from Google carries this marker (see google/callback.js)
    // so we know to try a one-time legacy-progress import right after.
    const params = new URLSearchParams(window.location.search);
    const justLoggedInViaGoogle = params.get('login') === 'success';
    const googleAuthError = params.get('auth_error');
    if (justLoggedInViaGoogle || googleAuthError) window.history.replaceState({}, '', window.location.pathname);

    // Lessons and session are independent — fetch in parallel.
    const lessonsPromise = loadLessons();

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
            storageSet('landing_seen', '1');
            showApp();
        } else {
            loadGuestData();
            if (googleAuthError) showGoogleAuthError(googleAuthError);
        }
    } catch (err) {
        console.error('Session check failed:', err);
        loadGuestData();
    }

    // PRO unlock happens via pro-unlocked.html after a verified Stripe
    // payment (see /redeem on the Worker) — it stores the code, we just
    // confirm it's still valid with the server here.
    if (vipCode) {
        ui.passwordInput.value = vipCode;
        const { valid } = await verifyVip(vipCode);
        isVipVerified = valid;
        updateChatStatus();
    }

    await lessonsPromise;
}

async function loadLessons() {
    lessonsLoadFailed = false;
    try {
        const res = await fetch(LESSONS_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        allLessons = (await res.json()).slice().sort((a, b) => a.difficulty_elo - b.difficulty_elo);
    } catch (err) {
        console.error('Error loading lessons catalogue:', err);
        lessonsLoadFailed = true;
    }
    renderRoute();
}

// ── CATALOGUE ──────────────────────────────────────────────
let catalogNotice = '';
function showCatalogNotice(text) { catalogNotice = text; renderCatalog(); }

function renderCatalog() {
    const grid = ui.lessonGrid;
    grid.innerHTML = '';

    if (catalogNotice) {
        const p = document.createElement('p');
        p.className = 'notice';
        p.setAttribute('role', 'status');
        p.textContent = catalogNotice;
        grid.appendChild(p);
        catalogNotice = '';
    }

    if (lessonsLoadFailed) {
        const p = document.createElement('p');
        p.className = 'empty-state';
        p.textContent = t('errors.load_error');
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'cta-button';
        retry.textContent = t('offline.retry');
        retry.onclick = loadLessons;
        grid.append(p, retry);
        ui.catalogProgress.textContent = '';
        return;
    }
    if (!allLessons.length) {
        const p = document.createElement('p');
        p.className = 'empty-state';
        p.textContent = t('app.loading_lessons');
        grid.appendChild(p);
        return;
    }

    const done = allLessons.filter(l => completedLessons.has(l.id)).length;
    ui.catalogProgress.textContent = tf('app.lessons_done', { done, total: allLessons.length });
    ui.catalogFill.style.width = `${Math.round((done / allLessons.length) * 100)}%`;

    for (const lesson of allLessons) {
        const isDone = completedLessons.has(lesson.id);
        const a = document.createElement('a');
        a.href = `/lessons/${lesson.id}`;
        a.className = 'lesson-card' + (isDone ? ' is-done' : '');
        a.dataset.level = lesson.difficulty;

        const top = document.createElement('div');
        top.className = 'lesson-card-top';
        const badge = document.createElement('span');
        badge.className = 'level-pill';
        badge.textContent = t('levels.' + lesson.difficulty);
        top.appendChild(badge);
        if (lesson.video_id) {
            const v = document.createElement('i');
            v.className = 'fa-solid fa-video lesson-flag';
            v.setAttribute('role', 'img');
            v.setAttribute('aria-label', t('app.lesson_video_label'));
            top.appendChild(v);
        }
        if (isDone) {
            const check = document.createElement('span');
            check.className = 'lesson-done';
            check.setAttribute('role', 'img');
            check.setAttribute('aria-label', t('app.lesson_done_label'));
            check.textContent = '✓';
            top.appendChild(check);
        }

        const h3 = document.createElement('h3');
        h3.className = 'lesson-card-title';
        h3.textContent = lesson.title;

        const meta = document.createElement('p');
        meta.className = 'lesson-card-meta';
        meta.textContent = tf('app.lesson_meta', {
            q: (lesson.quiz || []).length,
            v: (lesson.content.vocabulary || []).length
        });

        a.append(top, h3, meta);
        grid.appendChild(a);
    }
}

// ── VOCABULARY BANK ────────────────────────────────────────
function allVocabulary() {
    const seen = new Map();
    for (const lesson of allLessons) {
        for (const word of lesson.content.vocabulary || []) {
            const key = word.term.toLowerCase();
            if (!seen.has(key)) seen.set(key, { ...word, lesson });
        }
    }
    return [...seen.values()].sort((a, b) => a.term.localeCompare(b.term, 'en'));
}

function renderVocabBank() {
    if (ui.vocabView.classList.contains('hidden') && ui.vocabBank.childElementCount) return;
    const query = ui.vocabFilter.value.trim().toLowerCase();
    const words = allVocabulary();
    const shown = words.filter(w =>
        !query ||
        w.term.toLowerCase().includes(query) ||
        w.meaning.toLowerCase().includes(query) ||
        (w.meaning_es || '').toLowerCase().includes(query));

    ui.vocabCount.textContent = words.length ? tf('app.vocab_count', { n: words.length }) : '';
    ui.vocabBank.innerHTML = '';
    for (const word of shown) {
        const li = vocabItem(word);
        const from = document.createElement('a');
        from.href = `/lessons/${word.lesson.id}`;
        from.className = 'vocab-from';
        from.textContent = tf('app.vocab_from', { lesson: word.lesson.title });
        li.querySelector('.vocab-text').appendChild(from);
        ui.vocabBank.appendChild(li);
    }
    ui.vocabEmpty.classList.toggle('hidden', shown.length > 0 || !allLessons.length);
}

function setupVocabFilter() {
    ui.vocabFilter.addEventListener('input', renderVocabBank);
}

// One vocabulary row: pronounce button + term + meaning (+ Spanish gloss
// when the UI is in Spanish). textContent throughout, never innerHTML.
function vocabItem(word) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'audio-btn';
    btn.innerHTML = '<i class="fa-solid fa-volume-high" aria-hidden="true"></i>';
    btn.setAttribute('aria-label', tf('app.pronounce', { term: word.term }));
    btn.onclick = () => speak(word.term);
    li.appendChild(btn);

    const text = document.createElement('div');
    text.className = 'vocab-text';
    const strong = document.createElement('strong');
    strong.lang = 'en';
    strong.textContent = word.term;
    const meaning = document.createElement('span');
    meaning.lang = 'en';
    meaning.textContent = `: ${word.meaning}`;
    text.append(strong, meaning);
    if (word.meaning_es && getCurrentLang() === 'es') {
        const es = document.createElement('span');
        es.className = 'vocab-es';
        es.lang = 'es';
        es.textContent = `🇪🇸 ${word.meaning_es}`;
        text.appendChild(es);
    }
    li.appendChild(text);
    return li;
}

// ── AUTH / SESSION ─────────────────────────────────────────
// google/callback.js redirects failures back as /?auth_error=<code>: reopen
// the sign-in modal with the reason instead of dropping the user on the
// landing page with no feedback.
function showGoogleAuthError(code) {
    showApp();
    ui.authBtn.click();
    ui.authMsg.className = 'error-msg';
    ui.authMsg.innerText = t(code === 'google_email_taken' ? 'errors.google_email_taken' : 'errors.google_failed');
}

function loadGuestData() {
    playerXP = parseInt(storageGet('guest_xp') || '0');
    usedMessages = parseInt(storageGet('guest_msgs') || '0');
    completedLessons = loadGuestCompletedLessons();
    const guestData = {
        streak: parseInt(storageGet('guest_streak') || '0'),
        lastVisit: storageGet('guest_last_visit')
    };
    calculateStreak(guestData);
    storageSet('guest_streak', guestData.streak);
    storageSet('guest_last_visit', guestData.lastVisit);
    updateHUD(); updateChatStatus(); renderCatalog();
}

// Applies a user object returned by /api/auth/register, /api/auth/login,
// /api/auth/me or the Google callback redirect.
function applyServerUser(user) {
    currentUser  = user;
    playerXP     = user.xp;
    usedMessages = user.msgs;
    completedLessons = new Set(user.completedLessons || []);
    calculateStreak({ streak: user.streak, lastVisit: parseSqlDateToDateString(user.lastVisit) });
    setAuthBtnLabel('fa-solid fa-user-check', `${user.displayName} (${t('hud.logout_suffix')})`);
    ui.authBtn.classList.add('logged-in');
    updateHUD(); updateChatStatus(); renderCatalog();
    syncProgressNow(); // persist the just-recalculated streak / stamp last_visit
}

async function logoutUser() {
    await syncProgressNow();
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
        storageSet('guest_xp',   playerXP);
        storageSet('guest_msgs', usedMessages);
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
    clearTimeout(progressSyncTimer);
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
    const guestXp     = parseInt(storageGet('guest_xp') || '0');
    const guestMsgs   = parseInt(storageGet('guest_msgs') || '0');
    const guestStreak = parseInt(storageGet('guest_streak') || '0');

    let legacyXp = 0, legacyMsgs = 0, legacyStreak = 0;
    try {
        const oldUsername = storageGet('current_session_user');
        const oldDb = JSON.parse(storageGet('football_users_db') || '{}');
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
        completedLessons: [...loadGuestCompletedLessons()],
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
    let rank = RANKS[0]; let prevXP = 0; let nextXP = RANKS[1].limit;
    for (let i = 0; i < RANKS.length; i++) {
        if (playerXP >= RANKS[i].limit) {
            rank = RANKS[i];
            prevXP = RANKS[i].limit;
            nextXP = RANKS[i + 1] ? RANKS[i + 1].limit : null;
        }
    }
    // Progress within the current rank, not since 0 — otherwise the bar sat
    // almost full for the whole of every rank after the first.
    const pct = nextXP === null ? 100 : Math.min(100, Math.round(((playerXP - prevXP) / (nextXP - prevXP)) * 100));
    ui.rankDisplay.innerText  = rank.name;
    ui.xpDisplay.innerText    = `${playerXP} pts`;
    ui.streakDisplay.innerText = `${playerStreak} 🔥`;
    ui.xpBar.style.width       = `${pct}%`;
    ui.xpProgress.setAttribute('aria-valuenow', String(pct));
}

// ── MODALS ─────────────────────────────────────────────────
// Shared open/close for the chat and sign-in dialogs: focus moves into the
// dialog on open, Escape closes it, and focus returns to whatever opened it.
let openModalEl = null;
let modalReturnFocus = null;

function openModal(el, focusTarget) {
    if (openModalEl && openModalEl !== el) closeModal(openModalEl);
    modalReturnFocus = document.activeElement;
    el.classList.remove('hidden');
    openModalEl = el;
    if (el === ui.chatModal) ui.chatTrigger.setAttribute('aria-expanded', 'true');
    const target = focusTarget || el.querySelector('input:not([disabled]):not(.hidden), button:not([disabled])');
    if (target) setTimeout(() => target.focus(), 0);
}

function closeModal(el) {
    el.classList.add('hidden');
    if (el === ui.chatModal) {
        ui.chatTrigger.setAttribute('aria-expanded', 'false');
        // Always leave fullscreen behind on close, so it never reopens stuck
        // in a state where its own controls could be unreachable again.
        ui.chatModal.classList.remove('fullscreen');
        syncMaximizeLabel();
    }
    if (openModalEl === el) openModalEl = null;
    if (modalReturnFocus && document.contains(modalReturnFocus)) modalReturnFocus.focus();
    modalReturnFocus = null;
}

function setupModals() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && openModalEl) { e.preventDefault(); closeModal(openModalEl); }
        // Keep Tab inside the open dialog.
        if (e.key === 'Tab' && openModalEl) {
            const focusables = [...openModalEl.querySelectorAll('button, a[href], input, select, textarea')]
                .filter(n => !n.disabled && n.offsetParent !== null);
            if (!focusables.length) return;
            const first = focusables[0], last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    });
}

function setupAuth() {
    let mode = 'signin'; // 'signin' | 'register' | 'forgot'

    function renderAuthMode() {
        const isForgot = mode === 'forgot';
        ui.authPass.classList.toggle('hidden', isForgot);
        ui.googleAuthBtn.classList.toggle('hidden', isForgot);
        ui.authDivider.classList.toggle('hidden', isForgot);
        ui.toggleAuthWrap.classList.toggle('hidden', isForgot);
        ui.forgotLink.classList.toggle('hidden', mode !== 'signin');
        ui.backToSigninLink.classList.toggle('hidden', !isForgot);
        ui.authPass.setAttribute('autocomplete', mode === 'register' ? 'new-password' : 'current-password');

        if (mode === 'register') {
            ui.authTitle.innerText    = t('app.auth_title_register');
            ui.authSubtitle.innerText = t('app.auth_subtitle');
            ui.submitAuth.innerText   = t('app.auth_submit_register');
            ui.toggleAuth.innerHTML   = t('app.auth_toggle_signin');
        } else if (isForgot) {
            ui.authTitle.innerText    = t('app.auth_title_forgot');
            ui.authSubtitle.innerText = t('app.auth_subtitle_forgot');
            ui.submitAuth.innerText   = t('app.auth_submit_forgot');
        } else {
            ui.authTitle.innerText    = t('app.auth_title_signin');
            ui.authSubtitle.innerText = t('app.auth_subtitle');
            ui.submitAuth.innerText   = t('app.auth_submit_signin');
            ui.toggleAuth.innerHTML   = t('app.auth_toggle_register');
        }
        ui.authMsg.className = 'error-msg';
        ui.authMsg.innerText = '';
    }

    ui.authBtn.onclick  = () => {
        if (currentUser) { logoutUser(); return; }
        mode = 'signin';
        renderAuthMode();
        openModal(ui.authModal, ui.googleAuthBtn);
    };
    ui.closeAuth.onclick = () => closeModal(ui.authModal);

    ui.toggleAuth.onclick = () => { mode = mode === 'register' ? 'signin' : 'register'; renderAuthMode(); ui.authEmail.focus(); };
    ui.forgotLink.onclick = (e) => { e.preventDefault(); mode = 'forgot'; renderAuthMode(); ui.authEmail.focus(); };
    ui.backToSigninLink.onclick = (e) => { e.preventDefault(); mode = 'signin'; renderAuthMode(); ui.authEmail.focus(); };

    ui.googleAuthBtn.onclick = () => { window.location.href = '/api/auth/google/start'; };

    // A real <form> so Enter submits and password managers recognise it.
    ui.authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = ui.authEmail.value.trim();

        if (mode === 'forgot') {
            if (!email) { ui.authMsg.className = 'error-msg'; ui.authMsg.innerText = t('errors.fill_fields'); return; }
            ui.submitAuth.disabled = true;
            try {
                const res = await fetch('/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });
                if (!res.ok) throw new Error('failed');
                ui.authMsg.className = 'success-msg';
                ui.authMsg.innerText = t('app.auth_forgot_sent');
            } catch {
                ui.authMsg.className = 'error-msg';
                ui.authMsg.innerText = t('errors.auth_generic');
            } finally {
                ui.submitAuth.disabled = false;
            }
            return;
        }

        const pass = ui.authPass.value;
        if (!email || !pass) { ui.authMsg.className = 'error-msg'; ui.authMsg.innerText = t('errors.fill_fields'); return; }

        ui.submitAuth.disabled = true;
        ui.authMsg.className = 'error-msg';
        ui.authMsg.innerText = '';
        try {
            const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
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
            closeModal(ui.authModal);
            ui.authEmail.value = ''; ui.authPass.value = '';
        } catch {
            ui.authMsg.innerText = t('errors.auth_generic');
        } finally {
            ui.submitAuth.disabled = false;
        }
    });
}

function authErrorMessage(code) {
    switch (code) {
        case 'email_exists':        return t('errors.user_exists');
        case 'invalid_email':       return t('errors.invalid_email');
        case 'weak_password':       return t('errors.weak_password');
        case 'invalid_credentials': return t('errors.invalid_credentials');
        case 'too_many_attempts':   return t('errors.too_many_attempts');
        default:                    return t('errors.auth_generic');
    }
}

// ── VOICE ──────────────────────────────────────────────────
let speechSupported = false;

function setupVoiceControl() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        ui.voiceWrapper.classList.add('hidden');
        return;
    }
    speechSupported = true;
    ui.voiceWrapper.classList.remove('hidden');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; recognition.interimResults = false; recognition.maxAlternatives = 1;
    let isListening = false;

    ui.voiceBtn.onclick = () => {
        if (isListening) { recognition.stop(); return; }
        playSound('whistle');
        try { recognition.start(); isListening = true; ui.voiceBtn.classList.add('mic-listening'); }
        catch(e) { isListening = false; ui.voiceBtn.classList.remove('mic-listening'); }
    };
    recognition.onresult = (e) => {
        const speech = normalizeSpeech(e.results[0][0].transcript);
        isListening = false; ui.voiceBtn.classList.remove('mic-listening');
        if (speech.length < 3) return;
        // Pick the single best-matching option (most shared words) instead
        // of clicking every button whose text merely contains a short word.
        const spokenWords = new Set(speech.split(' '));
        let best = null, bestScore = 0;
        ui.quizOptions.querySelectorAll('button.option-btn').forEach(btn => {
            if (btn.disabled) return;
            const text = normalizeSpeech(btn.innerText);
            let score = text.includes(speech) || speech.includes(text) ? 100 : 0;
            for (const w of text.split(' ')) if (w.length > 2 && spokenWords.has(w)) score++;
            if (score > bestScore) { best = btn; bestScore = score; }
        });
        if (best && bestScore >= 2) best.click();
    };
    recognition.onend = () => { isListening = false; ui.voiceBtn.classList.remove('mic-listening'); };
}

function normalizeSpeech(s) {
    return s.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── SEARCH ─────────────────────────────────────────────────
// Matches lesson titles and vocabulary terms (so "penalty" finds the lesson
// that teaches the word even if it's not in the title).
function searchLessons(query) {
    return allLessons.filter(l =>
        l.title.toLowerCase().includes(query) ||
        (l.content.vocabulary || []).some(v => v.term.toLowerCase().includes(query) || (v.meaning_es || '').toLowerCase().includes(query)));
}

function performSearch() {
    const query = ui.search.value.trim().toLowerCase();
    ui.results.innerHTML = '';
    if (query.length < 1) { ui.results.classList.add('hidden'); return; }
    const matches = searchLessons(query);
    if (matches.length > 0) {
        matches.forEach(lesson => renderSearchResult(lesson));
    } else {
        const div = document.createElement('div');
        div.className = 'result-item result-empty';
        div.textContent = t('errors.no_matches');
        ui.results.appendChild(div);
    }
    ui.results.classList.remove('hidden');
}

function setupSearch() {
    ui.search.addEventListener('input', performSearch);
    ui.search.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch();
            const first = ui.results.querySelector('[role="option"]');
            if (first) first.click();
        } else if (e.key === 'ArrowDown') {
            const first = ui.results.querySelector('[role="option"]');
            if (first) { e.preventDefault(); first.focus(); }
        } else if (e.key === 'Escape') {
            ui.results.classList.add('hidden');
        }
    });
    ui.searchBtn.addEventListener('click', () => { ui.search.focus(); performSearch(); });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrapper')) ui.results.classList.add('hidden');
    });
}

function renderSearchResult(lesson) {
    const done = completedLessons.has(lesson.id);
    const div  = document.createElement('div');
    div.className = 'result-item';
    div.setAttribute('role', 'option');
    div.setAttribute('tabindex', '0');

    const label = document.createElement('span');
    if (done) {
        const check = document.createElement('span');
        check.className = 'lesson-done';
        check.setAttribute('role', 'img');
        check.setAttribute('aria-label', t('app.lesson_done_label'));
        check.textContent = '✓';
        label.appendChild(check);
    }
    label.appendChild(document.createTextNode(lesson.title));
    const go = document.createElement('strong');
    go.textContent = `${t('app.search_go')} `;
    go.insertAdjacentHTML('beforeend', '<i class="fa-solid fa-arrow-right" aria-hidden="true"></i>');
    div.append(label, go);

    const select = () => {
        ui.search.value = '';
        ui.results.classList.add('hidden');
        navigate(`/lessons/${lesson.id}`);
    };
    div.onclick = select;
    div.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
        else if (e.key === 'ArrowDown' && div.nextElementSibling) { e.preventDefault(); div.nextElementSibling.focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); (div.previousElementSibling || ui.search).focus(); }
        else if (e.key === 'Escape') { ui.results.classList.add('hidden'); ui.search.focus(); }
    };
    ui.results.appendChild(div);
}

// ── LESSON RENDERER ────────────────────────────────────────
function renderLessonHeader(lesson) {
    ui.title.innerText = lesson.title;
    ui.level.innerText = levelLabel(lesson);
    ui.intro.innerText = lesson.content.intro_hook;
}

function renderLessonVocab(lesson) {
    ui.vocabList.innerHTML = '';
    (lesson.content.vocabulary || []).forEach(word => ui.vocabList.appendChild(vocabItem(word)));
}

function renderLesson(lesson) {
    playSound('whistle');
    currentLessonId = lesson.id;
    isReplay = completedLessons.has(lesson.id);

    // Video
    if (lesson.video_id) {
        ui.videoSection.classList.remove('hidden');
        ui.videoContainer.innerHTML = '';
        if (lesson.video_id.includes('http')) {
            const video = document.createElement('video');
            video.controls = true; video.muted = true; video.playsInline = true;
            video.preload = 'metadata';
            const source = document.createElement('source');
            source.src = lesson.video_id; source.type = 'video/mp4';
            video.appendChild(source);
            ui.videoContainer.appendChild(video);
        } else {
            const iframe = document.createElement('iframe');
            iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(lesson.video_id)}?rel=0&modestbranding=1`;
            iframe.title = lesson.title;
            iframe.allowFullscreen = true;
            iframe.loading = 'lazy';
            ui.videoContainer.appendChild(iframe);
        }
    } else { ui.videoSection.classList.add('hidden'); ui.videoContainer.innerHTML = ''; }

    renderLessonHeader(lesson);

    // Core concept + analogy — textContent, see vocabItem().
    ui.concept.innerHTML = '';
    const conceptP = document.createElement('p');
    conceptP.lang = 'en';
    conceptP.textContent = lesson.content.core_concept;
    ui.concept.appendChild(conceptP);
    if (lesson.content.analogy) {
        const analogyP = document.createElement('p');
        analogyP.className = 'concept-analogy';
        analogyP.lang = 'en';
        const em = document.createElement('em');
        em.textContent = `💡 ${lesson.content.analogy}`;
        analogyP.appendChild(em);
        ui.concept.appendChild(analogyP);
    }

    renderLessonVocab(lesson);

    // Quiz
    currentQuiz = lesson.quiz || [];
    currentQuestionIndex = 0;
    quizCorrect = 0;
    showQuestion();
}

// ── QUIZ ENGINE ────────────────────────────────────────────
function showQuestion() {
    const q = currentQuiz[currentQuestionIndex];
    if (!q) return;
    // Restore the mic control (hidden by finishLesson on a previous lesson)
    // now that there's a question again to answer.
    if (speechSupported) ui.voiceWrapper.classList.remove('hidden');
    ui.quizHeaderText.removeAttribute('data-i18n');
    ui.quizHeaderText.textContent = `${t('quiz.scenario_label')} ${currentQuestionIndex + 1}/${currentQuiz.length}`;
    ui.quizQuestion.innerText = q.question;
    ui.quizQuestion.lang = 'en';
    ui.quizOptions.innerHTML  = '';
    ui.feedback.className     = 'hidden';
    ui.feedback.innerHTML     = '';

    shuffled(q.options).forEach(option => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-btn';
        btn.lang = 'en';
        btn.innerText = option.text;
        btn.onclick   = () => handleAnswer(option, btn, q);
        ui.quizOptions.appendChild(btn);
    });
}

// Fisher-Yates on a copy: lessons.json authors the correct answer in the
// same slot almost every time, which made it guessable by position.
function shuffled(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function handleAnswer(option, btnClicked, question) {
    const isCorrect = option.correct === true;

    ui.feedback.innerHTML = '';
    const p = document.createElement('p');
    p.lang = 'en';
    p.textContent = option.feedback;
    ui.feedback.appendChild(p);
    ui.feedback.className = isCorrect ? 'feedback-box feedback-success' : 'feedback-box feedback-error';

    ui.quizOptions.querySelectorAll('button').forEach(b => {
        b.disabled = true;
        // Always reveal the right answer, so a wrong guess still teaches.
        const opt = question.options.find(o => o.text === b.innerText);
        if (opt && opt.correct) b.classList.add('is-correct');
    });

    if (isCorrect) {
        quizCorrect++;
        playSound('correct');
        if (!isReplay) {
            addXP(ANSWER_XP);
            const strong = document.createElement('strong');
            strong.textContent = tf('quiz.xp_gain', { xp: ANSWER_XP });
            ui.feedback.appendChild(strong);
        }
    } else {
        playSound('wrong');
        btnClicked.classList.add('is-wrong');
    }

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'cta-button next-btn';

    const isLastQuestion = currentQuestionIndex >= currentQuiz.length - 1;
    if (!isLastQuestion) {
        nextBtn.innerHTML = `${t('quiz.next_btn')} <i class="fa-solid fa-forward" aria-hidden="true"></i>`;
        nextBtn.onclick   = () => { currentQuestionIndex++; showQuestion(); ui.quizOptions.querySelector('button')?.focus(); };
    } else {
        nextBtn.textContent = t('quiz.finish_btn');
        nextBtn.onclick   = () => finishLesson();
    }
    ui.feedback.appendChild(nextBtn);
    nextBtn.focus({ preventScroll: true });
}

function finishLesson() {
    playSound('win');
    if (typeof confetti === 'function' && !prefersReducedMotion) confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    ui.quizHeaderText.textContent = t('quiz.results_header');
    ui.quizQuestion.innerText = t('quiz.completed');
    ui.quizQuestion.removeAttribute('lang');
    ui.quizOptions.innerHTML  = '';
    ui.feedback.className = 'hidden';
    // No more question to answer, so the "tap & speak" mic control has
    // nothing left to do — leaving it visible here reads as broken/dead UI.
    ui.voiceWrapper.classList.add('hidden');

    const firstCompletion = currentLessonId ? markLessonComplete(currentLessonId) : false;

    const banner = document.createElement('div');
    banner.className = 'lesson-complete-banner';
    banner.setAttribute('role', 'status');
    const big = document.createElement('span');
    big.className = 'lesson-done-big';
    big.setAttribute('aria-hidden', 'true');
    big.textContent = '✓';
    const text = document.createElement('div');
    const score = document.createElement('p');
    score.textContent = tf('quiz.score', { n: quizCorrect, total: currentQuiz.length });
    text.appendChild(score);
    const bonus = document.createElement('p');
    if (firstCompletion) {
        const strong = document.createElement('strong');
        strong.textContent = tf('quiz.completion_bonus', { xp: LESSON_COMPLETE_XP });
        bonus.appendChild(strong);
    } else {
        bonus.className = 'replay-note';
        bonus.textContent = t('quiz.replay_note');
    }
    text.appendChild(bonus);
    banner.append(big, text);
    ui.quizOptions.appendChild(banner);

    // Suggest the next lesson in the programme that isn't done yet.
    const idx = allLessons.findIndex(l => l.id === currentLessonId);
    const next = allLessons.slice(idx + 1).find(l => !completedLessons.has(l.id))
        || allLessons.find(l => !completedLessons.has(l.id));
    if (next) {
        const a = document.createElement('a');
        a.href = `/lessons/${next.id}`;
        a.className = 'cta-button next-lesson-btn';
        a.textContent = `${t('quiz.next_lesson')}: ${next.title} →`;
        ui.quizOptions.appendChild(a);
    }
    renderCatalog();
}

// ── CHAT ───────────────────────────────────────────────────
function syncMaximizeLabel() {
    const isFullscreen = ui.chatModal.classList.contains('fullscreen');
    ui.chatMaximize.querySelector('i').className = isFullscreen ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
    ui.chatMaximize.setAttribute('aria-label', t(isFullscreen ? 'app.restore_label' : 'app.maximize_label'));
}

function setupChat() {
    ui.chatTrigger.onclick = () => {
        if (openModalEl === ui.chatModal) closeModal(ui.chatModal);
        else openModal(ui.chatModal, ui.chatInput.disabled ? ui.passwordInput : ui.chatInput);
    };
    ui.chatClose.onclick = () => closeModal(ui.chatModal);
    ui.chatMaximize.onclick = () => {
        ui.chatModal.classList.toggle('fullscreen');
        syncMaximizeLabel();
    };
    syncMaximizeLabel();
    updateChatStatus();
    ui.passwordInput.addEventListener('change', async () => {
        const code = ui.passwordInput.value.trim().toUpperCase();
        ui.passwordInput.value = code;
        if (!code) { isVipVerified = false; setVipStatus(''); updateChatStatus(); return; }
        const { valid, reason } = await verifyVip(code);
        isVipVerified = valid;
        if (valid) {
            vipCode = code;
            storageSet('user_is_vip_code', vipCode);
        } else {
            setVipStatus(t(reason === 'device_limit_reached' ? 'app.vip_device_limit'
                : reason === 'rate_limited' ? 'app.vip_rate_limited' : 'app.vip_invalid'), true);
        }
        updateChatStatus();
    });
    ui.chatSend.onclick = sendMessage;
    ui.chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) sendMessage(); });
}

function setVipStatus(text, isError) {
    ui.vipStatus.textContent = text;
    ui.vipStatus.className = 'vip-status' + (isError ? ' is-error' : text ? ' is-ok' : '');
}

function updateChatStatus() {
    if (!ui.chatInput) return;
    const msgsLeft = Math.max(0, FREE_LIMIT - usedMessages);
    ui.passwordInput.classList.toggle('is-valid', isVipVerified);
    ui.premiumBanner.classList.toggle('hidden', isVipVerified);
    if (isVipVerified) {
        setVipStatus(t('app.vip_ok'));
        ui.freeLeft.textContent = '';
        ui.chatInput.disabled = false; ui.chatSend.disabled = false;
        return;
    }
    if (ui.vipStatus.classList.contains('is-ok')) setVipStatus('');
    ui.freeLeft.textContent = tf('app.free_left', { n: msgsLeft });
    const canChat = msgsLeft > 0;
    ui.chatInput.disabled = !canChat; ui.chatSend.disabled = !canChat;
    ui.passwordInput.classList.toggle('is-exhausted', !canChat);
}

let chatBusy = false;
async function sendMessage() {
    const text = ui.chatInput.value.trim();
    if (!text || chatBusy) return;
    // Local counter is only a UX shortcut to avoid pointless requests —
    // the Worker enforces the real limit server-side regardless.
    if (!isVipVerified && usedMessages >= FREE_LIMIT) { addMessage(t('errors.chat_expired'), 'bot-msg'); return; }

    addMessage(text, 'user-msg');
    ui.chatInput.value = '';
    chatBusy = true;
    ui.chatSend.disabled = true;

    const history = chatTurns.slice(-CHAT_HISTORY_TURNS);
    const loadingDiv = addMessage(t('quiz.thinking'), 'bot-msg is-loading');
    try {
        const res = await fetch(`${WORKER_URL}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Client-Id': clientId,
                'X-Vip-Code': isVipVerified ? vipCode : ''
            },
            body: JSON.stringify({ message: text, history })
        });
        loadingDiv.classList.remove('is-loading');
        if (res.status === 403) {
            loadingDiv.innerText = t('errors.chat_expired');
            usedMessages = Math.max(usedMessages, FREE_LIMIT); saveUserData();
            return;
        }
        if (res.status === 429) { loadingDiv.innerText = t('errors.chat_rate_limited'); return; }
        if (!res.ok) throw new Error('API unavailable');
        const data = await res.json();
        const reply = stripMarkdown(data.reply);
        loadingDiv.innerText = reply;
        chatTurns.push(
            { role: 'user', content: text.slice(0, CHAT_TURN_MAX_CHARS) },
            { role: 'assistant', content: String(reply || '').slice(0, CHAT_TURN_MAX_CHARS) }
        );
        // Only counted on a successful reply — the Worker mirrors this same
        // rule server-side, so a timeout/502/invalid request never costs the
        // user one of their free messages on either side.
        if (!isVipVerified) { usedMessages++; saveUserData(); }
    } catch {
        loadingDiv.classList.remove('is-loading');
        loadingDiv.innerText = t('errors.chat_unavailable');
    } finally {
        chatBusy = false;
        updateChatStatus();
        ui.chatHistory.scrollTop = ui.chatHistory.scrollHeight;
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
