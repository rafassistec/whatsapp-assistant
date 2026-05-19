import Anthropic from '@anthropic-ai/sdk';
import { toolDefinitions, runTool } from './tools.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VISION_MODEL = process.env.CLAUDE_VISION_MODEL || 'claude-sonnet-4-6';
const TOOL_MODEL = process.env.CLAUDE_TOOL_MODEL || 'claude-sonnet-4-6';
const TEXT_MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';

const MAX_TOOL_ITERATIONS = 6;

function buildSystemPrompt() {
  const now = new Date();
  const tzPrompt = `Data e hora atuais: ${now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'full', timeStyle: 'short' })}. Timezone do Rafael: America/Sao_Paulo (UTC-3). Sempre que criar/listar eventos ou interpretar datas relativas ("amanhã", "sexta"), use esse timezone.`;
  return `${process.env.SYSTEM_PROMPT}\n\n${tzPrompt}`;
}

export async function askClaude(history, userContent, { hasImage = false } = {}) {
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userContent },
  ];

  const model = hasImage ? VISION_MODEL : TOOL_MODEL;

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      system: buildSystemPrompt(),
      tools: toolDefinitions,
      messages,
    });

    if (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter((b) => b.type === 'tool_use');

      messages.push({ role: 'assistant', content: response.content });

      const toolResults = await Promise.all(
        toolUses.map(async (use) => ({
          type: 'tool_result',
          tool_use_id: use.id,
          content: JSON.stringify(await runTool(use.name, use.input)),
        }))
      );

      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    const textBlock = response.content.find((b) => b.type === 'text');
    return textBlock?.text || '(sem resposta)';
  }

  return '(loop de ferramentas excedido — tenta de novo?)';
}
