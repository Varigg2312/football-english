import { generateToken } from '../../../_lib/crypto.js';
import { json } from '../../../_lib/http.js';

export async function onRequestGet({ request, env }) {
  if (!env.GOOGLE_CLIENT_ID) return json({ error: 'google_oauth_not_configured' }, 500);

  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const state = generateToken();

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      // Lax (not Strict) is required here — the browser returns to the
      // callback via a top-level navigation initiated by accounts.google.com,
      // which is a cross-site navigation that a Strict cookie wouldn't
      // survive, breaking the CSRF check on every login.
      'Set-Cookie': `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/api/auth/google; Max-Age=600`,
    },
  });
}
