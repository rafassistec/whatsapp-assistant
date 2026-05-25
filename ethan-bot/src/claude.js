import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';
const VISION_MODEL = process.env.CLAUDE_VISION_MODEL || 'claude-sonnet-4-6';
const MAX_TOOL_ITERATIONS = 4;

const SYSTEM_PROMPT = `Você é Ethan, consultor especialista da Peptídios — empresa que comercializa peptídeos para estética, performance esportiva e bem-estar.

Seu papel é atender clientes no WhatsApp com atenção, empatia e conhecimento. Você ajuda o cliente a entender qual produto é o mais adequado para o objetivo dele e conduz o atendimento até a decisão de compra de forma consultiva, nunca agressiva.

Diretrizes:
- Cumprimente com simpatia e pergunte o objetivo do cliente caso ele não tenha dito
- Use linguagem acessível — explique benefícios sem excesso de jargões técnicos
- Nunca faça diagnósticos nem substitua orientação médica. Se a dúvida for clínica, indique que o cliente consulte um médico ou farmacêutico
- Seja breve e objetivo nas respostas — WhatsApp não é lugar para parágrafos longos
- Use emojis com moderação para deixar a conversa mais humana
- Se o cliente demonstrar interesse real em comprar, peça os dados de pedido ou direcione para finalizar

Quando acionar atendimento humano (use a ferramenta request_human_takeover):
- O cliente pediu explicitamente para falar com um humano, atendente ou pessoa
- O cliente está claramente frustrado ou insatisfeito
- A situação envolve reclamação grave, devolução ou problema que exige decisão da empresa
- A negociação está em um ponto sensível que requer autorização humana`;

const tools = [
  {
    name: 'request_human_takeover',
    description:
      'Aciona o modo de atendimento humano para este chat. Use quando o cliente pedir para falar com um humano, estiver frustrado, ou a situação exigir decisão humana. Após chamar esta ferramenta, envie uma mensagem de despedida cordial ao cliente.',
    input_schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Motivo resumido da transferência (para notificar o dono)',
        },
      },
      required: ['reason'],
    },
  },
];

function buildSystemPrompt() {
  const now = new Date();
  const ts = now.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'full',
    timeStyle: 'short',
  });
  return `${SYSTEM_PROMPT}\n\nData e hora atuais: ${ts} (America/Sao_Paulo).`;
}

export async function askClaude(history, userContent, { hasImage = false } = {}) {
  const model = hasImage ? VISION_MODEL : MODEL;
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userContent },
  ];

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      system: buildSystemPrompt(),
      tools,
      messages,
    });

    if (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter((b) => b.type === 'tool_use');
      const takeoverCall = toolUses.find((u) => u.name === 'request_human_takeover');

      if (takeoverCall) {
        // Let Claude generate a farewell message after confirming the transfer
        messages.push({ role: 'assistant', content: response.content });
        messages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: takeoverCall.id,
              content: 'Transferência iniciada. Agora envie uma mensagem de despedida cordial ao cliente avisando que um atendente humano vai continuar o atendimento em breve.',
            },
          ],
        });

        const farewell = await client.messages.create({
          model,
          max_tokens: 256,
          system: buildSystemPrompt(),
          messages,
        });

        const farewellText =
          farewell.content.find((b) => b.type === 'text')?.text ||
          'Um momento! Vou chamar um atendente humano para continuar seu atendimento. 🙏';

        return { reply: farewellText, takeover: true, takeoverReason: takeoverCall.input?.reason || '' };
      }

      // Handle any other future tools (none defined yet)
      messages.push({ role: 'assistant', content: response.content });
      const toolResults = toolUses.map((use) => ({
        type: 'tool_result',
        tool_use_id: use.id,
        content: 'ok',
      }));
      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    const text = response.content.find((b) => b.type === 'text')?.text || '(sem resposta)';
    return { reply: text, takeover: false };
  }

  return { reply: '(loop de ferramentas excedido — tenta de novo?)', takeover: false };
}
