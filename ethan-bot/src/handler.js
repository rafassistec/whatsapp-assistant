import { askClaude, askAssistant } from './claude.js';
import { sendText, downloadMediaBase64 } from './evolution.js';
import { addMessage, getRecentMessages, isBotActive, setBotActive, getPausedChats } from './db.js';
import { transcribeAudio } from './whisper.js';

const sentMessageIds = new Set();
const SENT_ID_TTL_MS = 5 * 60 * 1000;

// Keywords that immediately trigger human takeover without going through Claude
const TAKEOVER_KEYWORDS =
  /\b(humano|atendente|pessoa\s+real|falar\s+com\s+(algu[eé]m|voc[eê]s?)|quero\s+(um\s+)?(humano|atendente)|n[ãa]o\s+quero\s+bot|chama\s+(algu[eé]m|atendente)|fala\s+com\s+algu[eé]m)\b/i;

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

function isBotSelf(phone) {
  const botPhone = process.env.BOT_PHONE;
  if (!botPhone) return false;
  return phone.replace(/\D/g, '') === botPhone.replace(/\D/g, '');
}

function ownerJid() {
  const digits = normalizeBrPhone(process.env.OWNER_PHONE);
  return `${digits}@s.whatsapp.net`;
}

function extractMessageContent(msg) {
  const m = msg.message || {};
  if (m.conversation) return { kind: 'text', text: m.conversation };
  if (m.extendedTextMessage?.text) return { kind: 'text', text: m.extendedTextMessage.text };
  if (m.imageMessage) {
    return { kind: 'image', mimeType: m.imageMessage.mimetype || 'image/jpeg', caption: m.imageMessage.caption || '' };
  }
  if (m.audioMessage) {
    return { kind: 'audio', mimeType: m.audioMessage.mimetype || 'audio/ogg', seconds: m.audioMessage.seconds || null };
  }
  return { kind: 'unsupported' };
}

async function handleOwnerCommand(text, ownerJidStr) {
  const trimmed = text.trim();

  if (trimmed === '#status') {
    const paused = getPausedChats();
    const msg = paused.length
      ? `⏸️ Chats com bot pausado:\n${paused.map((j) => j.split('@')[0]).join('\n')}`
      : '✅ Nenhum chat pausado. Bot ativo em todos.';
    await sendText(ownerJidStr, msg);
    return true;
  }

  const onMatch = trimmed.match(/^#on\s+(\d+)/);
  if (onMatch) {
    const phone = normalizeBrPhone(onMatch[1]);
    const jid = `${phone}@s.whatsapp.net`;
    setBotActive(jid, true);
    await sendText(ownerJidStr, `✅ Bot reativado para ${phone}`);
    return true;
  }

  const offMatch = trimmed.match(/^#off\s+(\d+)/);
  if (offMatch) {
    const phone = normalizeBrPhone(offMatch[1]);
    const jid = `${phone}@s.whatsapp.net`;
    setBotActive(jid, false);
    await sendText(ownerJidStr, `✅ Bot pausado para ${phone}`);
    return true;
  }

  return false;
}

export async function handleIncomingMessage(event) {
  const msg = event?.data;
  if (!msg) return;

  const remoteJid = msg.key?.remoteJid;
  if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid.endsWith('@lid')) return;

  const phone = remoteJid.split('@')[0];
  const fromMe = msg.key?.fromMe === true;
  const isSelfChat = fromMe && isBotSelf(phone); // owner messaging the bot's own number
  const messageId = msg.key?.id;

  if (fromMe && messageId && sentMessageIds.has(messageId)) {
    console.log(`[skip] loop protection: own reply ${messageId}`);
    return;
  }

  // Self-chat: owner messaging the bot's own number → personal assistant mode
  if (isSelfChat) {
    const content = extractMessageContent(msg);
    if (content.kind === 'unsupported') return;

    if (content.kind === 'text') {
      const handled = await handleOwnerCommand(content.text, remoteJid);
      if (handled) return;
    }

    const history = getRecentMessages(remoteJid, Number(process.env.MEMORY_WINDOW || 40));
    let userContent = content.kind === 'text' ? content.text : null;
    let hasImage = false;

    if (content.kind === 'image') {
      const media = await downloadMediaBase64(msg);
      const base64 = media.base64 || media;
      if (!base64) return;
      userContent = [
        { type: 'image', source: { type: 'base64', media_type: content.mimeType, data: base64 } },
        { type: 'text', text: content.caption || 'O que tem nessa imagem?' },
      ];
      hasImage = true;
    } else if (content.kind === 'audio') {
      const media = await downloadMediaBase64(msg);
      const base64 = media.base64 || media;
      if (!base64) return;
      try {
        userContent = await transcribeAudio(base64, content.mimeType);
      } catch { return; }
    }

    const memText = typeof userContent === 'string' ? userContent : '[mídia]';
    addMessage(remoteJid, 'user', memText);
    console.log(`[self] assistente: ${memText.slice(0, 80)}`);

    const { reply } = await askAssistant(history, userContent, { hasImage });
    addMessage(remoteJid, 'assistant', reply);
    const result = await sendText(remoteJid, reply);
    trackSentId(result?.key?.id);
    console.log(`[self-out] ${reply.slice(0, 80)}`);
    return;
  }

  // Skip outgoing messages to customers (owner is replying manually)
  if (fromMe) {
    console.log(`[skip] outgoing to ${phone}`);
    return;
  }

  // Skip if bot is paused for this chat
  if (!isBotActive(remoteJid)) {
    console.log(`[skip] bot paused for ${phone}`);
    return;
  }

  const content = extractMessageContent(msg);

  if (content.kind === 'unsupported') {
    console.log(`[skip] unsupported type from ${phone}`);
    return;
  }

  const memoryWindow = Number(process.env.MEMORY_WINDOW || 40);
  const history = getRecentMessages(remoteJid, memoryWindow);

  let userMessageForClaude;
  let userMessageForMemory;
  let hasImage = false;

  if (content.kind === 'text') {
    // Fast-path keyword detection — trigger takeover without calling Claude
    if (TAKEOVER_KEYWORDS.test(content.text)) {
      console.log(`[takeover] keyword detected from ${phone}`);
      addMessage(remoteJid, 'user', content.text);
      setBotActive(remoteJid, false);
      const farewell = 'Claro! Vou chamar um atendente humano para você. Aguarde um instante! 🙏';
      const result = await sendText(remoteJid, farewell);
      trackSentId(result?.key?.id);
      addMessage(remoteJid, 'assistant', farewell);
      await sendText(ownerJid(), `⚠️ *Atendimento humano solicitado*\nCliente: ${phone}\nMensagem: "${content.text}"\n\nBot pausado. Use *#on ${phone}* para reativar.`);
      return;
    }

    userMessageForClaude = content.text;
    userMessageForMemory = content.text;
    console.log(`[in] ${phone} [${history.length} ctx]: ${content.text}`);
  } else if (content.kind === 'image') {
    console.log(`[in] ${phone} [${history.length} ctx]: <imagem>${content.caption ? ' ' + content.caption : ''}`);
    const media = await downloadMediaBase64(msg);
    const base64 = media.base64 || media;
    if (!base64 || typeof base64 !== 'string') {
      await sendText(remoteJid, '(não consegui baixar a imagem, tenta de novo?)');
      return;
    }
    const promptText = content.caption?.trim() || 'O que tem nessa imagem?';
    userMessageForClaude = [
      { type: 'image', source: { type: 'base64', media_type: content.mimeType, data: base64 } },
      { type: 'text', text: promptText },
    ];
    userMessageForMemory = `[imagem]${content.caption ? ' ' + content.caption : ''}`;
    hasImage = true;
  } else if (content.kind === 'audio') {
    const dur = content.seconds ? ` ${content.seconds}s` : '';
    console.log(`[in] ${phone} [${history.length} ctx]: <audio${dur}>`);
    const media = await downloadMediaBase64(msg);
    const base64 = media.base64 || media;
    if (!base64 || typeof base64 !== 'string') {
      await sendText(remoteJid, '(não consegui baixar o áudio)');
      return;
    }
    let transcription;
    try {
      transcription = await transcribeAudio(base64, content.mimeType);
    } catch (err) {
      await sendText(remoteJid, `(falhei ao transcrever o áudio: ${err.message.slice(0, 100)})`);
      return;
    }
    if (!transcription) {
      await sendText(remoteJid, '(o áudio veio vazio ou inaudível)');
      return;
    }
    console.log(`[transcribed] ${transcription.slice(0, 100)}`);
    userMessageForClaude = transcription;
    userMessageForMemory = `[áudio${dur}] ${transcription}`;
  }

  addMessage(remoteJid, 'user', userMessageForMemory);

  const { reply, takeover, takeoverReason } = await askClaude(history, userMessageForClaude, { hasImage });

  addMessage(remoteJid, 'assistant', reply);
  const result = await sendText(remoteJid, reply);
  trackSentId(result?.key?.id);
  console.log(`[out] ${phone}: ${reply.slice(0, 100)}${reply.length > 100 ? '…' : ''}`);

  if (takeover) {
    setBotActive(remoteJid, false);
    await sendText(
      ownerJid(),
      `⚠️ *Atendimento humano solicitado*\nCliente: ${phone}\nMotivo: ${takeoverReason || 'detectado pelo bot'}\n\nBot pausado. Use *#on ${phone}* para reativar.`
    );
    console.log(`[takeover] bot paused for ${phone}: ${takeoverReason}`);
  }
}
