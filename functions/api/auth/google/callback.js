import {
  findUserByGoogleId,
  findUserByEmail,
  createUser,
  linkGoogleId,
} from '../../../_lib/db.js';
import { createSession, sessionCookieHeader, parseCookies } from '../../../_lib/session.js';

function redirect(location) {
  return new Response(null, { status: 302, headers: { Location: location } });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookies = parseCookies(request);

  if (!code || !state || !cookies.oauth_state || state !== cookies.oauth_state) {
    return redirect('/?auth_error=google_state_mismatch');
  }

  // Must match the redirect_uri sent to /google/start byte-for-byte, or
  // Google rejects the token exchange.
  const redirectUri = `${url.origin}/api/auth/google/callback`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });
  if (!tokenRes.ok) return redirect('/?auth_error=google_token_exchange_failed');
  const tokenData = await tokenRes.json();

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!profileRes.ok) return redirect('/?auth_error=google_profile_failed');
  const profile = await profileRes.json();

  const googleId = profile.sub;
  const email = typeof profile.email === 'string' ? profile.email.toLowerCase() : '';

  let user = await findUserByGoogleId(env.DB, googleId);
  if (!user && email && profile.email_verified) {
    // Only auto-link to an existing password account if Google has verified
    // this email — otherwise anyone could claim someone else's email with an
    // unverified Google account and take over their account.
    const existingByEmail = await findUserByEmail(env.DB, email);
    if (existingByEmail) {
      await linkGoogleId(env.DB, existingByEmail.id, googleId, profile.picture);
      user = await findUserByGoogleId(env.DB, googleId);
    }
  }
  if (!user) {
    user = await createUser(env.DB, {
      email: email || `google-${googleId}@no-email.football-english`,
      googleId,
      displayName: profile.name || (email ? email.split('@')[0] : 'Player'),
      avatarUrl: profile.picture,
    });
  }

  const { token } = await createSession(env.DB, user.id);
  const headers = new Headers({ Location: '/?login=success' });
  headers.append('Set-Cookie', sessionCookieHeader(token));
  headers.append('Set-Cookie', 'oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/api/auth/google; Max-Age=0');
  return new Response(null, { status: 302, headers });
}
