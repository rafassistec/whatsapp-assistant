# WhatsApp Personal Assistant — RG Telecom

Bot Node.js que conecta o WhatsApp pessoal do Rafael ao Claude via Evolution API.

## Stack

- **Node.js 20+** (ESM)
- **Fastify** — servidor HTTP que recebe webhooks da Evolution API
- **Evolution API** (Docker) — gateway WhatsApp (não-oficial, baseado em Baileys)
- **@anthropic-ai/sdk** — cliente Claude

## Setup (Fase 1 — MVP texto)

### 1. Pré-requisitos no Mac

```bash
# Verificar Node 20+
node --version

# Se não tiver, instalar via Homebrew
brew install node@20

# Verificar Docker Desktop
docker --version
# Se não tiver: https://www.docker.com/products/docker-desktop
```

### 2. Configurar variáveis

```bash
cp .env.example .env
# editar .env e preencher ANTHROPIC_API_KEY e EVOLUTION_API_KEY (senha à sua escolha)
```

### 3. Subir Evolution API

```bash
docker compose up -d
docker compose logs -f evolution-api
# aguardar até ver "Server started"
```

Acesse o painel: http://localhost:8080/manager (use a EVOLUTION_API_KEY como senha)

### 4. Criar instância e parear WhatsApp

No painel:
1. Clique em **Instances** → **Create Instance**
2. Nome: `rafael-bot` (mesmo do .env)
3. Clique em **Create**
4. Vai aparecer um QR code — escaneie com seu WhatsApp:
   - WhatsApp → Configurações → Aparelhos conectados → Conectar aparelho

### 5. Instalar dependências e rodar o bot

```bash
npm install
npm run dev
```

Saída esperada:
```
bot listening on http://0.0.0.0:3000/webhook
```

### 6. Testar

Mande uma mensagem para o seu próprio WhatsApp **de um número diferente** (ex: peça pra alguém te mandar "Oi", ou use outro chip).

Você deve receber uma resposta gerada pelo Claude.

> ⚠️ Por padrão `ONLY_OWNER=true` faz com que o bot responda APENAS para você. Para liberar geral, mude para `false` no `.env` (não recomendado no início).

## Arquitetura

```
WhatsApp → Evolution API → webhook → bot (Fastify) → Claude API
                                        ↓
                                  Evolution API → WhatsApp (resposta)
```

## Próximas fases

- [ ] Fase 2: memória SQLite
- [ ] Fase 3: transcrição de áudio (Whisper)
- [ ] Fase 4: análise de imagens (Claude Vision)
- [ ] Fase 5: Google Calendar + Gmail
- [ ] Fase 6: deploy VPS Hostinger
