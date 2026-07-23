import { getSessionUser } from '../../_lib/session.js';
import { toPublicUser, getCompletedLessons } from '../../_lib/db.js';
import { json } from '../../_lib/http.js';

// Always 200 — {loggedIn:false} instead of 401, so the client's startup
// check doesn't need special-case error handling for the "not logged in yet"
// case (which is the common case on first visit).
export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(env.DB, request);
  if (!user) return json({ loggedIn: false });
  const completedLessons = await getCompletedLessons(env.DB, user.id);
  return json({ loggedIn: true, user: toPublicUser(user, completedLessons) });
}
