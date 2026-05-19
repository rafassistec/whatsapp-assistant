import { askClaude } from './claude.js';
import { sendText } from './evolution.js';
import { addMessage, getRecentMessages } from './db.js';

const sentMessageIds = new Set();
const SENT_ID_TTL_MS = 5 * 60 * 1000;

function trackSentId(id) {
  if (!id) return;
  sentMessageIds.add(id);
  setTimeout(() => sentMessageIds.delete(id), SENT_ID_TTL_MS);
}

function normalizeBrPhone(phone) {
  if (!phone) return phone;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    const ddd = digits.slice(2, 4);
    const last8 = digits.slice(-8);
    return `55${ddd}${last8}`;
  }
  return digits;
}

function isOwner(phone) {
  return normalizeBrPhone(phone) === normalizeBrPhone(process.env.OWNER_PHONE);
}

export async function handleIncomingMessage(event) {
  const msg = event?.data;
  if (!msg) return;

  const remoteJid = msg.key?.remoteJid;
  if (!remoteJid || remoteJid.endsWith('@g.us')) return;
  if (remoteJid.endsWith('@lid')) return;

  const phone = remoteJid.split('@')[0];
  const fromMe = msg.key?.fromMe === true;
  const isSelfChat = isOwner(phone);
  const messageId = msg.key?.id;

  if (fromMe && messageId && sentMessageIds.has(messageId)) {
    console.log(`[skip] loop protection: own reply ${messageId}`);
    return;
  }

  if (fromMe && !isSelfChat) {
    console.log(`[skip] outgoing to ${phone}`);
    return;
  }

  if (process.env.ONLY_OWNER === 'true' && !isSelfChat) {
    console.log(`[skip] non-owner chat: ${phone}`);
    return;
  }

  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    null;

  if (!text) {
    console.log(`[skip] non-text from ${phone}`);
    return;
  }

  if (fromMe && /^\[(clawdbot|claudbot)\]/i.test(text)) {
    console.log(`[skip] other-bot reply detected`);
    return;
  }

  const memoryWindow = Number(process.env.MEMORY_WINDOW || 30);
  const history = getRecentMessages(remoteJid, memoryWindow);

  console.log(`[in] ${phone}${fromMe ? ' (self)' : ''} [${history.length} msgs ctx]: ${text}`);

  addMessage(remoteJid, 'user', text);

  const reply = await askClaude(history, text);

  addMessage(remoteJid, 'assistant', reply);

  const result = await sendText(remoteJid, reply);
  trackSentId(result?.key?.id);

  console.log(`[out] ${phone}: ${reply.slice(0, 100)}${reply.length > 100 ? '…' : ''}`);
}
