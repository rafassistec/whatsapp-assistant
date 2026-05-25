import { fetch } from 'undici';

const baseUrl = process.env.EVOLUTION_API_URL;
const apiKey = process.env.EVOLUTION_API_KEY;
const instance = process.env.EVOLUTION_INSTANCE_NAME;

function headers() {
  return { 'Content-Type': 'application/json', apikey: apiKey };
}

export async function sendText(remoteJid, text) {
  const res = await fetch(`${baseUrl}/message/sendText/${instance}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ number: remoteJid, text }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`evolution sendText failed: ${res.status} ${body}`);
  }
  return res.json();
}

export async function downloadMediaBase64(message) {
  const res = await fetch(`${baseUrl}/chat/getBase64FromMediaMessage/${instance}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ message: { key: message.key }, convertToMp4: false }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`evolution download media failed: ${res.status} ${body}`);
  }
  return res.json();
}
