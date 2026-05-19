import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VISION_MODEL = process.env.CLAUDE_VISION_MODEL || 'claude-sonnet-4-6';

export async function askClaude(history, userContent, { hasImage = false } = {}) {
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userContent },
  ];

  const response = await client.messages.create({
    model: hasImage ? VISION_MODEL : (process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001'),
    max_tokens: 1024,
    system: process.env.SYSTEM_PROMPT,
    messages,
  });

  const block = response.content?.[0];
  return block?.type === 'text' ? block.text : '(sem resposta)';
}
