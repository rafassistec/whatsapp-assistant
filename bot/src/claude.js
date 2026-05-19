import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function askClaude(userText) {
  const response = await client.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: process.env.SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userText }],
  });

  const block = response.content?.[0];
  return block?.type === 'text' ? block.text : '(sem resposta)';
}
