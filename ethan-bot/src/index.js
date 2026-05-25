import 'dotenv/config';
import Fastify from 'fastify';
import { handleIncomingMessage } from './handler.js';

const fastify = Fastify({
  logger: { level: 'info' },
  bodyLimit: 50 * 1024 * 1024,
});

fastify.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));

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

const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '0.0.0.0';

fastify.listen({ port, host }).then(() => {
  fastify.log.info(`ethan-bot listening on http://${host}:${port}${process.env.WEBHOOK_PATH || '/webhook'}`);
});
