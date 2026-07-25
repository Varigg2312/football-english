const WINDOW_SECONDS = 10 * 60; // 10 minutes
const MAX_ATTEMPTS = 8;
const OFFSET = `-${WINDOW_SECONDS} seconds`;

export async function isRateLimited(db, key) {
  const row = await db
    .prepare(`SELECT attempts FROM login_attempts WHERE key = ? AND window_start > datetime('now', ?)`)
    .bind(key, OFFSET)
    .first();
  return !!row && row.attempts >= MAX_ATTEMPTS;
}

export async function recordFailedAttempt(db, key) {
  await db
    .prepare(
      `INSERT INTO login_attempts (key, attempts, window_start) VALUES (?, 1, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET
         attempts = CASE WHEN window_start > datetime('now', ?) THEN attempts + 1 ELSE 1 END,
         window_start = CASE WHEN window_start > datetime('now', ?) THEN window_start ELSE datetime('now') END`
    )
    .bind(key, OFFSET, OFFSET)
    .run();
  // Opportunistic sweep so this table doesn't grow unbounded — mirrors the
  // expired-token cleanup pattern already used for password_resets.
  await db.prepare(`DELETE FROM login_attempts WHERE window_start <= datetime('now', '-1 day')`).run();
}

export async function clearAttempts(db, key) {
  await db.prepare('DELETE FROM login_attempts WHERE key = ?').bind(key).run();
}
