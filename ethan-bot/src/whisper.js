import { fetch, FormData } from 'undici';

const ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';

function pickExt(mimeType) {
  if (!mimeType) return 'ogg';
  const m = mimeType.toLowerCase();
  if (m.includes('mp3') || m.includes('mpeg')) return 'mp3';
  if (m.includes('m4a') || m.includes('mp4')) return 'm4a';
  if (m.includes('wav')) return 'wav';
  if (m.includes('webm')) return 'webm';
  return 'ogg';
}

export async function transcribeAudio(base64Data, mimeType = 'audio/ogg') {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY ausente no .env');

  const buffer = Buffer.from(base64Data, 'base64');
  const ext = pickExt(mimeType);

  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimeType }), `audio.${ext}`);
  form.append('model', 'whisper-1');
  form.append('language', 'pt');
  form.append('response_format', 'text');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Whisper falhou: ${res.status} ${body.slice(0, 300)}`);
  }

  return (await res.text()).trim();
}
