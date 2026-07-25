import { verifyPassword } from '../../_lib/crypto.js';
import { findUserByEmail, toPublicUser, getCompletedLessons } from '../../_lib/db.js';
import { createSession, sessionCookieHeader } from '../../_lib/session.js';
import { json, parseJsonBody } from '../../_lib/http.js';
import { isRateLimited, recordFailedAttempt, clearAttempts } from '../../_lib/rateLimit.js';

export async function onRequestPost({ request, env }) {
  const body = await parseJsonBody(request);
  if (!body) return json({ error: 'invalid_body' }, 400);

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const emailKey = `email:${email || 'unknown'}`;
  const ipKey = `ip:${ip}`;

  // Locks by account AND by source IP — stops both credential stuffing
  // against one account and horizontal brute force across many accounts
  // from the same attacker.
  if ((await isRateLimited(env.DB, emailKey)) || (await isRateLimited(env.DB, ipKey))) {
    return json({ error: 'too_many_attempts' }, 429);
  }

  const user = email ? await findUserByEmail(env.DB, email) : null;
  // Generic error either way — don't leak whether the email exists.
  if (!user || !user.password_hash || !(await verifyPassword(password, user.password_hash))) {
    await Promise.all([recordFailedAttempt(env.DB, emailKey), recordFailedAttempt(env.DB, ipKey)]);
    return json({ error: 'invalid_credentials' }, 401);
  }

  await clearAttempts(env.DB, emailKey);
  const { token } = await createSession(env.DB, user.id);
  const completedLessons = await getCompletedLessons(env.DB, user.id);
  return json({ user: toPublicUser(user, completedLessons) }, 200, { 'Set-Cookie': sessionCookieHeader(token) });
}
