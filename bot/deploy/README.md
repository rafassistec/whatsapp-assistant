# Deploy em VPS (Ubuntu 24.04)

Guia testado em Hostinger VPS KVM 1 (1 vCPU, 4GB RAM). Funciona em qualquer Ubuntu 22.04+ com Docker.

---

## 1. Provisionar o VPS

- Sistema: **Ubuntu 22.04 ou 24.04 LTS**
- Painel de controle: **nenhum**
- Aplicação pré-instalada: **Docker** (se disponível, economiza ~10 min)
- Localização: a mais próxima dos seus usuários

Após provisionar, anote o **IP público** (IPv4 e IPv6 se houver) e a **senha root**.

## 2. Configurar chave SSH

No seu Mac/Linux local, gere uma chave se não tiver:
```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

No VPS (via Browser SSH do painel ou senha):
```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
# cole a chave pública em uma única linha:
echo 'ssh-ed25519 AAAA... user@local' > ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

> ⚠️ Se a chave colar em múltiplas linhas, conserte com:
> ```
> K=$(<~/.ssh/authorized_keys); echo $K > ~/.ssh/authorized_keys
> ```

Teste do seu local:
```bash
ssh root@IP_DO_VPS 'echo ok'
```

## 3. Instalar Docker (se não vier pronto) e Node 22

```bash
# Docker (Ubuntu 24+ tem opção de vir instalado)
curl -fsSL https://get.docker.com | sh

# Node 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
```

## 4. Clonar repo

```bash
cd /opt
git clone https://github.com/rafassistec/whatsapp-assistant.git
cd whatsapp-assistant/bot
npm install
```

## 5. Transferir credenciais (do seu Mac)

```bash
# do Mac local:
scp bot/.env root@VPS_IP:/opt/whatsapp-assistant/bot/.env
scp bot/google-credentials.json root@VPS_IP:/opt/whatsapp-assistant/bot/google-credentials.json

# opcional: histórico SQLite (NOTA: pegue todos os arquivos do WAL!)
ssh root@VPS_IP 'mkdir -p /opt/whatsapp-assistant/bot/data'
scp bot/data/memory.db* root@VPS_IP:/opt/whatsapp-assistant/bot/data/
```

> ⚠️ **WAL do SQLite**: o `node:sqlite` usa modo WAL — dados podem estar em `memory.db-wal` (não só em `memory.db`). Sempre copie os 3 arquivos: `memory.db`, `memory.db-wal`, `memory.db-shm`.

## 6. Subir Evolution API

```bash
cd /opt/whatsapp-assistant/bot
docker compose up -d
# aguardar uns 10s até Evolution responder
curl -s http://localhost:8080/
```

## 7. Parear WhatsApp

Como o VPS não tem display, gere QR via API e baixe pro seu Mac:

```bash
# no VPS:
source .env
curl -s -X POST "http://localhost:8080/instance/create" \
  -H "Content-Type: application/json" \
  -H "apikey: $EVOLUTION_API_KEY" \
  -d '{"instanceName":"rafael-bot","qrcode":true,"integration":"WHATSAPP-BAILEYS"}' \
  | python3 -c "
import json,sys,base64
d=json.load(sys.stdin)
b64=d.get('qrcode',{}).get('base64','').split(',',1)[-1]
open('/tmp/qr.png','wb').write(base64.b64decode(b64))
print('saved /tmp/qr.png')"

# no Mac (baixa o QR pra abrir no Preview):
scp root@VPS_IP:/tmp/qr.png /tmp/qr.png && open /tmp/qr.png
```

Escaneia no celular. Aguarde uns 10s e confira:
```bash
ssh root@VPS_IP 'curl -s "http://localhost:8080/instance/connectionState/rafael-bot" -H "apikey: $EVOLUTION_API_KEY"'
```

Deve mostrar `state: open`.

## 8. Configurar firewall (UFW)

⚠️ **Importante**: por padrão UFW bloqueia tráfego das redes Docker, o que **impede webhooks** do Evolution chegarem no bot.

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment "SSH"
# ↓ ESSA REGRA É CRÍTICA pra webhooks Docker → bot funcionarem
ufw allow from 172.18.0.0/16 to any port 3000 comment "Docker bridge → bot"
ufw allow from 172.17.0.0/16 to any port 3000 comment "Docker default → bot"
ufw --force enable
```

## 9. Bot como serviço systemd

```bash
# copia o unit file do repo
cp /opt/whatsapp-assistant/bot/deploy/whatsapp-bot.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable whatsapp-bot
systemctl start whatsapp-bot

# verificar
systemctl status whatsapp-bot
tail -f /var/log/whatsapp-bot.log
curl -s http://localhost:3000/health
```

## 10. Autorizar Google APIs (se DB veio sem tokens)

OAuth redirect URI no Google Cloud é `http://localhost:3000/oauth/callback`, mas o bot está no VPS. Use **túnel SSH**:

```bash
# no Mac:
ssh -f -N -L 3000:localhost:3000 root@VPS_IP
open http://localhost:3000/oauth/auth
# autoriza Google
# tokens são salvos no VPS via tunnel

# depois fecha o túnel:
pkill -f "ssh -f -N -L 3000:localhost:3000"
```

## 11. Validar tudo funcionando

- Mande mensagem no self-chat → deve responder
- Mande áudio → deve transcrever
- "tem email novo?" → deve listar
- "minhas planilhas" → deve listar

## Operações comuns

### Atualizar código
```bash
ssh root@VPS_IP
cd /opt/whatsapp-assistant
git pull
cd bot
npm install
systemctl restart whatsapp-bot
```

### Ver logs em tempo real
```bash
journalctl -u whatsapp-bot -f
# ou
tail -f /var/log/whatsapp-bot.log
```

### Reiniciar bot
```bash
systemctl restart whatsapp-bot
```

### Reiniciar Evolution
```bash
cd /opt/whatsapp-assistant/bot
docker compose restart evolution-api
```

### Repare WhatsApp se cair
```bash
# logout da instância
source /opt/whatsapp-assistant/bot/.env
curl -X DELETE "http://localhost:8080/instance/logout/rafael-bot" -H "apikey: $EVOLUTION_API_KEY"
# gera novo QR via passo 7
```

## Custos

| Item | Mensal |
|------|--------|
| Hostinger VPS KVM 1 | R$25–30 |
| Claude API (Sonnet 4.6) | R$30–80 |
| OpenAI Whisper | ~R$5 |
| Google APIs | grátis |
| **Total** | **~R$60–115/mês** |
