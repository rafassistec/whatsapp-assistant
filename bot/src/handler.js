import { askClaude } from './claude.js';
import { sendText, downloadMediaBase64 } from './evolution.js';
import { addMessage, getRecentMessages } from './db.js';
import { transcribeAudio } from './whisper.js';

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

function extractMessageContent(msg) {
  const m = msg.message || {};

  if (m.conversation) return { kind: 'text', text: m.conversation };
  if (m.extendedTextMessage?.text) return { kind: 'text', text: m.extendedTextMessage.text };

  if (m.imageMessage) {
    return {
      kind: 'image',
      mimeType: m.imageMessage.mimetype || 'image/jpeg',
      caption: m.imageMessage.caption || '',
    };
  }

  if (m.audioMessage) {
    return {
      kind: 'audio',
      mimeType: m.audioMessage.mimetype || 'audio/ogg',
      seconds: m.audioMessage.seconds || null,
    };
  }

  return { kind: 'unsupported' };
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

  const content = extractMessageContent(msg);

  if (content.kind === 'unsupported') {
    console.log(`[skip] unsupported message type from ${phone}`);
    return;
  }

  if (content.kind === 'text' && fromMe && /^\[(clawdbot|claudbot)\]/i.test(content.text)) {
    console.log(`[skip] other-bot reply detected`);
    return;
  }

  const memoryWindow = Number(process.env.MEMORY_WINDOW || 30);
  const history = getRecentMessages(remoteJid, memoryWindow);

  let userMessageForClaude;
  let userMessageForMemory;
  let hasImage = false;

  if (content.kind === 'text') {
    userMessageForClaude = content.text;
    userMessageForMemory = content.text;
    console.log(`[in] ${phone}${fromMe ? ' (self)' : ''} [${history.length} ctx]: ${content.text}`);
  } else if (content.kind === 'image') {
    console.log(`[in] ${phone}${fromMe ? ' (self)' : ''} [${history.length} ctx]: <imagem>${content.caption ? ' ' + content.caption : ''}`);

    const media = await downloadMediaBase64(msg);
    const base64 = media.base64 || media;
    if (!base64 || typeof base64 !== 'string') {
      console.log(`[error] could not download image`);
      await sendText(remoteJid, '(não consegui baixar a imagem, tenta de novo?)');
      return;
    }

    const promptText = content.caption?.trim() || 'O que tem nessa imagem? Responda de forma útil e objetiva.';

    userMessageForClaude = [
      { type: 'image', source: { type: 'base64', media_type: content.mimeType, data: base64 } },
      { type: 'text', text: promptText },
    ];

    userMessageForMemory = `[imagem]${content.caption ? ' ' + content.caption : ''}`;
    hasImage = true;
  } else if (content.kind === 'audio') {
    const dur = content.seconds ? ` ${content.seconds}s` : '';
    console.log(`[in] ${phone}${fromMe ? ' (self)' : ''} [${history.length} ctx]: <audio${dur}> baixando...`);

    const media = await downloadMediaBase64(msg);
    const base64 = media.base64 || media;
    if (!base64 || typeof base64 !== 'string') {
      console.log(`[error] could not download audio`);
      await sendText(remoteJid, '(não consegui baixar o áudio)');
      return;
    }

    let transcription;
    try {
      transcription = await transcribeAudio(base64, content.mimeType);
    } catch (err) {
      console.log(`[error] whisper: ${err.message}`);
      await sendText(remoteJid, `(falhei ao transcrever o áudio: ${err.message.slice(0, 100)})`);
      return;
    }

    if (!transcription) {
      await sendText(remoteJid, '(o áudio veio vazio ou inaudível)');
      return;
    }

    console.log(`[transcribed] ${transcription.slice(0, 100)}${transcription.length > 100 ? '…' : ''}`);

    userMessageForClaude = transcription;
    userMessageForMemory = `[áudio${dur}] ${transcription}`;
  }

  addMessage(remoteJid, 'user', userMessageForMemory);

  const reply = await askClaude(history, userMessageForClaude, { hasImage });

  addMessage(remoteJid, 'assistant', reply);

  const result = await sendText(remoteJid, reply);
  trackSentId(result?.key?.id);

  console.log(`[out] ${phone}: ${reply.slice(0, 100)}${reply.length > 100 ? '…' : ''}`);
}
