import { getSessionUser } from '../../_lib/session.js';
import { getCompletedLessons, setCompletedLessons } from '../../_lib/db.js';
import { json, parseJsonBody } from '../../_lib/http.js';

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(env.DB, request);
  if (!user) return json({ error: 'not_authenticated' }, 401);
  const completedLessons = await getCompletedLessons(env.DB, user.id);
  return json({ xp: user.xp, msgs: user.msgs, streak: user.streak, completedLessons });
}

export async function onRequestPost({ request, env }) {
  const user = await getSessionUser(env.DB, request);
  if (!user) return json({ error: 'not_authenticated' }, 401);

  const body = await parseJsonBody(request);
  if (!body) return json({ error: 'invalid_body' }, 400);

  // xp/msgs solo deberían crecer en uso normal (lecciones completadas,
  // mensajes enviados) — igual que progress/import.js, no se acepta que un
  // sync baje lo que ya había, en vez de fiarse sin más del valor enviado.
  // streak es distinto a propósito: romper la racha diaria reinicia a 0
  // legítimamente, así que aquí sí se acepta el valor que envíe el cliente.
  const xp = Number.isFinite(body.xp) ? Math.max(user.xp, Math.max(0, Math.floor(body.xp))) : user.xp;
  const msgs = Number.isFinite(body.msgs) ? Math.max(user.msgs, Math.max(0, Math.floor(body.msgs))) : user.msgs;
  const streak = Number.isFinite(body.streak) ? Math.max(0, Math.floor(body.streak)) : user.streak;
  const completedLessons = Array.isArray(body.completedLessons)
    ? body.completedLessons.filter((id) => typeof id === 'string').slice(0, 1000)
    : null;

  await env.DB.prepare("UPDATE users SET xp = ?, msgs = ?, streak = ?, last_visit = datetime('now') WHERE id = ?")
    .bind(xp, msgs, streak, user.id)
    .run();
  if (completedLessons) await setCompletedLessons(env.DB, user.id, completedLessons);

  return json({ ok: true });
}
