import { getSessionUser, clearSessionCookieHeader } from '../../_lib/session.js';
import { json } from '../../_lib/http.js';

// Self-service erasure (GDPR/LOPDGDD "right to be forgotten"), triggered
// from the "Delete my account" button on privacy.html. Removes every row
// tied to the user across all three tables, not just the account row —
// sessions and completed_lessons would otherwise be orphaned.
export async function onRequestPost({ request, env }) {
  const user = await getSessionUser(env.DB, request);
  if (!user) return json({ error: 'not_authenticated' }, 401);

  await env.DB.batch([
    env.DB.prepare('DELETE FROM completed_lessons WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
  ]);

  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookieHeader() });
}
