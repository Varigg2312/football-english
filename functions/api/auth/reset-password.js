import { hashPassword, sha256Hex } from '../../_lib/crypto.js';
import { json, parseJsonBody } from '../../_lib/http.js';

export async function onRequestPost({ request, env }) {
  const body = await parseJsonBody(request);
  if (!body) return json({ error: 'invalid_body' }, 400);

  const token = typeof body.token === 'string' ? body.token : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!token) return json({ error: 'invalid_token' }, 400);
  if (password.length < 8) return json({ error: 'weak_password' }, 400);
  if (password.length > 256) return json({ error: 'weak_password' }, 400);

  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT user_id FROM password_resets WHERE token_hash = ?1 AND expires_at > datetime('now')`
  )
    .bind(tokenHash)
    .first();
  if (!row) return json({ error: 'invalid_token' }, 400);

  const passwordHash = await hashPassword(password);
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(passwordHash, row.user_id),
    env.DB.prepare('DELETE FROM password_resets WHERE user_id = ?').bind(row.user_id),
    // Resetting the password invalidates any existing sessions too, in case
    // the reset was prompted by a compromised account.
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(row.user_id),
  ]);

  return json({ ok: true });
}
