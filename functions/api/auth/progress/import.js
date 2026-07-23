import { getSessionUser } from '../../../_lib/session.js';
import { getCompletedLessons, setCompletedLessons } from '../../../_lib/db.js';
import { json, parseJsonBody } from '../../../_lib/http.js';

// One-time import of pre-account localStorage progress (see app.js). Guarded
// server-side by legacy_imported_at, not just a client-side flag, so it
// can't be replayed to farm free XP.
export async function onRequestPost({ request, env }) {
  const user = await getSessionUser(env.DB, request);
  if (!user) return json({ error: 'not_authenticated' }, 401);

  if (user.legacy_imported_at) {
    const completedLessons = await getCompletedLessons(env.DB, user.id);
    return json({ alreadyImported: true, xp: user.xp, msgs: user.msgs, streak: user.streak, completedLessons });
  }

  const body = await parseJsonBody(request);
  if (!body) return json({ error: 'invalid_body' }, 400);

  const importedXp = Number.isFinite(body.xp) ? Math.max(0, Math.floor(body.xp)) : 0;
  const importedMsgs = Number.isFinite(body.msgs) ? Math.max(0, Math.floor(body.msgs)) : 0;
  const importedStreak = Number.isFinite(body.streak) ? Math.max(0, Math.floor(body.streak)) : 0;
  const importedLessons = Array.isArray(body.completedLessons)
    ? body.completedLessons.filter((id) => typeof id === 'string').slice(0, 1000)
    : [];

  const xp = Math.max(user.xp, importedXp);
  const msgs = Math.max(user.msgs, importedMsgs);
  const streak = Math.max(user.streak, importedStreak);

  const existingLessons = await getCompletedLessons(env.DB, user.id);
  const mergedLessons = [...new Set([...existingLessons, ...importedLessons])];

  await env.DB.prepare("UPDATE users SET xp = ?, msgs = ?, streak = ?, legacy_imported_at = datetime('now') WHERE id = ?")
    .bind(xp, msgs, streak, user.id)
    .run();
  await setCompletedLessons(env.DB, user.id, mergedLessons);

  return json({ xp, msgs, streak, completedLessons: mergedLessons });
}
