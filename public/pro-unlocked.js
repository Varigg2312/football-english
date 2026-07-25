// External file on purpose: the site's CSP (script-src 'self', no
// 'unsafe-inline'/nonce) silently blocks inline <script> blocks — this was
// previously inline here and never actually ran in production.

// Also hardcoded in app.js — keep both in sync if this ever changes.
const WORKER_URL = 'https://football-gaffer-api.alvaroggcasarabonela.workers.dev';
const params = new URLSearchParams(window.location.search);
const sessionId = params.get('session_id');

async function tryRedeem() {
    const res = await fetch(`${WORKER_URL}/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
    });
    if (res.status === 202) return null; // webhook not landed yet
    if (!res.ok) throw new Error('redeem failed');
    const data = await res.json();
    return data.code || null;
}

async function poll() {
    if (!sessionId) {
        document.getElementById('pending-state').classList.add('hidden');
        document.getElementById('error-state').classList.remove('hidden');
        return;
    }
    const maxAttempts = 8;
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const code = await tryRedeem();
            if (code) {
                localStorage.setItem('user_is_vip_code', code);
                document.getElementById('code-display').textContent = code;
                document.getElementById('pending-state').classList.add('hidden');
                document.getElementById('success-state').classList.remove('hidden');
                return;
            }
        } catch (e) { /* keep retrying */ }
        await new Promise(r => setTimeout(r, 1500));
    }
    document.getElementById('pending-state').classList.add('hidden');
    document.getElementById('error-state').classList.remove('hidden');
}

poll();
