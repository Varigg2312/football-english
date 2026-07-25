// Kept as an external file (not inline) on purpose: the site's CSP
// (script-src 'self', no 'unsafe-inline'/nonce) silently blocks inline
// <script> blocks. An earlier version of this had the code inline here and
// it silently never ran in production for that exact reason.

// ── Language toggle ──────────────────────────────────────
const enBlock = document.getElementById('content-en');
const esBlock = document.getElementById('content-es');
function showLang(lang) {
    if (lang === 'es') { enBlock.classList.add('hidden'); esBlock.classList.remove('hidden'); document.documentElement.lang = 'es'; }
    else { esBlock.classList.add('hidden'); enBlock.classList.remove('hidden'); document.documentElement.lang = 'en'; }
    [document.getElementById('btn-en'), document.getElementById('btn-en-2')].forEach(b => b && b.classList.toggle('active', lang === 'en'));
    [document.getElementById('btn-es'), document.getElementById('btn-es-2')].forEach(b => b && b.classList.toggle('active', lang === 'es'));
}
document.getElementById('btn-en').onclick = () => showLang('en');
document.getElementById('btn-en-2').onclick = () => showLang('en');
document.getElementById('btn-es').onclick = () => showLang('es');
document.getElementById('btn-es-2').onclick = () => showLang('es');
// Default to whichever language the main app was last set to, if known.
try {
    const saved = localStorage.getItem('app_lang');
    if (saved === 'es') showLang('es');
} catch (e) {}

// ── Rights-request form → pre-filled mailto ──────────────
function wireRequestForm(suffix) {
    const btn = document.getElementById('submit-req' + suffix);
    if (!btn) return;
    btn.addEventListener('click', () => {
        const name = document.getElementById('req-name' + suffix).value.trim();
        const email = document.getElementById('req-email' + suffix).value.trim();
        const type = document.getElementById('req-type' + suffix).value;
        const msg = document.getElementById('req-msg' + suffix).value.trim();
        if (!name || !email || !msg) {
            alert(suffix === '-es' ? 'Por favor, rellena todos los campos.' : 'Please fill in all fields.');
            return;
        }
        const subject = `[GDPR/RGPD - ${type}] ${name}`;
        const body = suffix === '-es'
            ? `Nombre: ${name}\nEmail de contacto: ${email}\nDerecho solicitado: ${type}\n\nMensaje:\n${msg}`
            : `Name: ${name}\nContact email: ${email}\nRight requested: ${type}\n\nMessage:\n${msg}`;
        window.location.href = `mailto:alvaroggcasarabonela@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
}
wireRequestForm('-en');
wireRequestForm('-es');

// ── One-click account deletion ───────────────────────────
function wireDeleteButton(btnId, statusId, lang) {
    const btn = document.getElementById(btnId);
    const status = document.getElementById(statusId);
    if (!btn) return;
    btn.addEventListener('click', async () => {
        const confirmMsg = lang === 'es'
            ? 'Esto eliminará tu cuenta y todos tus datos de forma permanente e irreversible. ¿Estás seguro?'
            : 'This will permanently and irreversibly delete your account and all your data. Are you sure?';
        if (!confirm(confirmMsg)) return;
        btn.disabled = true;
        status.style.color = '';
        status.textContent = lang === 'es' ? 'Eliminando cuenta...' : 'Deleting your account...';
        try {
            const res = await fetch('/api/auth/delete', { method: 'POST', credentials: 'include' });
            if (res.status === 401) {
                status.style.color = '#dc2626';
                status.textContent = lang === 'es'
                    ? 'No has iniciado sesión en este dispositivo, así que no hay nada que eliminar aquí. Escríbenos si necesitas ayuda.'
                    : "You're not signed in on this device, so there's nothing to delete here. Email us if you need help.";
                btn.disabled = false;
                return;
            }
            if (!res.ok) throw new Error('failed');
            status.style.color = '#16a34a';
            status.textContent = lang === 'es'
                ? '✓ Tu cuenta y tus datos se han eliminado. Redirigiendo...'
                : '✓ Your account and data have been deleted. Redirecting...';
            setTimeout(() => { window.location.href = '/'; }, 2500);
        } catch (e) {
            status.style.color = '#dc2626';
            status.textContent = lang === 'es'
                ? 'Algo ha fallado. Por favor, inténtalo de nuevo o escríbenos directamente.'
                : 'Something went wrong. Please try again or email us directly.';
            btn.disabled = false;
        }
    });
}
wireDeleteButton('delete-account-btn', 'delete-status', 'en');
wireDeleteButton('delete-account-btn-es', 'delete-status-es', 'es');
