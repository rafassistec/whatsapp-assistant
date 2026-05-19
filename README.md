# WhatsApp Assistant

Assistente pessoal no WhatsApp construído com **Claude API**, com memória de conversa, análise de imagens, integração com Google Calendar e Gmail.

Construído colaborativamente com Claude Code.

---

## ✨ O que ele faz

| Recurso | Como usar |
|---------|-----------|
| 💬 **Conversa contextual** | Mande mensagem no self-chat do WhatsApp — Claude responde lembrando do contexto recente |
| 🖼️ **Análise de imagens** | Envie uma foto (com ou sem legenda) — descrição, OCR de nota fiscal, leitura de tela de erro, identificação de objetos |
| 📅 **Google Calendar** | "o que tenho amanhã?", "agenda reunião com fulano sexta 14h", "cancela o evento das 10h" |
| 📧 **Gmail** | "tem email novo?", "lê o último email do banco", "responde pro Pedro confirmando" |
| 🧠 **Memória persistente** | SQLite — janela rolante de 30 mensagens por chat |

---

## 🛠️ Stack

- **Node.js 20+** (ESM, sem TypeScript)
- **Fastify** — servidor HTTP que recebe webhooks
- **[Evolution API](https://github.com/EvolutionAPI/evolution-api) v2.3.7** — gateway WhatsApp (Docker)
- **[@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript)** — cliente Claude
- **[googleapis](https://github.com/googleapis/google-api-nodejs-client)** — Calendar + Gmail
- **node:sqlite** — banco built-in (Node 22+), sem dependência nativa
- **PostgreSQL 16** — usado internamente pelo Evolution API

---

## 📐 Arquitetura

```
WhatsApp (celular)
       ↓
Evolution API (Docker, porta 8080)
       ↓ webhook em messages.upsert
Bot Fastify (porta 3000)
       ├── handler.js  → roteia/filtra mensagens
       ├── claude.js   → tool-use loop com Sonnet 4.6
       ├── db.js       → SQLite (mensagens + tokens OAuth)
       ├── tools-calendar.js → 4 tools de Calendar
       ├── tools-gmail.js    → 3 tools de Gmail
       └── google-auth.js    → OAuth 2.0 flow
```

---

## 🚀 Setup

### Pré-requisitos

- Node.js 22+
- Docker Desktop
- Conta Anthropic com créditos ([console.anthropic.com](https://console.anthropic.com))
- Projeto Google Cloud com Calendar + Gmail APIs habilitadas + OAuth Client ID

### Passos

```bash
# 1. clonar
git clone https://github.com/rafassistec/whatsapp-assistant.git
cd whatsapp-assistant/bot

# 2. configurar
cp .env.example .env
# editar .env e preencher ANTHROPIC_API_KEY e EVOLUTION_API_KEY (qualquer hex)

# 3. baixar credenciais Google e salvar como google-credentials.json na raiz do bot

# 4. subir Evolution API
docker compose up -d

# 5. parear WhatsApp via Evolution Manager
# acessar http://localhost:8080/manager (senha = EVOLUTION_API_KEY)
# criar instância "rafael-bot", escanear QR no celular

# 6. instalar deps e rodar o bot
npm install
npm run dev

# 7. autorizar Google APIs (uma vez só)
open http://localhost:3000/oauth/auth

# pronto! manda mensagem no self-chat do WhatsApp
```

Mais detalhes no [README do bot](./bot/README.md).

---

## ⚙️ Variáveis de ambiente principais

| Variável | Para que serve |
|----------|---------------|
| `ANTHROPIC_API_KEY` | Chave da Claude API |
| `CLAUDE_MODEL` | Modelo Haiku (texto simples) |
| `CLAUDE_TOOL_MODEL` | Modelo Sonnet (tool use) |
| `CLAUDE_VISION_MODEL` | Modelo Sonnet (imagens) |
| `EVOLUTION_API_KEY` | Senha da Evolution API (hex aleatório) |
| `OWNER_PHONE` | Seu número (formato 55DDDnumero) |
| `ONLY_OWNER` | Se `true`, bot só responde ao OWNER_PHONE |
| `MEMORY_WINDOW` | Quantas mensagens passadas mandar como contexto |
| `SYSTEM_PROMPT` | Personalidade do assistente |

---

## 🗺️ Roadmap

- [x] **Fase 1** — MVP de conversa texto
- [x] **Fase 2** — Memória persistente (SQLite)
- [ ] **Fase 3** — Transcrição de áudios (OpenAI Whisper)
- [x] **Fase 4** — Análise de imagens (Claude Vision)
- [x] **Fase 5** — Google Calendar + Gmail (OAuth 2.0)
- [ ] **Fase 6** — Deploy em VPS (Hostinger + PM2)

---

## 💰 Custos esperados (uso pessoal moderado)

- **Claude API** (~30 msgs/dia, Sonnet 4.6): R$30–80/mês
- **Google APIs**: gratuito até quotas generosas
- **Hostinger VPS** (quando deployar): R$23–50/mês

---

## 🔐 Segurança

- `.env`, `google-credentials.json` e `data/` são gitignored
- `ONLY_OWNER=true` por padrão — bot ignora msgs de outros números
- OAuth 2.0 com refresh token armazenado localmente no SQLite
- Filtro anti-loop por message ID (evita responder respostas do próprio bot)
- Filtro de respostas de outros bots WhatsApp (clawdbot, claudbot)

---

## 📁 Estrutura do repo

```
.
├── bot/                    # WhatsApp assistant
│   ├── src/
│   │   ├── index.js
│   │   ├── handler.js
│   │   ├── claude.js
│   │   ├── db.js
│   │   ├── evolution.js
│   │   ├── google-auth.js
│   │   ├── tools.js
│   │   ├── tools-calendar.js
│   │   └── tools-gmail.js
│   ├── docker-compose.yml
│   ├── package.json
│   └── README.md
├── seo/                    # SEO snippets para rgtelecom.com.br
│   ├── snippets-rg-telecom.md
│   └── landing-page-troca-tela-iphone.md
└── README.md               # você está aqui
```

---

## 📝 Licença

Uso pessoal. Sem licença pública por enquanto.
