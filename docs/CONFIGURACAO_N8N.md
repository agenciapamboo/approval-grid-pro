# Guia de Configuração N8N

## Visão Geral

O sistema possui dois tipos principais de webhooks:

1. **Webhooks de Cliente** (configurável por agência)
   - Eventos relacionados a conteúdos e aprovações
   - Cada agência/cliente pode ter seu próprio webhook

2. **Webhook de Emails Internos** (fixo)
   - URL: `https://webhook.pamboocriativos.com.br/webhook/d9e34937-f301-emailsinternos`
   - Eventos: Erros, alertas, relatórios do sistema

---

## Workflow 1: Notificações de Conteúdo para Clientes

### Estrutura do Workflow

```
┌─────────────┐     ┌──────────┐     ┌─────────────┐
│   Webhook   │────▶│  Switch  │────▶│ Processar   │
│  (Receber)  │     │ (Evento) │     │ Notificação │
└─────────────┘     └──────────┘     └─────────────┘
                         │
                         ├───▶ content.ready_for_approval
                         ├───▶ content.approved
                         ├───▶ content.rejected
                         ├───▶ content.adjustment_completed
                         ├───▶ content.auto_approved
                         ├───▶ content.last_day_reminder
                         └───▶ novojob
```

### 1. Configurar Webhook Node

**Configurações:**
```json
{
  "httpMethod": "POST",
  "path": "seu-webhook-path",
  "responseMode": "onReceived",
  "responseData": "firstEntryJson"
}
```

**Authentication (Opcional):**
```json
{
  "authentication": "headerAuth",
  "headerAuth": {
    "name": "Authorization",
    "value": "Bearer SEU_TOKEN_AQUI"
  }
}
```

### 2. Configurar Switch Node

**Mode:** Expression  
**Property:** `{{ $json.event }}`

**Rotas:**

#### Rota 1: content.ready_for_approval
```javascript
// Condição
{{ $json.event === 'content.ready_for_approval' }}
```

**Ação sugerida:**
- Enviar email para cliente
- Template: "Novo conteúdo para aprovar"
- Incluir link de aprovação

#### Rota 2: content.approved
```javascript
// Condição
{{ $json.event === 'content.approved' }}
```

**Ação sugerida:**
- Notificar agência
- Registrar em CRM
- Template: "Conteúdo aprovado"

#### Rota 3: content.rejected
```javascript
// Condição
{{ $json.event === 'content.rejected' }}
```

**Ação sugerida:**
- Notificar agência com urgência
- Incluir motivo da rejeição
- Template: "Ajustes solicitados"

#### Rota 4: novojob
```javascript
// Condição
{{ $json.event === 'novojob' }}
```

**Ação sugerida:**
- Criar ticket no sistema da agência
- Notificar designer
- Template: "Nova solicitação de criativo"

### 3. Exemplo de Email Node

**Para:** `{{ $json.client.email }}`  
**De:** `noreply@suaagencia.com`  
**Assunto:**
```javascript
{{ $json.event === 'content.ready_for_approval' 
   ? 'Novo conteúdo para aprovação: ' + $json.payload.title
   : 'Atualização de conteúdo: ' + $json.payload.title 
}}
```

**Corpo HTML:**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { 
      background: #2563eb; 
      color: white; 
      padding: 12px 24px; 
      text-decoration: none; 
      border-radius: 6px;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>{{ $json.agency.name }}</h2>
    
    <h3>Evento: {{ $json.event }}</h3>
    
    <p><strong>Conteúdo:</strong> {{ $json.payload.title }}</p>
    <p><strong>Tipo:</strong> {{ $json.payload.type }}</p>
    <p><strong>Data de publicação:</strong> {{ $json.payload.date }}</p>
    
    {% if $json.payload.channels %}
    <p><strong>Canais:</strong> {{ $json.payload.channels.join(', ') }}</p>
    {% endif %}
    
    {% if $json.event === 'content.ready_for_approval' %}
    <p>Um novo conteúdo está aguardando sua aprovação.</p>
    <a href="https://seudominio.com/approve/{{ $json.content_id }}" class="button">
      Aprovar Conteúdo
    </a>
    {% endif %}
    
    {% if $json.event === 'content.rejected' %}
    <p><strong>Motivo:</strong> {{ $json.payload.rejection_reason }}</p>
    {% endif %}
    
    <hr>
    <p style="font-size: 12px; color: #666;">
      Esta é uma notificação automática. Cliente: {{ $json.client.name }}
    </p>
  </div>
</body>
</html>
```

---

## Workflow 2: Emails Internos do Sistema

### Estrutura do Workflow

```
┌─────────────┐     ┌──────────┐     ┌─────────────┐
│   Webhook   │────▶│  Switch  │────▶│   Ações     │
│   (Fixo)    │     │  (Type)  │     │  por Tipo   │
└─────────────┘     └──────────┘     └─────────────┘
                         │
                         ├───▶ error (critical)    → Email + Slack
                         ├───▶ warning (high)      → Email urgente
                         ├───▶ security (critical) → Email + SMS
                         ├───▶ info (medium)       → Email normal
                         └───▶ report (low)        → Email consolidado
```

### 1. Configurar Webhook Node

**URL:** `https://webhook.pamboocriativos.com.br/webhook/d9e34937-f301-emailsinternos`

**Configurações:**
```json
{
  "httpMethod": "POST",
  "path": "d9e34937-f301-emailsinternos",
  "responseMode": "onReceived"
}
```

### 2. Configurar Switch Node

**Mode:** Expression  
**Property:** `{{ $json.type }}`

**Rotas:**

#### Rota 1: Erros Críticos
```javascript
// Condição
{{ $json.type === 'error' && $json.priority === 'critical' }}
```

**Ações:**
1. Enviar email para equipe técnica
2. Postar no Slack #alerts
3. Criar incident no PagerDuty (opcional)

**Template de Email:**
```
Assunto: 🔴 ERRO CRÍTICO: {{ $json.subject }}

Sistema: {{ $json.source }}
Prioridade: {{ $json.priority }}
Timestamp: {{ $json.timestamp }}

Mensagem:
{{ $json.message }}

Detalhes:
{{ JSON.stringify($json.details, null, 2) }}

---
Alerta automático do sistema
```

#### Rota 2: Avisos Importantes
```javascript
// Condição
{{ $json.type === 'warning' && $json.priority === 'high' }}
```

**Ação:** Email para administradores

#### Rota 3: Segurança
```javascript
// Condição
{{ $json.type === 'security' }}
```

**Ação:** Email + notificação em tempo real

#### Rota 4: Relatórios Diários
```javascript
// Condição
{{ $json.type === 'report' }}
```

**Ação:** Email consolidado matinal

### 3. Exemplo de Slack Node (para erros críticos)

**Webhook URL:** `https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK`

**Message:**
```javascript
{
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "🔴 Erro Crítico no Sistema"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Fonte:*\n{{ $json.source }}"
        },
        {
          "type": "mrkdwn",
          "text": "*Prioridade:*\n{{ $json.priority }}"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Mensagem:*\n{{ $json.message }}"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Detalhes:*\n```{{ JSON.stringify($json.details) }}```"
      }
    }
  ]
}
```

---

## Workflow 3: WhatsApp via Twilio (Opcional)

### Estrutura

```
┌─────────────┐     ┌──────────┐     ┌─────────────┐
│   Webhook   │────▶│  Filter  │────▶│   Twilio    │
│             │     │ (channel)│     │  WhatsApp   │
└─────────────┘     └──────────┘     └─────────────┘
```

### Configurar Twilio Node

**Account SID:** `{{ $credentials.twilio.accountSid }}`  
**Auth Token:** `{{ $credentials.twilio.authToken }}`

**De:** `whatsapp:+14155238886` (Twilio Sandbox)  
**Para:** `whatsapp:{{ $json.client.whatsapp }}`

**Mensagem:**
```javascript
{{ $json.agency.name }}

{{ $json.event === 'content.ready_for_approval' 
   ? '📝 Novo conteúdo para aprovação'
   : $json.event === 'content.approved'
   ? '✅ Conteúdo aprovado'
   : '📢 Atualização de conteúdo'
}}

*{{ $json.payload.title }}*

{% if $json.event === 'content.ready_for_approval' %}
Acesse para aprovar: https://seudominio.com/approve/{{ $json.content_id }}
{% endif %}
```

---

## Testes e Depuração

### Testar Webhooks no N8N

1. **Ativar "Listen for Test Event"** no Webhook Node
2. **No sistema**, clicar em "Testar Webhook N8N"
3. **Verificar** se o payload foi recebido
4. **Ajustar** expressões se necessário

### Logs e Monitoramento

**Ver execuções no N8N:**
- Executions → Ver histórico
- Filtrar por status (success, error)
- Inspecionar payloads

**Troubleshooting:**

| Problema | Solução |
|----------|---------|
| Webhook não recebe | Verificar URL configurada no sistema |
| Erro 401 | Verificar token de autenticação |
| Switch não funciona | Verificar expressão do event/type |
| Email não envia | Verificar credenciais SMTP |
| WhatsApp falha | Verificar número Twilio e formato |

---

## Melhores Práticas

### 1. Tratamento de Erros

Adicionar **Error Trigger** após cada node:
```javascript
// Enviar erro para Slack
{
  "text": "❌ Erro no workflow de notificações",
  "error": "{{ $json.message }}"
}
```

### 2. Retry Logic

Configurar **Retry On Fail**:
- Max Tries: 3
- Wait Between Tries: 5 segundos
- Retry On: HTTP errors, timeouts

### 3. Rate Limiting

Adicionar **Delay Node** para evitar spam:
- Delay: 1 segundo entre emails
- Agrupar notificações similares

### 4. Logging

Adicionar **Set Node** para logs:
```javascript
{
  "log": {
    "event": "{{ $json.event }}",
    "client": "{{ $json.client.name }}",
    "timestamp": "{{ new Date().toISOString() }}",
    "success": true
  }
}
```

Depois → **HTTP Request** para seu sistema de logs

---

## Exemplos Prontos

### Template: Notificação de Aprovação por Email

```json
{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300],
      "parameters": {
        "httpMethod": "POST",
        "path": "content-notifications"
      }
    },
    {
      "name": "Switch",
      "type": "n8n-nodes-base.switch",
      "position": [450, 300],
      "parameters": {
        "rules": {
          "rules": [
            {
              "value1": "={{ $json.event }}",
              "operation": "equals",
              "value2": "content.ready_for_approval"
            }
          ]
        }
      }
    },
    {
      "name": "Email",
      "type": "n8n-nodes-base.emailSend",
      "position": [650, 200],
      "parameters": {
        "toEmail": "={{ $json.client.email }}",
        "subject": "Novo conteúdo para aprovação",
        "text": "Confira o novo conteúdo aguardando aprovação"
      }
    }
  ]
}
```

### Template: Alertas Críticos para Slack

```json
{
  "nodes": [
    {
      "name": "Webhook Interno",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300],
      "parameters": {
        "path": "d9e34937-f301-emailsinternos"
      }
    },
    {
      "name": "Filter Crítico",
      "type": "n8n-nodes-base.filter",
      "position": [450, 300],
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "value1": "={{ $json.priority }}",
              "value2": "critical"
            }
          ]
        }
      }
    },
    {
      "name": "Slack",
      "type": "n8n-nodes-base.slack",
      "position": [650, 300],
      "parameters": {
        "channel": "#alerts",
        "text": "🔴 {{ $json.subject }}"
      }
    }
  ]
}
```

---

## Recursos Adicionais

- [Documentação N8N](https://docs.n8n.io/)
- [N8N Community](https://community.n8n.io/)
- [Twilio WhatsApp](https://www.twilio.com/whatsapp)
- [Slack Webhooks](https://api.slack.com/messaging/webhooks)
