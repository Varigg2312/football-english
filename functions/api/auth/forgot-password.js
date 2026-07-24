import { generateToken, sha256Hex } from '../../_lib/crypto.js';
import { findUserByEmail } from '../../_lib/db.js';
import { sendEmail } from '../../_lib/email.js';
import { json, parseJsonBody } from '../../_lib/http.js';

const RESET_TTL_SECONDS = 60 * 60; // 1 hour

export async function onRequestPost({ request, env }) {
  const body = await parseJsonBody(request);
  if (!body) return json({ error: 'invalid_body' }, 400);

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email) return json({ error: 'invalid_email' }, 400);

  // Always return the same generic response whether or not the email is
  // registered, and swallow send failures too — the response must not be an
  // oracle for account existence. Google-only accounts (no password_hash)
  // have nothing to reset, so they're silently skipped as well.
  const user = await findUserByEmail(env.DB, email);
  if (user && user.password_hash) {
    const token = generateToken();
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + RESET_TTL_SECONDS * 1000).toISOString();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM password_resets WHERE user_id = ?').bind(user.id),
      env.DB
        .prepare('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
        .bind(tokenHash, user.id, expiresAt),
    ]);

    const resetUrl = `${new URL(request.url).origin}/reset-password.html?token=${token}`;
    try {
      await sendEmail(env, {
        to: email,
        subject: 'Reset your Football English Academy password',
        html: `<p>Someone requested a password reset for this account.</p><p><a href="${resetUrl}">Click here to choose a new password</a>. This link expires in 1 hour.</p><p>If you didn't request this, you can safely ignore this email.</p>`,
      });
    } catch {
      // Don't leak the failure to the client — see comment above.
    }
  }

  return json({ ok: true });
}
