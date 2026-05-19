import { fetch } from 'undici';

const baseUrl = process.env.EVOLUTION_API_URL;
const apiKey = process.env.EVOLUTION_API_KEY;
const instance = process.env.EVOLUTION_INSTANCE_NAME;

export async function sendText(remoteJid, text) {
  const url = `${baseUrl}/message/sendText/${instance}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
    },
    body: JSON.stringify({
      number: remoteJid,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`evolution sendText failed: ${res.status} ${body}`);
  }

  return res.json();
}
