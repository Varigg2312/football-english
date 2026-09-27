import { getSessionUser } from '../../_lib/session.js';
import { json, parseJsonBody } from '../../_lib/http.js';

// Same shape the Worker issues in randomCode(): "PRO-" + 10 hex chars.
const PRO_CODE_RE = /^PRO-[0-9A-F]{10}$/;

// Stores the PRO access code the signed-in user has on this device, so any
// other device they sign in on gets it back (see app.js restoreProFromAccount).
// This is only a convenience copy: whether the code is valid — and on how
// many devices — is still decided by the chat Worker on every request, so
// saving an arbitrary well-formed string here unlocks nothing by itself.
export async function onRequestPost({ request, env }) {
  const user = await getSessionUser(env.DB, request);
  if (!user) return json({ error: 'not_authenticated' }, 401);

  const body = await parseJsonBody(request);
  const code = body && typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!PRO_CODE_RE.test(code)) return json({ error: 'invalid_code' }, 400);

  await env.DB.prepare('UPDATE users SET pro_code = ? WHERE id = ?').bind(code, user.id).run();
  return json({ ok: true });
}
