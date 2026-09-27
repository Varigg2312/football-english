/* =========================================
   i18n.js — Internationalisation module
   TRANSLATIONS below is the single source of truth — inlined (not fetched
   from separate JSON files) so translations are available offline and
   before the first paint. Also loaded by offline.html, pro-unlocked.html
   and reset-password.html.
   Placeholders like {n} are filled in by app.js via tf().
   ========================================= */
(function () {
    const TRANSLATIONS = {
        en: {
            landing: {
                badge: "ENGLISH FOR FOOTBALL FANS",
                title: "Don't just watch football.<br>Speak it.",
                subtitle: "Train with <strong>AI</strong>, tactics lessons &amp; Voice Recognition.<br>The ultimate tactical academy.",
                feature_video_title: "Tactics Lessons",
                feature_video_desc: "From Rookie to World Class.",
                feature_voice_title: "Voice Coach",
                feature_voice_desc: "Speak, don't type.",
                feature_streak_title: "Daily Streak",
                feature_streak_desc: "Keep the streak alive.",
                enter_btn: "ENTER STADIUM",
                disclaimer: "*Progress saved on this device. Sign in to keep it across devices."
            },
            hud: {
                rank_label: "RANK",
                streak_label: "STREAK",
                xp_label: "XP",
                xp_progress_label: "Progress to next rank",
                login_btn: "Login",
                logout_suffix: "Exit"
            },
            levels: {
                Rookie: "Rookie",
                Academy: "Academy",
                Pro: "Pro",
                "World Class": "World Class",
                Legend: "Legend"
            },
            app: {
                skip_link: "Skip to content",
                training_badge: "TRAINING GROUND",
                app_title: "What are we learning today?",
                search_placeholder: "Search 'VAR', 'Penalty'...",
                search_label: "Search lessons",
                search_go: "GO",
                sections_label: "Sections",
                tab_lessons: "Lessons",
                tab_vocab: "Vocabulary",
                catalog_title: "Training programme",
                loading_lessons: "Loading lessons...",
                lessons_done: "{done}/{total} completed",
                lesson_meta: "{q} questions · {v} words",
                lesson_done_label: "Completed",
                lesson_video_label: "Includes video",
                vocab_view_title: "Vocabulary bank",
                vocab_count: "{n} words",
                vocab_filter_placeholder: "Filter words...",
                vocab_from: "From: {lesson}",
                pronounce: "Pronounce \"{term}\"",
                back_to_lessons: "All lessons",
                premium_title: "🚀 Go Pro Career",
                premium_desc: "Unlock unlimited chat with the AI coach.",
                premium_cta: "Get PRO (5€)",
                video_header: "Video Analysis",
                concept_header: "Core Concept",
                vocab_header: "Vocabulary",
                quiz_header: "The Decision",
                mic_hint: "Tap & Speak the Answer",
                mic_label: "Answer with your voice",
                footer: "© 2026 Football English Academy • Built for Winners",
                privacy_link: "Privacy Policy & Your Rights",
                terms_link: "Terms & Conditions",
                coach_btn: "Talk to Coach",
                coach_title: "The Gaffer (AI Tutor)",
                coach_welcome: "Alright lad? I'm an AI coach, here 24/7. Ask me anything about football English — you've got some free messages, and PRO unlocks unlimited chat.",
                password_placeholder: "🔒 PRO access code (optional)",
                password_label: "PRO access code",
                chat_placeholder: "Ask a question...",
                chat_label: "Chat message",
                send_label: "Send message",
                close_label: "Close",
                maximize_label: "Maximize",
                restore_label: "Restore",
                free_left: "{n} free messages left.",
                vip_ok: "✓ PRO active: unlimited chat.",
                vip_invalid: "That code isn't valid.",
                vip_device_limit: "This code is already active on 3 devices.",
                vip_rate_limited: "Too many attempts. Try again in an hour.",
                premium_hint: '*PRO only. <a href="https://buy.stripe.com/00w5kEccv9ur6r3eMl9R600" target="_blank" rel="noopener">Get your key here</a>.',
                locker_room: "Locker Room",
                auth_title_signin: "Sign In",
                auth_title_register: "Create Account",
                auth_subtitle: "Access your career stats.",
                auth_google_btn: "Continue with Google",
                auth_or: "or",
                auth_email_placeholder: "Email",
                auth_pass_placeholder: "Password",
                auth_submit_signin: "Sign In",
                auth_submit_register: "Register",
                auth_toggle_register: "Need an account? <strong>Register</strong>",
                auth_toggle_signin: "Have an account? <strong>Sign In</strong>",
                auth_forgot_link: "Forgot your password?",
                auth_back_to_signin: "Back to Sign In",
                auth_title_forgot: "Reset Password",
                auth_subtitle_forgot: "We'll email you a link to choose a new password.",
                auth_submit_forgot: "Send Reset Link",
                auth_forgot_sent: "If that email is registered, check your inbox for a reset link.",
                offline_msg: "You're offline. Check your connection to keep training."
            },
            errors: {
                fill_fields: "Fill all fields.",
                user_exists: "An account with that email already exists!",
                invalid_email: "Enter a valid email address.",
                weak_password: "Password must be at least 8 characters.",
                invalid_credentials: "Invalid email or password.",
                too_many_attempts: "Too many attempts. Wait 10 minutes and try again.",
                password_mismatch: "Passwords don't match.",
                no_matches: "No matches found...",
                load_error: "Couldn't load the lessons. Check your connection and try again.",
                lesson_not_found: "That lesson doesn't exist (any more). Pick one from the list.",
                chat_expired: "🚨 You've used all your free messages. Get PRO to keep chatting with the coach.",
                chat_rate_limited: "Too many messages from this network today. Try again tomorrow.",
                chat_unavailable: "❌ Instructor unavailable. Connection failed.",
                auth_generic: "Something went wrong. Please try again.",
                google_failed: "Google sign-in didn't complete. Please try again.",
                google_email_taken: "An account with this email already exists. Sign in with your password instead."
            },
            resetpw: {
                title: "Reset Your Password",
                subtitle: "Choose a new password for your account.",
                new_password_placeholder: "New password",
                confirm_password_placeholder: "Confirm new password",
                submit: "Reset Password",
                success_title: "Password Updated!",
                success_msg: "You can now sign in with your new password.",
                invalid_title: "Link Expired or Invalid",
                invalid_msg: "This password reset link is no longer valid. Request a new one from the sign-in screen.",
                back_home: "Back to the Academy"
            },
            offline: {
                title: "You're Offside.",
                msg: "No internet connection detected. Check your network and try again — The Gaffer is waiting.",
                retry: "Retry Connection"
            },
            pro: {
                pending_title: "Confirming your payment...",
                pending_msg: "This usually takes a couple of seconds.",
                success_title: "PRO Unlocked!",
                success_msg: "Your access code (save it if you want to use it on another device):",
                continue: "Continue to the Academy",
                error_title: "Still processing...",
                error_msg: "Your payment went through, but confirmation is taking longer than usual. Reload this page in a minute — if it still doesn't work, contact support with your payment email.",
                back_home: "Back to the Academy"
            },
            quiz: {
                scenario_label: "Match Scenario",
                next_btn: "Next Play",
                finish_btn: "🏁 FINISH MATCH",
                results_header: "Match Results",
                completed: "Session Completed!",
                score: "You got {n}/{total} right.",
                xp_gain: "+{xp} XP 🎯",
                completion_bonus: "+{xp} XP",
                replay_note: "Replay mode: XP is only awarded the first time you complete a lesson.",
                next_lesson: "Next lesson",
                thinking: "The Gaffer is thinking..."
            }
        },
        es: {
            landing: {
                badge: "INGLÉS PARA FUTBOLEROS",
                title: "No solo veas el fútbol.<br>Habla de él.",
                subtitle: "Entrena con <strong>IA</strong>, lecciones tácticas y Reconocimiento de Voz.<br>La academia táctica definitiva.",
                feature_video_title: "Lecciones Tácticas",
                feature_video_desc: "De Novato a Clase Mundial.",
                feature_voice_title: "Voice Coach",
                feature_voice_desc: "Habla, no escribas.",
                feature_streak_title: "Racha Diaria",
                feature_streak_desc: "Mantén la racha.",
                enter_btn: "ENTRAR AL ESTADIO",
                disclaimer: "*Progreso guardado en este dispositivo. Inicia sesión para conservarlo en todos tus dispositivos."
            },
            hud: {
                rank_label: "RANGO",
                streak_label: "RACHA",
                xp_label: "XP",
                xp_progress_label: "Progreso hacia el siguiente rango",
                login_btn: "Iniciar Sesión",
                logout_suffix: "Salir"
            },
            levels: {
                Rookie: "Novato",
                Academy: "Cantera",
                Pro: "Pro",
                "World Class": "Clase Mundial",
                Legend: "Leyenda"
            },
            app: {
                skip_link: "Saltar al contenido",
                training_badge: "CAMPO DE ENTRENAMIENTO",
                app_title: "¿Qué aprendemos hoy?",
                search_placeholder: "Busca 'VAR', 'Penalty'...",
                search_label: "Buscar lecciones",
                search_go: "IR",
                sections_label: "Secciones",
                tab_lessons: "Lecciones",
                tab_vocab: "Vocabulario",
                catalog_title: "Plan de entrenamiento",
                loading_lessons: "Cargando lecciones...",
                lessons_done: "{done}/{total} completadas",
                lesson_meta: "{q} preguntas · {v} palabras",
                lesson_done_label: "Completada",
                lesson_video_label: "Incluye vídeo",
                vocab_view_title: "Banco de vocabulario",
                vocab_count: "{n} palabras",
                vocab_filter_placeholder: "Filtrar palabras...",
                vocab_from: "De: {lesson}",
                pronounce: "Pronunciar \"{term}\"",
                back_to_lessons: "Todas las lecciones",
                premium_title: "🚀 Carrera Pro",
                premium_desc: "Desbloquea el chat ilimitado con el entrenador IA.",
                premium_cta: "Hazte PRO (5€)",
                video_header: "Análisis de Vídeo",
                concept_header: "Concepto Central",
                vocab_header: "Vocabulario",
                quiz_header: "La Decisión",
                mic_hint: "Pulsa y di la respuesta",
                mic_label: "Responder con la voz",
                footer: "© 2026 Football English Academy • Hecho para Campeones",
                privacy_link: "Política de Privacidad y Tus Derechos",
                terms_link: "Términos y Condiciones",
                coach_btn: "Hablar con el Míster",
                coach_title: "El Míster (Tutor IA)",
                coach_welcome: "¿Qué pasa, crack? Soy un entrenador de IA, estoy 24/7. Pregúntame lo que quieras sobre inglés futbolero (en inglés) — tienes algunos mensajes gratis y con PRO el chat es ilimitado.",
                password_placeholder: "🔒 Código de acceso PRO (opcional)",
                password_label: "Código de acceso PRO",
                chat_placeholder: "Haz una pregunta (en inglés)...",
                chat_label: "Mensaje del chat",
                send_label: "Enviar mensaje",
                close_label: "Cerrar",
                maximize_label: "Maximizar",
                restore_label: "Restaurar",
                free_left: "Te quedan {n} mensajes gratis.",
                vip_ok: "✓ PRO activo: chat ilimitado.",
                vip_invalid: "Ese código no es válido.",
                vip_device_limit: "Este código ya está activo en 3 dispositivos.",
                vip_rate_limited: "Demasiados intentos. Vuelve a probar en una hora.",
                premium_hint: '*Solo PRO. <a href="https://buy.stripe.com/00w5kEccv9ur6r3eMl9R600" target="_blank" rel="noopener">Consigue tu clave aquí</a>.',
                locker_room: "Vestuario",
                auth_title_signin: "Iniciar Sesión",
                auth_title_register: "Crear Cuenta",
                auth_subtitle: "Accede a tus estadísticas de carrera.",
                auth_google_btn: "Continuar con Google",
                auth_or: "o",
                auth_email_placeholder: "Email",
                auth_pass_placeholder: "Contraseña",
                auth_submit_signin: "Entrar",
                auth_submit_register: "Registrarme",
                auth_toggle_register: "¿Sin cuenta? <strong>Regístrate</strong>",
                auth_toggle_signin: "¿Ya tienes cuenta? <strong>Entra</strong>",
                auth_forgot_link: "¿Olvidaste tu contraseña?",
                auth_back_to_signin: "Volver a Iniciar Sesión",
                auth_title_forgot: "Restablecer Contraseña",
                auth_subtitle_forgot: "Te enviaremos un enlace para elegir una nueva contraseña.",
                auth_submit_forgot: "Enviar Enlace",
                auth_forgot_sent: "Si ese email está registrado, revisa tu bandeja de entrada para el enlace de restablecimiento.",
                offline_msg: "Sin conexión. Revisa tu red para seguir entrenando."
            },
            errors: {
                fill_fields: "Rellena todos los campos.",
                user_exists: "¡Ya existe una cuenta con ese email!",
                invalid_email: "Introduce un email válido.",
                weak_password: "La contraseña debe tener al menos 8 caracteres.",
                invalid_credentials: "Email o contraseña incorrectos.",
                too_many_attempts: "Demasiados intentos. Espera 10 minutos y vuelve a probar.",
                password_mismatch: "Las contraseñas no coinciden.",
                no_matches: "Sin resultados...",
                load_error: "No se pudieron cargar las lecciones. Revisa tu conexión y vuelve a intentarlo.",
                lesson_not_found: "Esa lección no existe (o ya no). Elige una de la lista.",
                chat_expired: "🚨 Has gastado tus mensajes gratis. Hazte PRO para seguir hablando con el Míster.",
                chat_rate_limited: "Demasiados mensajes desde esta red hoy. Vuelve a probar mañana.",
                chat_unavailable: "❌ Míster no disponible. Fallo de conexión.",
                auth_generic: "Algo ha fallado. Inténtalo de nuevo.",
                google_failed: "No se pudo completar el inicio de sesión con Google. Inténtalo de nuevo.",
                google_email_taken: "Ya existe una cuenta con este email. Entra con tu contraseña."
            },
            resetpw: {
                title: "Restablecer tu Contraseña",
                subtitle: "Elige una nueva contraseña para tu cuenta.",
                new_password_placeholder: "Nueva contraseña",
                confirm_password_placeholder: "Confirma la nueva contraseña",
                submit: "Restablecer Contraseña",
                success_title: "¡Contraseña Actualizada!",
                success_msg: "Ya puedes iniciar sesión con tu nueva contraseña.",
                invalid_title: "Enlace Caducado o Inválido",
                invalid_msg: "Este enlace de restablecimiento ya no es válido. Solicita uno nuevo desde la pantalla de inicio de sesión.",
                back_home: "Volver a la Academia"
            },
            offline: {
                title: "Estás en fuera de juego.",
                msg: "No hay conexión a internet. Revisa tu red y vuelve a intentarlo — el Míster te espera.",
                retry: "Reintentar"
            },
            pro: {
                pending_title: "Confirmando tu pago...",
                pending_msg: "Normalmente tarda un par de segundos.",
                success_title: "¡PRO Desbloqueado!",
                success_msg: "Tu código de acceso (guárdalo si quieres usarlo en otro dispositivo):",
                continue: "Continuar a la Academia",
                error_title: "Aún procesando...",
                error_msg: "Tu pago se ha realizado, pero la confirmación está tardando más de lo normal. Recarga esta página en un minuto; si sigue sin funcionar, contacta con soporte indicando el email del pago.",
                back_home: "Volver a la Academia"
            },
            quiz: {
                scenario_label: "Escenario",
                next_btn: "Siguiente Jugada",
                finish_btn: "🏁 FIN DEL PARTIDO",
                results_header: "Resultados del Partido",
                completed: "¡Sesión Completada!",
                score: "Has acertado {n}/{total}.",
                xp_gain: "+{xp} XP 🎯",
                completion_bonus: "+{xp} XP",
                replay_note: "Modo repaso: el XP solo se gana la primera vez que completas una lección.",
                next_lesson: "Siguiente lección",
                thinking: "El Míster está pensando..."
            }
        }
    };

    // Default to English unless the user picked a language explicitly.
    // Not browser-auto-detected on purpose: the TWA (Android app) and the
    // web site use separate storage partitions, so relying on
    // navigator.language let the two disagree with each other depending
    // on how each context reports the device locale.
    let currentLang = 'en';
    try { currentLang = localStorage.getItem('app_lang') || 'en'; } catch (e) {}
    if (!TRANSLATIONS[currentLang]) currentLang = 'en';

    function lookup(lang, parts) {
        let val = TRANSLATIONS[lang];
        for (const p of parts) { val = val?.[p]; }
        return val;
    }

    function t(key) {
        const parts = key.split('.');
        const val = lookup(currentLang, parts);
        if (val !== undefined) return val;
        return lookup('en', parts) ?? key; // English fallback
    }

    // t() plus {placeholder} substitution.
    function tf(key, vars) {
        return String(t(key)).replace(/\{(\w+)\}/g, (m, name) => (vars && name in vars ? vars[name] : m));
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
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            el.setAttribute('aria-label', t(el.dataset.i18nAria));
        });
        document.documentElement.lang = currentLang;
    }

    function setLang(lang) {
        if (!TRANSLATIONS[lang]) return;
        currentLang = lang;
        try { localStorage.setItem('app_lang', lang); } catch (e) {}
        applyTranslations();
        const sel = document.getElementById('lang-selector');
        if (sel) sel.value = lang;
        // Notify app.js so it can re-render dynamic strings
        if (typeof window.onLangChange === 'function') window.onLangChange();
    }

    // Expose API globally — available synchronously before DOM ready
    window.t = t;
    window.tf = tf;
    window.setLang = setLang;
    window.getCurrentLang = () => currentLang;

    function init() {
        applyTranslations();
        const sel = document.getElementById('lang-selector');
        if (sel) {
            sel.value = currentLang;
            sel.addEventListener('change', e => setLang(e.target.value));
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
