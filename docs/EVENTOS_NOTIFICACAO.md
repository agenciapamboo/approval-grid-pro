# Documentação de Eventos de Notificação

Este documento lista todos os eventos de notificação que o sistema envia para o webhook N8N, com exemplos de payload para configuração.

## 📋 Webhooks Configurados

### 1. Webhook de Notificações para Clientes (DEPRECADO)
**Status**: ⚠️ Deprecado - Substituído pelo Webhook de Agências Global
**URL**: Anteriormente configurado por agência no campo `webhook_url` (não mais utilizado)
**Método**: POST
**Eventos**: Migrados para o Webhook de Agências Global

### 2. Webhook de Agências (GLOBAL - NOVO SISTEMA)
**Status**: ✅ Ativo - Sistema Automatizado
**URL**: Configurado globalmente em `system_settings.agency_notifications_webhook_url`
**Método**: POST
**Eventos**: Todos os eventos relacionados a conteúdos e solicitações de criativo
**Trigger**: Automático via triggers de banco de dados
**Processamento**: Fila assíncrona processada a cada 5 minutos

### 3. Webhook de Emails Internos
**URL**: `https://webhook.pamboocriativos.com.br/webhook/d9e34937-f301-emailsinternos`
**Método**: POST
**Eventos**: Erros, alertas, relatórios do sistema

---

## 🎯 Eventos de Conteúdo (Webhook de Agências - Automatizados)

Todos os eventos abaixo são disparados **automaticamente** quando mudanças ocorrem na tabela `contents`. Não é necessário disparo manual.

### 1. `content.ready_for_approval`
**Trigger**: Quando status muda para `in_review`
**Descrição**: Conteúdo enviado para aprovação do cliente
**Payload**:
```json
{
  "event": "content.ready_for_approval",
  "content_id": "123e4567-e89b-12d3-a456-426614174000",
  "client_id": "789e0123-e45b-67c8-d901-234567890abc",
  "agency_id": "def45678-90ab-cdef-1234-567890abcdef",
  "content": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Post sobre produto X",
    "type": "feed",
    "status": "in_review",
    "date": "2025-11-06T14:00:00.000Z",
    "deadline": "2025-11-05T23:59:00.000Z",
    "channels": ["instagram", "facebook"],
    "category": "social"
  },
  "client": {
    "id": "789e0123-e45b-67c8-d901-234567890abc",
    "name": "Cliente ABC",
    "slug": "cliente-abc"
  },
  "agency": {
    "id": "def45678-90ab-cdef-1234-567890abcdef",
    "name": "Agência XYZ",
    "slug": "agencia-xyz"
  },
  "timestamp": "2025-11-05T10:30:00.000Z"
}
```

### 2. `content.approved`
**Trigger**: Quando status muda para `approved`
**Descrição**: Cliente aprova um conteúdo
**Payload**:
```json
{
  "event": "content.approved",
  "content_id": "123e4567-e89b-12d3-a456-426614174000",
  "client_id": "789e0123-e45b-67c8-d901-234567890abc",
  "agency_id": "def45678-90ab-cdef-1234-567890abcdef",
  "content": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Post sobre produto X",
    "type": "feed",
    "status": "approved",
    "date": "2025-11-06T14:00:00.000Z",
    "channels": ["instagram", "facebook"]
  },
  "client": {
    "id": "789e0123-e45b-67c8-d901-234567890abc",
    "name": "Cliente ABC",
    "slug": "cliente-abc"
  },
  "agency": {
    "id": "def45678-90ab-cdef-1234-567890abcdef",
    "name": "Agência XYZ",
    "slug": "agencia-xyz"
  },
  "timestamp": "2025-11-05T15:30:00.000Z"
}
```

### 3. `content.changes_requested`
**Trigger**: Quando status muda para `changes_requested`
**Descrição**: Cliente solicita ajustes no conteúdo
**Payload**:
```json
{
  "event": "content.changes_requested",
  "content_id": "123e4567-e89b-12d3-a456-426614174000",
  "client_id": "789e0123-e45b-67c8-d901-234567890abc",
  "agency_id": "def45678-90ab-cdef-1234-567890abcdef",
  "content": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Post sobre produto X",
    "type": "feed",
    "status": "changes_requested",
    "date": "2025-11-06T14:00:00.000Z",
    "channels": ["instagram"]
  },
  "client": {
    "id": "789e0123-e45b-67c8-d901-234567890abc",
    "name": "Cliente ABC",
    "slug": "cliente-abc"
  },
  "agency": {
    "id": "def45678-90ab-cdef-1234-567890abcdef",
    "name": "Agência XYZ",
    "slug": "agencia-xyz"
  },
  "timestamp": "2025-11-05T16:00:00.000Z"
}
```

### 4. `content.adjustment_completed`
**Trigger**: Quando status volta para `in_review` vindo de `changes_requested`
**Descrição**: Agência conclui ajustes solicitados
**Payload**:
```json
{
  "event": "content.adjustment_completed",
  "content_id": "123e4567-e89b-12d3-a456-426614174000",
  "client_id": "789e0123-e45b-67c8-d901-234567890abc",
  "agency_id": "def45678-90ab-cdef-1234-567890abcdef",
  "content": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Post sobre produto X",
    "type": "feed",
    "status": "in_review",
    "date": "2025-11-06T14:00:00.000Z",
    "channels": ["instagram"]
  },
  "client": {
    "id": "789e0123-e45b-67c8-d901-234567890abc",
    "name": "Cliente ABC",
    "slug": "cliente-abc"
  },
  "agency": {
    "id": "def45678-90ab-cdef-1234-567890abcdef",
    "name": "Agência XYZ",
    "slug": "agencia-xyz"
  },
  "timestamp": "2025-11-05T17:30:00.000Z"
}
```

### 5. `content.auto_approved`
**Trigger**: Quando status muda para `approved` vindo de `in_review` com deadline vencido
**Descrição**: Conteúdo auto-aprovado por vencimento do prazo
**Payload**:
```json
{
  "event": "content.auto_approved",
  "content_id": "123e4567-e89b-12d3-a456-426614174000",
  "client_id": "789e0123-e45b-67c8-d901-234567890abc",
  "agency_id": "def45678-90ab-cdef-1234-567890abcdef",
  "content": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Post sobre produto X",
    "type": "feed",
    "status": "approved",
    "date": "2025-11-06T14:00:00.000Z",
    "deadline": "2025-11-05T23:59:00.000Z",
    "channels": ["instagram"],
    "auto_approved_reason": "Prazo de aprovação vencido"
  },
  "client": {
    "id": "789e0123-e45b-67c8-d901-234567890abc",
    "name": "Cliente ABC",
    "slug": "cliente-abc"
  },
  "agency": {
    "id": "def45678-90ab-cdef-1234-567890abcdef",
    "name": "Agência XYZ",
    "slug": "agencia-xyz"
  },
  "timestamp": "2025-11-06T00:05:00.000Z"
}
```

### 6. `content.last_day_reminder`
**Trigger**: Cron job diário às 8h UTC (5h BRT) para conteúdos com deadline hoje
**Descrição**: Lembrete de último dia para aprovação
**Payload**:
```json
{
  "event": "content.last_day_reminder",
  "content_id": "123e4567-e89b-12d3-a456-426614174000",
  "client_id": "789e0123-e45b-67c8-d901-234567890abc",
  "agency_id": "def45678-90ab-cdef-1234-567890abcdef",
  "content": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Post sobre produto X",
    "type": "feed",
    "status": "in_review",
    "date": "2025-11-06T14:00:00.000Z",
    "deadline": "2025-11-05T23:59:00.000Z",
    "channels": ["instagram"]
  },
  "client": {
    "id": "789e0123-e45b-67c8-d901-234567890abc",
    "name": "Cliente ABC",
    "slug": "cliente-abc"
  },
  "agency": {
    "id": "def45678-90ab-cdef-1234-567890abcdef",
    "name": "Agência XYZ",
    "slug": "agencia-xyz"
  },
  "reminder_message": "Último dia para aprovar este conteúdo!",
  "timestamp": "2025-11-05T08:00:00.000Z"
}
```

---

## 🎨 Eventos de Solicitações de Criativo (Webhook de Agências - Automatizados)

Eventos disparados automaticamente quando mudanças ocorrem na tabela `notifications` com `event = 'novojob'`.

### 7. `creative_request.created`
**Trigger**: INSERT na tabela `notifications` com `event = 'novojob'`
**Descrição**: Nova solicitação de criativo (substitui `novojob`)
**Payload**:
```json
{
  "event": "creative_request.created",
  "content_id": "550e8400-e29b-41d4-a716-446655440006",
  "client_id": "789e0123-e45b-67c8-d901-234567890abc",
  "agency_id": "def45678-90ab-cdef-1234-567890abcdef",
  "creative_request": {
    "title": "Banner para Black Friday",
    "type": "feed",
    "text": "Preciso de um banner promocional",
    "caption": "Black Friday - Descontos de até 70%",
    "observations": "Usar as cores da marca, incluir logo",
    "reference_files": [
      {
        "url": "https://storage.supabase.co/object/public/content-media/ref1.jpg",
        "name": "referencia-1.jpg"
      }
    ],
    "requested_by": "João da Silva"
  },
  "client": {
    "id": "789e0123-e45b-67c8-d901-234567890abc",
    "name": "Cliente ABC",
    "slug": "cliente-abc"
  },
  "agency": {
    "id": "def45678-90ab-cdef-1234-567890abcdef",
    "name": "Agência XYZ",
    "slug": "agencia-xyz"
  },
  "created_at": "2025-11-05T10:00:00.000Z",
  "timestamp": "2025-11-05T10:00:00.000Z"
}
```

### 8. `creative_request.info_requested`
**Trigger**: UPDATE em `notifications.payload.job_status` para `'info_requested'`
**Descrição**: Agência solicita mais informações do cliente
**Payload**:
```json
{
  "event": "creative_request.info_requested",
  "content_id": "550e8400-e29b-41d4-a716-446655440006",
  "client_id": "789e0123-e45b-67c8-d901-234567890abc",
  "agency_id": "def45678-90ab-cdef-1234-567890abcdef",
  "creative_request": {
    "title": "Banner para Black Friday",
    "job_status": "info_requested",
    "requested_info": "Preciso das medidas exatas e paleta de cores"
  },
  "client": {
    "id": "789e0123-e45b-67c8-d901-234567890abc",
    "name": "Cliente ABC",
    "slug": "cliente-abc"
  },
  "agency": {
    "id": "def45678-90ab-cdef-1234-567890abcdef",
    "name": "Agência XYZ",
    "slug": "agencia-xyz"
  },
  "timestamp": "2025-11-05T11:00:00.000Z"
}
```

### 9. `creative_request.in_production`
**Trigger**: UPDATE em `notifications.payload.job_status` para `'in_production'`
**Descrição**: Job em produção pela agência
**Payload**:
```json
{
  "event": "creative_request.in_production",
  "content_id": "550e8400-e29b-41d4-a716-446655440006",
  "client_id": "789e0123-e45b-67c8-d901-234567890abc",
  "agency_id": "def45678-90ab-cdef-1234-567890abcdef",
  "creative_request": {
    "title": "Banner para Black Friday",
    "job_status": "in_production",
    "estimated_delivery": "2025-11-10T18:00:00.000Z"
  },
  "client": {
    "id": "789e0123-e45b-67c8-d901-234567890abc",
    "name": "Cliente ABC",
    "slug": "cliente-abc"
  },
  "agency": {
    "id": "def45678-90ab-cdef-1234-567890abcdef",
    "name": "Agência XYZ",
    "slug": "agencia-xyz"
  },
  "timestamp": "2025-11-05T14:00:00.000Z"
}
```

### 10. `creative_request.completed`
**Trigger**: UPDATE em `notifications.payload.job_status` para `'completed'`
**Descrição**: Job concluído e entregue
**Payload**:
```json
{
  "event": "creative_request.completed",
  "content_id": "550e8400-e29b-41d4-a716-446655440006",
  "client_id": "789e0123-e45b-67c8-d901-234567890abc",
  "agency_id": "def45678-90ab-cdef-1234-567890abcdef",
  "creative_request": {
    "title": "Banner para Black Friday",
    "job_status": "completed",
    "delivery_note": "Criativo entregue conforme briefing"
  },
  "client": {
    "id": "789e0123-e45b-67c8-d901-234567890abc",
    "name": "Cliente ABC",
    "slug": "cliente-abc"
  },
  "agency": {
    "id": "def45678-90ab-cdef-1234-567890abcdef",
    "name": "Agência XYZ",
    "slug": "agencia-xyz"
  },
  "timestamp": "2025-11-10T18:00:00.000Z"
}
```

---

## 📧 Eventos Internos (Emails Internos)

### 11. `orphaned_accounts_detected` (warning)
**Quando**: Job de limpeza detecta contas órfãs
**Webhook**: `https://webhook.pamboocriativos.com.br/webhook/d9e34937-f301-emailsinternos`
**Payload**: [payload original mantido]

### 12. `system_error` (error)
**Quando**: Erro crítico em qualquer edge function
**Webhook**: `https://webhook.pamboocriativos.com.br/webhook/d9e34937-f301-emailsinternos`
**Payload**: [payload original mantido]

---

## ⚙️ Configuração no N8N

### Exemplo de Workflow N8N para Eventos de Agências (NOVO)

```
[Webhook] → [Switch (por event)] → [Email/WhatsApp/CRM]
```

**Webhook Node:**
- HTTP Method: POST
- Path: `/webhook/seu-path`
- Authentication: None (ou Bearer Token)

**Switch Node:**
- Mode: Expression
- Property: `{{ $json.event }}`
- Rotas:
  - `content.ready_for_approval` → Enviar email de aprovação
  - `content.approved` → Notificar agência e CRM
  - `content.changes_requested` → Email com solicitação de ajustes
  - `content.adjustment_completed` → Notificar cliente que ajustes foram feitos
  - `content.auto_approved` → Log e notificação
  - `content.last_day_reminder` → Lembrete urgente
  - `creative_request.created` → Criar ticket no sistema da agência
  - `creative_request.info_requested` → Email solicitando mais info
  - `creative_request.in_production` → Atualizar status no CRM
  - `creative_request.completed` → Notificar conclusão

---

## 🧪 Testando Webhooks

### Via Painel Administrativo
Use o botão "Testar Webhook" no painel de Configurações do Sistema.

### Via cURL
```bash
# Testar webhook de agências
curl -X POST https://seu-webhook.n8n.cloud/webhook/seu-path \
  -H "Content-Type: application/json" \
  -d '{
    "event": "content.approved",
    "content_id": "test-123",
    "client_id": "test-client",
    "agency_id": "test-agency",
    "content": {
      "id": "test-123",
      "title": "Teste",
      "status": "approved"
    },
    "client": { "id": "test-client", "name": "Teste Cliente", "slug": "teste" },
    "agency": { "id": "test-agency", "name": "Teste Agência", "slug": "teste" },
    "timestamp": "2025-11-05T10:00:00Z"
  }'
```

---

## 🔄 Migração do Sistema Antigo

### Mudanças Importantes:
1. ✅ **Webhook Global**: Agora existe um único webhook configurado em `system_settings` para todas as agências
2. ✅ **Triggers Automáticos**: Eventos são disparados automaticamente pelo banco de dados
3. ✅ **Fila de Processamento**: Eventos são enfileirados e processados a cada 5 minutos
4. ⚠️ **Deprecação**: O campo `agencies.webhook_url` foi deprecado e não é mais utilizado
5. ⚠️ **Trigger Manual**: A função `triggerWebhook()` no frontend foi deprecada

### Status dos Eventos:
- ✅ Todos os 10 eventos estão implementados e funcionando automaticamente
- ✅ Sistema de fila garante entrega confiável
- ✅ Retry automático para falhas
- ✅ Processamento em lote para eficiência
