import { google } from 'googleapis';
import { getAuthClient } from './google-auth.js';

function cal() {
  const auth = getAuthClient();
  if (!auth) throw new Error('Google não autorizado. Acesse http://localhost:3000/oauth/auth');
  return google.calendar({ version: 'v3', auth });
}

export const calendarTools = [
  {
    name: 'list_calendar_events',
    description:
      'Lista eventos da agenda do Rafael em um intervalo de tempo. Use para responder perguntas como "o que tenho amanhã?", "qual meu compromisso de quinta?", "estou livre tal dia?".',
    input_schema: {
      type: 'object',
      properties: {
        time_min: {
          type: 'string',
          description: 'Data/hora inicial em ISO 8601 com timezone (ex: 2026-05-19T00:00:00-03:00). Use timezone -03:00 (Brasília).',
        },
        time_max: {
          type: 'string',
          description: 'Data/hora final em ISO 8601 com timezone.',
        },
        max_results: {
          type: 'number',
          description: 'Máximo de eventos a retornar (default 20)',
        },
      },
      required: ['time_min', 'time_max'],
    },
    handler: async ({ time_min, time_max, max_results = 20 }) => {
      const res = await cal().events.list({
        calendarId: 'primary',
        timeMin: time_min,
        timeMax: time_max,
        maxResults: max_results,
        singleEvents: true,
        orderBy: 'startTime',
      });
      const events = (res.data.items || []).map((e) => ({
        id: e.id,
        summary: e.summary,
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
        location: e.location || null,
        description: e.description || null,
        attendees: (e.attendees || []).map((a) => a.email),
      }));
      return { count: events.length, events };
    },
  },
  {
    name: 'create_calendar_event',
    description: 'Cria um novo evento na agenda. Confirme com o usuário antes se algo importante (título, data, hora) parecer ambíguo.',
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Título do evento' },
        start: { type: 'string', description: 'Data/hora de início em ISO 8601 com timezone (ex: 2026-05-20T14:00:00-03:00)' },
        end: { type: 'string', description: 'Data/hora de fim em ISO 8601 com timezone' },
        description: { type: 'string', description: 'Descrição/notas (opcional)' },
        location: { type: 'string', description: 'Local (opcional)' },
        attendees: { type: 'array', items: { type: 'string' }, description: 'Lista de emails de convidados (opcional)' },
      },
      required: ['summary', 'start', 'end'],
    },
    handler: async ({ summary, start, end, description, location, attendees }) => {
      const res = await cal().events.insert({
        calendarId: 'primary',
        sendUpdates: attendees?.length ? 'all' : 'none',
        requestBody: {
          summary,
          start: { dateTime: start },
          end: { dateTime: end },
          description: description || undefined,
          location: location || undefined,
          attendees: attendees?.map((email) => ({ email })),
        },
      });
      return { id: res.data.id, summary: res.data.summary, htmlLink: res.data.htmlLink };
    },
  },
  {
    name: 'update_calendar_event',
    description: 'Atualiza um evento existente. Use o ID retornado por list_calendar_events.',
    input_schema: {
      type: 'object',
      properties: {
        event_id: { type: 'string', description: 'ID do evento (obtido via list_calendar_events)' },
        summary: { type: 'string' },
        start: { type: 'string', description: 'ISO 8601 com timezone' },
        end: { type: 'string', description: 'ISO 8601 com timezone' },
        description: { type: 'string' },
        location: { type: 'string' },
      },
      required: ['event_id'],
    },
    handler: async ({ event_id, ...changes }) => {
      const body = {};
      if (changes.summary) body.summary = changes.summary;
      if (changes.start) body.start = { dateTime: changes.start };
      if (changes.end) body.end = { dateTime: changes.end };
      if (changes.description !== undefined) body.description = changes.description;
      if (changes.location !== undefined) body.location = changes.location;

      const res = await cal().events.patch({
        calendarId: 'primary',
        eventId: event_id,
        requestBody: body,
      });
      return { id: res.data.id, summary: res.data.summary, updated: true };
    },
  },
  {
    name: 'delete_calendar_event',
    description: 'Cancela/remove um evento. Confirme com o usuário antes.',
    input_schema: {
      type: 'object',
      properties: {
        event_id: { type: 'string', description: 'ID do evento' },
      },
      required: ['event_id'],
    },
    handler: async ({ event_id }) => {
      await cal().events.delete({ calendarId: 'primary', eventId: event_id });
      return { deleted: true, event_id };
    },
  },
];
