# Deploy ethan-bot na VPS

Pré-requisito: VPS já tem Node 22, Docker e Evolution API rodando com o bot principal.

---

## 1. Atualizar o repositório na VPS

```bash
ssh root@VPS_IP
cd /opt/whatsapp-assistant
git pull
cd ethan-bot
npm install
```

## 2. Criar o .env

```bash
cp /opt/whatsapp-assistant/ethan-bot/.env.example /opt/whatsapp-assistant/ethan-bot/.env
nano /opt/whatsapp-assistant/ethan-bot/.env
```

Preencha todas as variáveis. Use o mesmo `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` do bot principal, mas com `EVOLUTION_INSTANCE_NAME=ethan` (novo nome de instância).

## 3. Liberar porta 3001 no UFW

```bash
ufw allow from 172.18.0.0/16 to any port 3001 comment "Docker bridge → ethan-bot"
ufw allow from 172.17.0.0/16 to any port 3001 comment "Docker default → ethan-bot"
ufw status numbered
```

## 4. Instalar o serviço systemd

```bash
cp /opt/whatsapp-assistant/ethan-bot/deploy/ethan-bot.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable ethan-bot
systemctl start ethan-bot

# verificar
systemctl status ethan-bot
curl -s http://localhost:3001/health
```

## 5. Criar instância Evolution para o número da Peptídios

```bash
source /opt/whatsapp-assistant/ethan-bot/.env

curl -s -X POST "$EVOLUTION_API_URL/instance/create" \
  -H "Content-Type: application/json" \
  -H "apikey: $EVOLUTION_API_KEY" \
  -d "{\"instanceName\":\"$EVOLUTION_INSTANCE_NAME\",\"qrcode\":true,\"integration\":\"WHATSAPP-BAILEYS\"}" \
  | python3 -c "
import json,sys,base64
d=json.load(sys.stdin)
b64=d.get('qrcode',{}).get('base64','').split(',',1)[-1]
open('/tmp/qr-ethan.png','wb').write(base64.b64decode(b64))
print('saved /tmp/qr-ethan.png')"
```

Baixe e abra o QR no Mac:

```bash
# no Mac:
scp root@VPS_IP:/tmp/qr-ethan.png /tmp/qr-ethan.png && open /tmp/qr-ethan.png
```

Escaneia com o celular do número da Peptídios. Confirme a conexão:

```bash
curl -s "$EVOLUTION_API_URL/instance/connectionState/$EVOLUTION_INSTANCE_NAME" \
  -H "apikey: $EVOLUTION_API_KEY"
# deve retornar: "state":"open"
```

## 6. Configurar webhook na instância

```bash
source /opt/whatsapp-assistant/ethan-bot/.env

curl -s -X POST "$EVOLUTION_API_URL/webhook/set/$EVOLUTION_INSTANCE_NAME" \
  -H "Content-Type: application/json" \
  -H "apikey: $EVOLUTION_API_KEY" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "http://172.17.0.1:3001/webhook",
      "events": ["MESSAGES_UPSERT"]
    }
  }'
```

> O IP `172.17.0.1` é o gateway padrão do Docker para o host. Se o bot não receber mensagens, troque por `172.18.0.1` (rede da stack do Evolution).

## 7. Validar

```bash
# health check
curl -s http://localhost:3001/health

# logs em tempo real
tail -f /var/log/ethan-bot.log
```

Mande uma mensagem do número da Peptídios para si mesmo e confirme que o Ethan responde.

---

## Operações comuns

### Atualizar código
```bash
ssh root@VPS_IP
cd /opt/whatsapp-assistant
git pull
cd ethan-bot
npm install
systemctl restart ethan-bot
```

### Logs
```bash
tail -f /var/log/ethan-bot.log
journalctl -u ethan-bot -f
```

### Reiniciar
```bash
systemctl restart ethan-bot
```

### Reativar bot para um cliente após atendimento humano
No WhatsApp do número da Peptídios, envie para si mesmo:
```
#on 5511999999999
```

### Ver chats pausados
```
#status
```
