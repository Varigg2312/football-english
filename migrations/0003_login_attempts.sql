CREATE TABLE login_attempts (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 1,
  window_start TEXT NOT NULL DEFAULT (datetime('now'))
);
