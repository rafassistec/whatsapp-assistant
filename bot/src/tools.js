import { calendarTools } from './tools-calendar.js';
import { gmailTools } from './tools-gmail.js';
import { sheetsTools } from './tools-sheets.js';

const allTools = [...calendarTools, ...gmailTools, ...sheetsTools];

export const toolDefinitions = allTools.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: t.input_schema,
}));

const handlersByName = Object.fromEntries(allTools.map((t) => [t.name, t.handler]));

export async function runTool(name, input) {
  const handler = handlersByName[name];
  if (!handler) return { error: `unknown tool: ${name}` };
  try {
    const result = await handler(input || {});
    return result;
  } catch (err) {
    return { error: err.message || String(err) };
  }
}
