import { google } from 'googleapis';
import { getAuthClient } from './google-auth.js';

function sheets() {
  const auth = getAuthClient();
  if (!auth) throw new Error('Google não autorizado. Acesse http://localhost:3000/oauth/auth');
  return google.sheets({ version: 'v4', auth });
}

function drive() {
  const auth = getAuthClient();
  if (!auth) throw new Error('Google não autorizado. Acesse http://localhost:3000/oauth/auth');
  return google.drive({ version: 'v3', auth });
}

export const sheetsTools = [
  {
    name: 'list_spreadsheets',
    description:
      'Lista planilhas Google Sheets do Rafael (todas que ele tem acesso). Use quando ele mencionar uma planilha sem dar o ID — esta tool retorna ID + nome, depois você usa read_spreadsheet/append/etc.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Busca por nome (parcial). Vazio = retorna as planilhas mais recentes.',
        },
        max_results: { type: 'number', description: 'Máximo de resultados (default 20)' },
      },
    },
    handler: async ({ query = '', max_results = 20 }) => {
      const q = [
        `mimeType='application/vnd.google-apps.spreadsheet'`,
        `trashed=false`,
        query ? `name contains '${query.replace(/'/g, "\\'")}'` : '',
      ]
        .filter(Boolean)
        .join(' and ');

      const res = await drive().files.list({
        q,
        pageSize: max_results,
        fields: 'files(id, name, modifiedTime, owners(emailAddress))',
        orderBy: 'modifiedTime desc',
      });
      const files = res.data.files || [];
      return {
        count: files.length,
        spreadsheets: files.map((f) => ({
          id: f.id,
          name: f.name,
          modified_time: f.modifiedTime,
          owner: f.owners?.[0]?.emailAddress || null,
          url: `https://docs.google.com/spreadsheets/d/${f.id}/edit`,
        })),
      };
    },
  },
  {
    name: 'get_spreadsheet_info',
    description:
      'Retorna estrutura da planilha: título, lista de abas (sheets) com seus nomes e tamanhos de grid. Use ANTES de ler/escrever quando não souber o nome da aba ou o range.',
    input_schema: {
      type: 'object',
      properties: {
        spreadsheet_id: { type: 'string', description: 'ID da planilha (obtido via list_spreadsheets)' },
      },
      required: ['spreadsheet_id'],
    },
    handler: async ({ spreadsheet_id }) => {
      const res = await sheets().spreadsheets.get({
        spreadsheetId: spreadsheet_id,
        includeGridData: false,
      });
      const d = res.data;
      return {
        title: d.properties?.title,
        url: d.spreadsheetUrl,
        sheets: (d.sheets || []).map((s) => ({
          title: s.properties?.title,
          sheet_id: s.properties?.sheetId,
          rows: s.properties?.gridProperties?.rowCount,
          columns: s.properties?.gridProperties?.columnCount,
        })),
      };
    },
  },
  {
    name: 'read_spreadsheet',
    description:
      'Lê valores de um range em uma planilha. Range usa notação A1 (ex: "Página1!A1:D20" ou "Tab Name!A:Z").',
    input_schema: {
      type: 'object',
      properties: {
        spreadsheet_id: { type: 'string' },
        range: {
          type: 'string',
          description: 'Range em notação A1. Ex: "Página1!A1:D20", "Sheet1!A:E" (toda coluna), "Página1" (toda a aba).',
        },
      },
      required: ['spreadsheet_id', 'range'],
    },
    handler: async ({ spreadsheet_id, range }) => {
      const res = await sheets().spreadsheets.values.get({
        spreadsheetId: spreadsheet_id,
        range,
      });
      return {
        range: res.data.range,
        rows: res.data.values?.length || 0,
        values: res.data.values || [],
      };
    },
  },
  {
    name: 'append_to_spreadsheet',
    description:
      'Adiciona linhas ao final dos dados existentes em um range. Use pra adicionar despesas, tarefas, registros — o Google escolhe automaticamente a primeira linha vazia no range. Sempre confirme com o usuário antes de adicionar.',
    input_schema: {
      type: 'object',
      properties: {
        spreadsheet_id: { type: 'string' },
        range: { type: 'string', description: 'Range alvo (geralmente a aba: "Página1!A:E")' },
        values: {
          type: 'array',
          items: { type: 'array', items: { type: 'string' } },
          description: 'Linhas a adicionar (array de arrays). Ex: [["2026-05-20", "Almoço", "45.00"]]',
        },
      },
      required: ['spreadsheet_id', 'range', 'values'],
    },
    handler: async ({ spreadsheet_id, range, values }) => {
      const res = await sheets().spreadsheets.values.append({
        spreadsheetId: spreadsheet_id,
        range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values },
      });
      return {
        appended: res.data.updates?.updatedRows || 0,
        range: res.data.updates?.updatedRange,
      };
    },
  },
  {
    name: 'update_spreadsheet_range',
    description:
      'Substitui valores em um range específico. Use pra alterar células existentes (não pra adicionar — pra adicionar use append). Sempre confirme com o usuário antes.',
    input_schema: {
      type: 'object',
      properties: {
        spreadsheet_id: { type: 'string' },
        range: { type: 'string', description: 'Range exato a atualizar. Ex: "Página1!B5:B10"' },
        values: {
          type: 'array',
          items: { type: 'array', items: { type: 'string' } },
          description: 'Valores em formato 2D array. Linhas × colunas do range.',
        },
      },
      required: ['spreadsheet_id', 'range', 'values'],
    },
    handler: async ({ spreadsheet_id, range, values }) => {
      const res = await sheets().spreadsheets.values.update({
        spreadsheetId: spreadsheet_id,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
      return {
        updated_cells: res.data.updatedCells || 0,
        updated_range: res.data.updatedRange,
      };
    },
  },
  {
    name: 'create_spreadsheet',
    description:
      'Cria uma nova planilha. Opcionalmente já cria a primeira linha de cabeçalhos. Confirme com o usuário (título e cabeçalhos) antes.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título da planilha' },
        headers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Cabeçalhos da primeira linha (opcional). Ex: ["Data", "Descrição", "Valor"]',
        },
      },
      required: ['title'],
    },
    handler: async ({ title, headers }) => {
      const created = await sheets().spreadsheets.create({
        requestBody: { properties: { title } },
      });
      const spreadsheetId = created.data.spreadsheetId;

      if (headers?.length) {
        await sheets().spreadsheets.values.update({
          spreadsheetId,
          range: 'A1',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [headers] },
        });
      }
      return {
        id: spreadsheetId,
        title,
        url: created.data.spreadsheetUrl,
        headers_added: headers || [],
      };
    },
  },
];
