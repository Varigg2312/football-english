// Kept as an external file (not inline) on purpose: the site's CSP
// (script-src 'self', no 'unsafe-inline'/nonce) silently blocks inline
// <script> blocks — see privacy.js for the incident that taught us this.

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

// ── Withdrawal/refund request → pre-filled mailto ────────
function wireRequestForm(suffix) {
    const btn = document.getElementById('submit-req' + suffix);
    if (!btn) return;
    btn.addEventListener('click', () => {
        const name = document.getElementById('req-name' + suffix).value.trim();
        const email = document.getElementById('req-email' + suffix).value.trim();
        const orderDate = document.getElementById('req-order' + suffix).value.trim();
        if (!name || !email) {
            alert(suffix === '-es' ? 'Por favor, rellena tu nombre y email.' : 'Please fill in your name and email.');
            return;
        }
        const subject = suffix === '-es'
            ? `[Desistimiento/Devolución PRO] ${name}`
            : `[PRO Withdrawal/Refund Request] ${name}`;
        const body = suffix === '-es'
            ? `Nombre: ${name}\nEmail de la compra: ${email}\nFecha aproximada de compra: ${orderDate || '(no indicada)'}\n\nSolicito el desistimiento de mi compra PRO y la devolución del importe, conforme a la Sección 8 de los Términos y Condiciones.`
            : `Name: ${name}\nPurchase email: ${email}\nApproximate purchase date: ${orderDate || '(not provided)'}\n\nI am requesting withdrawal from my PRO purchase and a full refund, per Section 8 of the Terms & Conditions.`;
        window.location.href = `mailto:alvaroggcasarabonela@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
}
wireRequestForm('-en');
wireRequestForm('-es');
