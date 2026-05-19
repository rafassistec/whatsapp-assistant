import 'dotenv/config';
import Fastify from 'fastify';
import { handleIncomingMessage } from './handler.js';
import { getAuthUrl, exchangeCodeForTokens, isAuthorized } from './google-auth.js';

const fastify = Fastify({
  logger: { level: 'info' },
  bodyLimit: 50 * 1024 * 1024,
});

fastify.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));

fastify.get('/oauth/auth', async (request, reply) => {
  return reply.redirect(getAuthUrl());
});

fastify.get('/oauth/callback', async (request, reply) => {
  const { code, error } = request.query;
  if (error) {
    return reply.code(400).type('text/html').send(`<h1>Erro</h1><p>${error}</p>`);
  }
  if (!code) {
    return reply.code(400).type('text/html').send(`<h1>Erro</h1><p>code ausente</p>`);
  }
  try {
    await exchangeCodeForTokens(code);
    return reply.type('text/html').send(`
      <h1>✅ Autorizado!</h1>
      <p>Pode fechar essa aba e voltar pro WhatsApp.</p>
    `);
  } catch (err) {
    fastify.log.error({ err }, 'oauth callback failed');
    return reply.code(500).type('text/html').send(`<h1>Falha</h1><pre>${err.message}</pre>`);
  }
});

fastify.get('/oauth/status', async () => ({ authorized: isAuthorized() }));

fastify.post(process.env.WEBHOOK_PATH || '/webhook', async (request, reply) => {
  const event = request.body;

  console.log(`[event] ${event?.event || 'unknown'}`);

  if (event?.event !== 'messages.upsert') {
    return reply.code(200).send({ ignored: 'not-a-message' });
  }

  reply.code(200).send({ ok: true });

  handleIncomingMessage(event).catch((err) => {
    fastify.log.error({ err }, 'failed to handle message');
  });
});

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';

fastify.listen({ port, host }).then(() => {
  fastify.log.info(`bot listening on http://${host}:${port}${process.env.WEBHOOK_PATH || '/webhook'}`);
});
