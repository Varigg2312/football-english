/* =========================================
   i18n.js — Internationalisation module
   TRANSLATIONS below is the single source of truth — inlined (not fetched
   from separate JSON files) so translations are available offline and
   before the first paint.
   ========================================= */
(function () {
    const TRANSLATIONS = {
        en: {
            landing: {
                badge: "OFFICIAL ACADEMY 2026",
                title: "Don't just watch football.<br>Speak it.",
                subtitle: "Train with <strong>AI</strong>, Video Analysis &amp; Voice Recognition.<br>The ultimate tactical academy.",
                feature_video_title: "Video Match",
                feature_video_desc: "Real match play analysis.",
                feature_voice_title: "Voice Coach",
                feature_voice_desc: "Speak, don't type.",
                feature_streak_title: "Daily Streak",
                feature_streak_desc: "Keep the streak alive.",
                enter_btn: "ENTER STADIUM",
                disclaimer: "*Progress auto-saved in your browser."
            },
            hud: {
                rank_label: "RANK",
                streak_label: "STREAK",
                xp_label: "XP",
                login_btn: "Login",
                logout_suffix: "Exit"
            },
            app: {
                training_badge: "TRAINING GROUND",
                app_title: "What are we learning today?",
                search_placeholder: "Search 'VAR', 'Penalty'...",
                lesson_default_title: "Select a match...",
                lesson_default_intro: "Use the search bar to start a training session.",
                premium_title: "🚀 Go Pro Career",
                premium_desc: "Unlock the AI Tutor and Advanced Certifications.",
                premium_cta: "Get PRO (5€)",
                video_header: "Video Analysis",
                concept_header: "Core Concept",
                vocab_header: "Vocabulary",
                quiz_header: "The Decision",
                mic_hint: "Tap & Speak the Answer",
                footer: "© 2026 Football English Academy • Built for Winners",
                coach_btn: "Talk to Coach",
                coach_title: "The Gaffer (AI Tutor)",
                coach_welcome: "Alright lad? I'm here 24/7. Unlock PRO access to chat properly.",
                password_placeholder: "🔒 Enter VIP Password...",
                chat_placeholder: "Ask a question...",
                premium_hint: '*PRO only. <a href="https://buy.stripe.com/00w5kEccv9ur6r3eMl9R600" target="_blank">Get your key here</a>.',
                locker_room: "Locker Room",
                auth_title_signin: "Sign In",
                auth_title_register: "Create Account",
                auth_subtitle: "Access your career stats.",
                auth_user_placeholder: "Username",
                auth_pass_placeholder: "Password",
                auth_submit_signin: "Sign In",
                auth_submit_register: "Register",
                auth_toggle_register: "Need an account? <strong>Register</strong>",
                auth_toggle_signin: "Have an account? <strong>Sign In</strong>",
                offline_msg: "You're offline. Check your connection to keep training."
            },
            errors: {
                fill_fields: "Fill all fields.",
                user_exists: "Username already taken!",
                invalid_credentials: "Invalid credentials.",
                no_matches: "No matches found...",
                load_error: "Error loading the tactical document.",
                chat_expired: "🚨 Trial ended! Your free access has expired.",
                chat_unavailable: "❌ Instructor unavailable. Connection failed."
            },
            quiz: {
                scenario_label: "Match Scenario",
                next_btn: "Next Play",
                finish_btn: "🏁 FINISH MATCH",
                results_header: "Match Results",
                completed: "Session Completed!",
                xp_gain: "+20 XP 🎯",
                completion_bonus: "+{xp} XP",
                thinking: "The Gaffer is thinking..."
            }
        },
        es: {
            landing: {
                badge: "ACADEMIA OFICIAL 2026",
                title: "No solo veas el fútbol.<br>Habla de él.",
                subtitle: "Entrena con <strong>IA</strong>, Análisis de Vídeo y Reconocimiento de Voz.<br>La academia táctica definitiva.",
                feature_video_title: "Video Match",
                feature_video_desc: "Análisis de jugadas reales.",
                feature_voice_title: "Voice Coach",
                feature_voice_desc: "Habla, no escribas.",
                feature_streak_title: "Racha Diaria",
                feature_streak_desc: "Mantén la racha.",
                enter_btn: "ENTRAR AL ESTADIO",
                disclaimer: "*Progreso guardado automáticamente en tu navegador."
            },
            hud: {
                rank_label: "RANGO",
                streak_label: "RACHA",
                xp_label: "XP",
                login_btn: "Iniciar Sesión",
                logout_suffix: "Salir"
            },
            app: {
                training_badge: "CAMPO DE ENTRENAMIENTO",
                app_title: "¿Qué aprendemos hoy?",
                search_placeholder: "Busca 'VAR', 'Penalti'...",
                lesson_default_title: "Selecciona una lección...",
                lesson_default_intro: "Usa el buscador para iniciar una sesión de entrenamiento.",
                premium_title: "🚀 Carrera Pro",
                premium_desc: "Desbloquea el Tutor IA y Certificaciones Avanzadas.",
                premium_cta: "Hazte PRO (5€)",
                video_header: "Análisis de Vídeo",
                concept_header: "Concepto Central",
                vocab_header: "Vocabulario",
                quiz_header: "La Decisión",
                mic_hint: "Pulsa y di la respuesta",
                footer: "© 2026 Football English Academy • Hecho para Campeones",
                coach_btn: "Hablar con el Míster",
                coach_title: "El Míster (Tutor IA)",
                coach_welcome: "¿Qué pasa, crack? Estoy 24/7. Desbloquea el acceso PRO para hablar conmigo.",
                password_placeholder: "🔒 Introduce contraseña VIP...",
                chat_placeholder: "Haz una pregunta...",
                premium_hint: '*Solo PRO. <a href="https://buy.stripe.com/00w5kEccv9ur6r3eMl9R600" target="_blank">Consigue tu clave aquí</a>.',
                locker_room: "Vestuario",
                auth_title_signin: "Iniciar Sesión",
                auth_title_register: "Crear Cuenta",
                auth_subtitle: "Accede a tus estadísticas de carrera.",
                auth_user_placeholder: "Usuario",
                auth_pass_placeholder: "Contraseña",
                auth_submit_signin: "Entrar",
                auth_submit_register: "Registrarme",
                auth_toggle_register: "¿Sin cuenta? <strong>Regístrate</strong>",
                auth_toggle_signin: "¿Ya tienes cuenta? <strong>Entra</strong>",
                offline_msg: "Sin conexión. Revisa tu red para seguir entrenando."
            },
            errors: {
                fill_fields: "Rellena todos los campos.",
                user_exists: "¡Ese usuario ya existe!",
                invalid_credentials: "Credenciales incorrectas.",
                no_matches: "Sin resultados...",
                load_error: "Error al cargar el documento táctico.",
                chat_expired: "🚨 ¡Prueba agotada! Tu acceso gratuito ha expirado.",
                chat_unavailable: "❌ Míster no disponible. Fallo de conexión."
            },
            quiz: {
                scenario_label: "Escenario",
                next_btn: "Siguiente Jugada",
                finish_btn: "🏁 FIN DEL PARTIDO",
                results_header: "Resultados del Partido",
                completed: "¡Sesión Completada!",
                xp_gain: "+20 XP 🎯",
                completion_bonus: "+{xp} XP",
                thinking: "El Míster está pensando..."
            }
        }
    };

    // Default to English unless the user picked a language explicitly.
    // Not browser-auto-detected on purpose: the TWA (Android app) and the
    // web site use separate storage partitions, so relying on
    // navigator.language let the two disagree with each other depending
    // on how each context reports the device locale.
    let currentLang = localStorage.getItem('app_lang') || 'en';
    if (!TRANSLATIONS[currentLang]) currentLang = 'en';

    function t(key) {
        const parts = key.split('.');
        let val = TRANSLATIONS[currentLang];
        for (const p of parts) { val = val?.[p]; }
        if (val !== undefined) return val;
        // English fallback
        val = TRANSLATIONS['en'];
        for (const p of parts) { val = val?.[p]; }
        return val ?? key;
    }

    function applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = t(el.dataset.i18n);
        });
        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            el.innerHTML = t(el.dataset.i18nHtml);
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = t(el.dataset.i18nPlaceholder);
        });
        document.documentElement.lang = currentLang;
    }

    function setLang(lang) {
        if (!TRANSLATIONS[lang]) return;
        currentLang = lang;
        localStorage.setItem('app_lang', lang);
        applyTranslations();
        const sel = document.getElementById('lang-selector');
        if (sel) sel.value = lang;
        // Notify app.js so it can re-render dynamic strings
        if (typeof window.onLangChange === 'function') window.onLangChange();
    }

    // Expose API globally — available synchronously before DOM ready
    window.t = t;
    window.setLang = setLang;
    window.getCurrentLang = () => currentLang;

    document.addEventListener('DOMContentLoaded', () => {
        applyTranslations();
        const sel = document.getElementById('lang-selector');
        if (sel) {
            sel.value = currentLang;
            sel.addEventListener('change', e => setLang(e.target.value));
        }
    });
})();
