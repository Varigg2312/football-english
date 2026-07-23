import { hashPassword } from '../../_lib/crypto.js';
import { findUserByEmail, createUser, toPublicUser } from '../../_lib/db.js';
import { createSession, sessionCookieHeader } from '../../_lib/session.js';
import { json, parseJsonBody } from '../../_lib/http.js';

export async function onRequestPost({ request, env }) {
  const body = await parseJsonBody(request);
  if (!body) return json({ error: 'invalid_body' }, 400);

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !email.includes('@')) return json({ error: 'invalid_email' }, 400);
  if (password.length < 8) return json({ error: 'weak_password' }, 400);

  const existing = await findUserByEmail(env.DB, email);
  if (existing) return json({ error: 'email_exists' }, 409);

  const passwordHash = await hashPassword(password);
  const user = await createUser(env.DB, { email, passwordHash, displayName: email.split('@')[0] });
  const { token } = await createSession(env.DB, user.id);

  return json({ user: toPublicUser(user, []) }, 201, { 'Set-Cookie': sessionCookieHeader(token) });
}
