import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const dbPath = resolve(process.cwd(), process.env.DB_PATH || './data/memory.db');
mkdirSync(dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec(`PRAGMA journal_mode = WAL`);

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_jid TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_messages_chat_time
    ON messages (chat_jid, created_at);

  CREATE TABLE IF NOT EXISTS google_tokens (
    user_id TEXT PRIMARY KEY,
    tokens_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

const insertStmt = db.prepare(
  `INSERT INTO messages (chat_jid, role, content, created_at) VALUES (?, ?, ?, ?)`
);

const recentStmt = db.prepare(
  `SELECT role, content FROM messages
   WHERE chat_jid = ?
   ORDER BY created_at DESC
   LIMIT ?`
);

export function addMessage(chatJid, role, content) {
  insertStmt.run(chatJid, role, content, Date.now());
}

export function getRecentMessages(chatJid, limit) {
  const rows = recentStmt.all(chatJid, limit);
  return rows.reverse();
}

const upsertTokensStmt = db.prepare(
  `INSERT INTO google_tokens (user_id, tokens_json, updated_at)
   VALUES (?, ?, ?)
   ON CONFLICT(user_id) DO UPDATE SET
     tokens_json = excluded.tokens_json,
     updated_at = excluded.updated_at`
);

const getTokensStmt = db.prepare(
  `SELECT tokens_json FROM google_tokens WHERE user_id = ?`
);

export function saveGoogleTokens(userId, tokens) {
  upsertTokensStmt.run(userId, JSON.stringify(tokens), Date.now());
}

export function loadGoogleTokens(userId) {
  const row = getTokensStmt.get(userId);
  if (!row) return null;
  return JSON.parse(row.tokens_json);
}
