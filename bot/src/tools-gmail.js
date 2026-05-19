import { google } from 'googleapis';
import { getAuthClient } from './google-auth.js';

function gmail() {
  const auth = getAuthClient();
  if (!auth) throw new Error('Google não autorizado. Acesse http://localhost:3000/oauth/auth');
  return google.gmail({ version: 'v1', auth });
}

function decodeBase64Url(data) {
  if (!data) return '';
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

function extractBody(payload) {
  if (!payload) return '';

  if (payload.body?.data) return decodeBase64Url(payload.body.data);

  if (payload.parts) {
    for (const mime of ['text/plain', 'text/html']) {
      const part = payload.parts.find((p) => p.mimeType === mime);
      if (part?.body?.data) {
        const text = decodeBase64Url(part.body.data);
        return mime === 'text/html' ? text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : text;
      }
    }
    for (const sub of payload.parts) {
      const inner = extractBody(sub);
      if (inner) return inner;
    }
  }
  return '';
}

function header(headers, name) {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

export const gmailTools = [
  {
    name: 'list_recent_emails',
    description:
      'Lista emails recentes da caixa de entrada do Rafael. Use para responder "quais emails recebi hoje?", "tenho algum email do João?", "tem boleto vencendo?". Retorna apenas remetente/assunto/snippet — use read_email pra ver o conteúdo completo.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Query Gmail search (mesma sintaxe da busca do Gmail). Ex: "from:joao", "is:unread", "subject:boleto", "newer_than:1d". Vazio = todos.',
        },
        max_results: { type: 'number', description: 'Máximo de emails (default 10, máximo 30)' },
      },
    },
    handler: async ({ query = '', max_results = 10 }) => {
      const max = Math.min(max_results, 30);
      const list = await gmail().users.messages.list({
        userId: 'me',
        q: query,
        maxResults: max,
      });
      const messages = list.data.messages || [];

      const details = await Promise.all(
        messages.map((m) =>
          gmail().users.messages.get({
            userId: 'me',
            id: m.id,
            format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Date'],
          })
        )
      );

      return {
        count: details.length,
        emails: details.map((res) => {
          const d = res.data;
          return {
            id: d.id,
            from: header(d.payload?.headers, 'From'),
            subject: header(d.payload?.headers, 'Subject'),
            date: header(d.payload?.headers, 'Date'),
            snippet: d.snippet,
            unread: (d.labelIds || []).includes('UNREAD'),
          };
        }),
      };
    },
  },
  {
    name: 'read_email',
    description: 'Lê o conteúdo completo de um email específico. Use o id retornado por list_recent_emails.',
    input_schema: {
      type: 'object',
      properties: {
        email_id: { type: 'string', description: 'ID do email' },
      },
      required: ['email_id'],
    },
    handler: async ({ email_id }) => {
      const res = await gmail().users.messages.get({
        userId: 'me',
        id: email_id,
        format: 'full',
      });
      const d = res.data;
      const body = extractBody(d.payload).slice(0, 8000);
      return {
        id: d.id,
        from: header(d.payload?.headers, 'From'),
        to: header(d.payload?.headers, 'To'),
        subject: header(d.payload?.headers, 'Subject'),
        date: header(d.payload?.headers, 'Date'),
        body,
      };
    },
  },
  {
    name: 'send_email',
    description: 'Envia um email a partir da conta do Rafael. Sempre confirme com o usuário antes de enviar (mostre destinatário, assunto e corpo).',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Email do destinatário (ou múltiplos separados por vírgula)' },
        subject: { type: 'string' },
        body: { type: 'string', description: 'Corpo em texto puro (pode usar quebras de linha)' },
        cc: { type: 'string', description: 'CC (opcional, separado por vírgula)' },
        bcc: { type: 'string', description: 'BCC (opcional, separado por vírgula)' },
      },
      required: ['to', 'subject', 'body'],
    },
    handler: async ({ to, subject, body, cc, bcc }) => {
      const lines = [`To: ${to}`];
      if (cc) lines.push(`Cc: ${cc}`);
      if (bcc) lines.push(`Bcc: ${bcc}`);
      lines.push(`Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`);
      lines.push('MIME-Version: 1.0');
      lines.push('Content-Type: text/plain; charset=UTF-8');
      lines.push('Content-Transfer-Encoding: base64');
      lines.push('');
      lines.push(Buffer.from(body).toString('base64'));

      const raw = Buffer.from(lines.join('\r\n'))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const res = await gmail().users.messages.send({
        userId: 'me',
        requestBody: { raw },
      });
      return { sent: true, id: res.data.id };
    },
  },
];
