CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT,        -- format: pbkdf2$<iterations>$<saltB64>$<hashB64>; NULL if Google-only account
  google_id TEXT UNIQUE,     -- NULL if email/password-only account
  display_name TEXT,
  avatar_url TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  msgs INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  last_visit TEXT,
  legacy_imported_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE completed_lessons (
  user_id INTEGER NOT NULL REFERENCES users(id),
  lesson_id TEXT NOT NULL,
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
