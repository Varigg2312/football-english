import { hashPassword } from '../../_lib/crypto.js';
import { findUserByEmail, createUser, toPublicUser } from '../../_lib/db.js';
import { createSession, sessionCookieHeader } from '../../_lib/session.js';
import { json, parseJsonBody } from '../../_lib/http.js';
import { isRateLimited, recordFailedAttempt } from '../../_lib/rateLimit.js';

export async function onRequestPost({ request, env }) {
  const body = await parseJsonBody(request);
  if (!body) return json({ error: 'invalid_body' }, 400);

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'invalid_email' }, 400);
  if (password.length < 8) return json({ error: 'weak_password' }, 400);
  if (password.length > 256) return json({ error: 'weak_password' }, 400);

  // Por IP, no por email: en un abuso de creación masiva de cuentas cada
  // intento usa un email distinto, así que limitar por email no serviría de nada.
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipKey = `register:ip:${ip}`;
  if (await isRateLimited(env.DB, ipKey)) {
    return json({ error: 'too_many_attempts' }, 429);
  }
  await recordFailedAttempt(env.DB, ipKey);

  const existing = await findUserByEmail(env.DB, email);
  if (existing) return json({ error: 'email_exists' }, 409);

  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = await createUser(env.DB, { email, passwordHash, displayName: email.split('@')[0] });
  } catch (e) {
    // Dos registros concurrentes con el mismo email pueden pasar ambos el
    // check de arriba antes de que ninguno haya insertado (TOCTOU) — el
    // segundo INSERT viola UNIQUE(email); lo tratamos igual que el caso ya
    // detectado, no como un 500.
    if (String(e?.message || '').includes('UNIQUE constraint failed')) {
      return json({ error: 'email_exists' }, 409);
    }
    throw e;
  }

  const { token } = await createSession(env.DB, user.id);

  return json({ user: toPublicUser(user, []) }, 201, { 'Set-Cookie': sessionCookieHeader(token) });
}
