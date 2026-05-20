import { google } from 'googleapis';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { saveGoogleTokens, loadGoogleTokens } from './db.js';

const credsPath = resolve(process.cwd(), './google-credentials.json');
const credsRaw = JSON.parse(readFileSync(credsPath, 'utf-8'));
const creds = credsRaw.web || credsRaw.installed;

if (!creds) {
  throw new Error('google-credentials.json: expected key "web" or "installed"');
}

export const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];

const OWNER_USER_ID = 'owner';

function makeClient() {
  return new google.auth.OAuth2(
    creds.client_id,
    creds.client_secret,
    creds.redirect_uris[0]
  );
}

export function getAuthUrl() {
  const client = makeClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: OWNER_USER_ID,
  });
}

export async function exchangeCodeForTokens(code) {
  const client = makeClient();
  const { tokens } = await client.getToken(code);
  saveGoogleTokens(OWNER_USER_ID, tokens);
  return tokens;
}

export function getAuthClient() {
  const stored = loadGoogleTokens(OWNER_USER_ID);
  if (!stored) return null;

  const client = makeClient();
  client.setCredentials(stored);

  client.on('tokens', (newTokens) => {
    const merged = { ...stored, ...newTokens };
    saveGoogleTokens(OWNER_USER_ID, merged);
  });

  return client;
}

export function isAuthorized() {
  return loadGoogleTokens(OWNER_USER_ID) !== null;
}
