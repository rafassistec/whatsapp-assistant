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

  CREATE TABLE IF NOT EXISTS chat_state (
    jid TEXT PRIMARY KEY,
    bot_active INTEGER NOT NULL DEFAULT 1,
    paused_at INTEGER
  );
`);

const insertMsg = db.prepare(
  `INSERT INTO messages (chat_jid, role, content, created_at) VALUES (?, ?, ?, ?)`
);

const recentMsg = db.prepare(
  `SELECT role, content FROM messages WHERE chat_jid = ? ORDER BY created_at DESC LIMIT ?`
);

const upsertState = db.prepare(`
  INSERT INTO chat_state (jid, bot_active, paused_at) VALUES (?, ?, ?)
  ON CONFLICT(jid) DO UPDATE SET
    bot_active = excluded.bot_active,
    paused_at  = excluded.paused_at
`);

const getState = db.prepare(`SELECT bot_active FROM chat_state WHERE jid = ?`);
const getPaused = db.prepare(`SELECT jid FROM chat_state WHERE bot_active = 0`);

export function addMessage(chatJid, role, content) {
  insertMsg.run(chatJid, role, content, Date.now());
}

export function getRecentMessages(chatJid, limit) {
  return recentMsg.all(chatJid, limit).reverse();
}

export function isBotActive(jid) {
  const row = getState.get(jid);
  return row ? row.bot_active === 1 : true;
}

export function setBotActive(jid, active) {
  upsertState.run(jid, active ? 1 : 0, active ? null : Date.now());
}

export function getPausedChats() {
  return getPaused.all().map((r) => r.jid);
}
