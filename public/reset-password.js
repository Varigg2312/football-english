// External file on purpose: the site's CSP (script-src 'self', no
// 'unsafe-inline'/nonce) silently blocks inline <script> blocks.
const token = new URLSearchParams(window.location.search).get('token');

const formState = document.getElementById('form-state');
const successState = document.getElementById('success-state');
const invalidState = document.getElementById('invalid-state');
const formMsg = document.getElementById('form-msg');
const submitBtn = document.getElementById('submit-btn');
const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');

function showState(state) {
    [formState, successState, invalidState].forEach((el) => el.classList.add('hidden'));
    state.classList.remove('hidden');
}

if (!token) {
    showState(invalidState);
} else {
    submitBtn.addEventListener('click', async () => {
        const password = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (password.length < 8) {
            formMsg.textContent = window.t('errors.weak_password');
            return;
        }
        if (password !== confirmPassword) {
            formMsg.textContent = window.t('errors.password_mismatch');
            return;
        }

        submitBtn.disabled = true;
        formMsg.textContent = '';
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                if (data.error === 'invalid_token') {
                    showState(invalidState);
                } else {
                    formMsg.textContent = window.t('errors.auth_generic');
                    submitBtn.disabled = false;
                }
                return;
            }
            showState(successState);
        } catch {
            formMsg.textContent = window.t('errors.auth_generic');
            submitBtn.disabled = false;
        }
    });
}
