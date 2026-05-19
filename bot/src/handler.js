import { askClaude } from './claude.js';
import { sendText } from './evolution.js';

export async function handleIncomingMessage(event) {
  const msg = event?.data;
  if (!msg) return;

  if (msg.key?.fromMe) return;

  const remoteJid = msg.key?.remoteJid;
  if (!remoteJid || remoteJid.endsWith('@g.us')) return;

  const phone = remoteJid.split('@')[0];

  if (process.env.ONLY_OWNER === 'true' && phone !== process.env.OWNER_PHONE) {
    console.log(`[skip] message from non-owner: ${phone}`);
    return;
  }

  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    null;

  if (!text) {
    console.log(`[skip] non-text message from ${phone}`);
    return;
  }

  console.log(`[in] ${phone}: ${text}`);

  const reply = await askClaude(text);

  await sendText(remoteJid, reply);

  console.log(`[out] ${phone}: ${reply}`);
}
