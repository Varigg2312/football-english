export async function findUserByEmail(db, email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
}

export async function findUserByGoogleId(db, googleId) {
  return db.prepare('SELECT * FROM users WHERE google_id = ?').bind(googleId).first();
}

export async function findUserById(db, id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
}

export async function createUser(db, { email, passwordHash, googleId, displayName, avatarUrl }) {
  const res = await db
    .prepare(
      `INSERT INTO users (email, password_hash, google_id, display_name, avatar_url)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(email, passwordHash || null, googleId || null, displayName || null, avatarUrl || null)
    .run();
  return findUserById(db, res.meta.last_row_id);
}

export async function linkGoogleId(db, userId, googleId, avatarUrl) {
  await db
    .prepare('UPDATE users SET google_id = ?, avatar_url = COALESCE(?, avatar_url) WHERE id = ?')
    .bind(googleId, avatarUrl || null, userId)
    .run();
}

export async function getCompletedLessons(db, userId) {
  const { results } = await db
    .prepare('SELECT lesson_id FROM completed_lessons WHERE user_id = ?')
    .bind(userId)
    .all();
  return results.map((r) => r.lesson_id);
}

export async function setCompletedLessons(db, userId, lessonIds) {
  // Replace-all: simplest correct approach for a small per-user list, no
  // need for incremental diffing at this scale.
  await db.batch([
    db.prepare('DELETE FROM completed_lessons WHERE user_id = ?').bind(userId),
    ...lessonIds.map((id) =>
      db.prepare('INSERT INTO completed_lessons (user_id, lesson_id) VALUES (?, ?)').bind(userId, id)
    ),
  ]);
}

export function toPublicUser(row, completedLessons = []) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name || row.email.split('@')[0],
    avatarUrl: row.avatar_url || null,
    xp: row.xp,
    msgs: row.msgs,
    streak: row.streak,
    lastVisit: row.last_visit,
    completedLessons,
  };
}
