import { generateToken, sha256Hex } from './crypto.js';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const COOKIE_NAME = 'session';

export function parseCookies(request) {
  const header = request.headers.get('Cookie') || '';
  const cookies = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) cookies[key] = decodeURIComponent(val);
  });
  return cookies;
}

export async function createSession(db, userId) {
  const token = generateToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  await db
    .prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(tokenHash, userId, expiresAt)
    .run();
  return { token, expiresAt };
}

export function sessionCookieHeader(token) {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearSessionCookieHeader() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

// D1 is immediately consistent (unlike the KV namespace the chat Worker
// uses), so there's no "logged out right after logging in" propagation
// window here.
export async function getSessionUser(db, request) {
  const cookies = parseCookies(request);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;

  // Opportunistic sweep of expired sessions — password_resets and
  // login_attempts already do this; sessions had no equivalent, so expired
  // rows (TTL 30 days) accumulated forever instead of actually being removed.
  await db.prepare(`DELETE FROM sessions WHERE expires_at <= datetime('now')`).run();

  const tokenHash = await sha256Hex(token);
  const row = await db
    .prepare(
      `SELECT users.* FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ?1 AND sessions.expires_at > datetime('now')`
    )
    .bind(tokenHash)
    .first();
  return row || null;
}

export async function destroySession(db, request) {
  const cookies = parseCookies(request);
  const token = cookies[COOKIE_NAME];
  if (!token) return;
  const tokenHash = await sha256Hex(token);
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
}
