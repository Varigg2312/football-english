import { destroySession, clearSessionCookieHeader } from '../../_lib/session.js';

export async function onRequestPost({ request, env }) {
  await destroySession(env.DB, request);
  return new Response(null, { status: 204, headers: { 'Set-Cookie': clearSessionCookieHeader() } });
}
