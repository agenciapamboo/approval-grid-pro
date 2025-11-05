# Documentação de Eventos de Notificação

Este documento lista todos os eventos de notificação que o sistema envia para o webhook N8N, com exemplos de payload para configuração.

## Webhooks Configurados

### 1. Webhook de Notificações para Clientes
**URL**: Configurado por agência no campo `webhook_url`
**Método**: POST
**Eventos**: Relacionados a conteúdos e aprovações

### 2. Webhook de Emails Internos
**URL**: `https://webhook.pamboocriativos.com.br/webhook/d9e34937-f301-emailsinternos`
**Método**: POST
**Eventos**: Erros, alertas, relatórios do sistema

---

## Eventos de Conteúdo (Cliente)

### 1. `content.ready_for_approval`
**Quando**: Quando um conteúdo é enviado para aprovação do cliente
**Payload**:
```json
{
  "notification_id": "550e8400-e29b-41d4-a716-446655440000",
  "event": "content.ready_for_approval",
  "channel": "email",
  "content_id": "123e4567-e89b-12d3-a456-426614174000",
  "client_id": "789e0123-e45b-67c8-d901-234567890abc",
  "agency_id": "def45678-90ab-cdef-1234-567890abcdef",
  "user_id": "987e6543-210f-edcb-a987-654321fedcba",
  "payload": {
    "title": "Post sobre produto X",
    "date": "2025-11-06T14:00:00.000Z",
    "deadline": "2025-11-05T23:59:00.000Z",
    "type": "feed",
    "status": "in_review",
    "channels": ["instagram", "facebook"],
    "category": "social"
  },
  "created_at": "2025-11-05T10:30:00.000Z",
  "agency": {
    "name": "Agência XYZ",
    "email": "contato@agencia.com",
    "whatsapp": "+5511999999999"
  },
  "client": {
    "name": "Cliente ABC",
    "email": "cliente@empresa.com",
    "whatsapp": "+5511888888888"
  }
}
```

### 2. `content.approved`
**Quando**: Quando o cliente aprova um conteúdo
**Payload**:
```json
{
  "notification_id": "550e8400-e29b-41d4-a716-446655440001",
  "event": "content.approved",
  "channel": "webhook",
  "content_id": "123e4567-e89b-12d3-a456-426614174000",
  "client_id": "789e0123-e45b-67c8-d901-234567890abc",
  "agency_id": "def45678-90ab-cdef-1234-567890abcdef",
  "user_id": "987e6543-210f-edcb-a987-654321fedcba",
  "payload": {
    "title": "Post sobre produto X",
    "date": "2025-11-06T14:00:00.000Z",
    "type": "feed",
    "status": "approved",
    "channels": ["instagram", "facebook"],
    "approved_at": "2025-11-05T15:30:00.000Z",
    "approved_by": "João da Silva"
  },
  "created_at": "2025-11-05T15:30:00.000Z",
  "agency": {
    "name": "Agência XYZ",
    "email": "contato@agencia.com",
    "whatsapp": "+5511999999999"
  },
  "client": {
    "name": "Cliente ABC",
    "email": "cliente@empresa.com",
    "whatsapp": "+5511888888888"
  }
}
```

### 3. `content.rejected`
**Quando**: Quando o cliente rejeita um conteúdo ou solicita ajustes
**Payload**:
```json
{
  "notification_id": "550e8400-e29b-41d4-a716-446655440002",
  "event": "content.rejected",
  "channel": "email",
  "content_id": "123e4567-e89b-12d3-a456-426614174000",
  "client_id": "789e0123-e45b-67c8-d901-234567890abc",
  "agency_id": "def45678-90ab-cdef-1234-567890abcdef",
  "user_id": "987e6543-210f-edcb-a987-654321fedcba",
  "payload": {
    "title": "Post sobre produto X",
    "date": "2025-11-06T14:00:00.000Z",
    "type": "feed",
    "status": "changes_requested",
    "channels": ["instagram"],
    "rejection_reason": "Precisa ajustar a cor do logo e mudar o texto do CTA",
    "rejected_by": "Maria Santos"
  },
  "created_at": "2025-11-05T16:00:00.000Z",
  "agency": {
    "name": "Agência XYZ",
    "email": "contato@agencia.com",
    "whatsapp": "+5511999999999"
  },
  "client": {
    "name": "Cliente ABC",
    "email": "cliente@empresa.com",
    "whatsapp": "+5511888888888"
  }
}
```

### 4. `content.adjustment_completed`
**Quando**: Quando a agência conclui os ajustes solicitados
**Payload**:
```json
{
  "notification_id": "550e8400-e29b-41d4-a716-446655440003",
  "event": "content.adjustment_completed",
  "channel": "whatsapp",
  "content_id": "123e4567-e89b-12d3-a456-426614174000",
  "client_id": "789e0123-e45b-67c8-d901-234567890abc",
  "agency_id": "def45678-90ab-cdef-1234-567890abcdef",
  "user_id": "987e6543-210f-edcb-a987-654321fedcba",
  "payload": {
    "title": "Post sobre produto X",
    "date": "2025-11-06T14:00:00.000Z",
    "type": "feed",
    "status": "in_review",
    "channels": ["instagram"],
    "adjustment_note": "Ajustes realizados conforme solicitado"
  },
  "created_at": "2025-11-05T17:30:00.000Z",
  "agency": {
    "name": "Agência XYZ",
    "email": "contato@agencia.com",
    "whatsapp": "+5511999999999"
  },
  "client": {
    "name": "Cliente ABC",
    "email": "cliente@empresa.com",
    "whatsapp": "+5511888888888"
  }
}
```

### 5. `content.auto_approved`
**Quando**: Quando um conteúdo é auto-aprovado por vencimento do prazo
**Payload**:
```json
{
  "notification_id": "550e8400-e29b-41d4-a716-446655440004",
  "event": "content.auto_approved",
  "channel": "email",
  "content_id": "123e4567-e89b-12d3-a456-426614174000",
  "client_id": "789e0123-e45b-67c8-d901-234567890abc",
  "agency_id": "def45678-90ab-cdef-1234-567890abcdef",
  "payload": {
    "title": "Post sobre produto X",
    "date": "2025-11-06T14:00:00.000Z",
    "deadline": "2025-11-05T23:59:00.000Z",
    "type": "feed",
    "status": "approved",
    "channels": ["instagram"],
    "auto_approved_reason": "Prazo de aprovação vencido"
  },
  "created_at": "2025-11-06T00:05:00.000Z",
  "agency": {
    "name": "Agência XYZ",
    "email": "contato@agencia.com",
    "whatsapp": "+5511999999999"
  },
  "client": {
    "name": "Cliente ABC",
    "email": "cliente@empresa.com",
    "whatsapp": "+5511888888888"
  }
}
```

### 6. `content.last_day_reminder`
**Quando**: Lembrete enviado no dia do deadline
**Payload**:
```json
{
  "notification_id": "550e8400-e29b-41d4-a716-446655440005",
  "event": "content.last_day_reminder",
  "channel": "email",
  "content_id": "123e4567-e89b-12d3-a456-426614174000",
  "client_id": "789e0123-e45b-67c8-d901-234567890abc",
  "agency_id": "def45678-90ab-cdef-1234-567890abcdef",
  "payload": {
    "title": "Post sobre produto X",
    "date": "2025-11-06T14:00:00.000Z",
    "deadline": "2025-11-05T23:59:00.000Z",
    "type": "feed",
    "status": "in_review",
    "channels": ["instagram"],
    "reminder_message": "Último dia para aprovar este conteúdo!"
  },
  "created_at": "2025-11-05T08:00:00.000Z",
  "agency": {
    "name": "Agência XYZ",
    "email": "contato@agencia.com",
    "whatsapp": "+5511999999999"
  },
  "client": {
    "name": "Cliente ABC",
    "email": "cliente@empresa.com",
    "whatsapp": "+5511888888888"
  }
}
```

### 7. `novojob`
**Quando**: Quando o cliente solicita um novo criativo
**Payload**:
```json
{
  "notification_id": "550e8400-e29b-41d4-a716-446655440006",
  "event": "novojob",
  "channel": "email",
  "content_id": null,
  "client_id": "789e0123-e45b-67c8-d901-234567890abc",
  "agency_id": "def45678-90ab-cdef-1234-567890abcdef",
  "user_id": "987e6543-210f-edcb-a987-654321fedcba",
  "payload": {
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
    "requested_by": "João da Silva",
    "requested_at": "2025-11-05T10:00:00.000Z"
  },
  "created_at": "2025-11-05T10:00:00.000Z",
  "agency": {
    "name": "Agência XYZ",
    "email": "contato@agencia.com",
    "whatsapp": "+5511999999999"
  },
  "client": {
    "name": "Cliente ABC",
    "email": "cliente@empresa.com",
    "whatsapp": "+5511888888888"
  }
}
```

---

## Eventos Internos (Emails Internos)

### 8. `orphaned_accounts_detected` (warning)
**Quando**: Job de limpeza detecta contas órfãs
**Webhook**: `https://webhook.pamboocriativos.com.br/webhook/d9e34937-f301-emailsinternos`
**Payload**:
```json
{
  "type": "warning",
  "subject": "5 conta(s) órfã(s) detectada(s)",
  "message": "Job de limpeza encontrou 5 contas sem perfil. 4 foram corrigidas automaticamente.",
  "details": {
    "total_users": 150,
    "orphaned_found": 5,
    "fixed": 4,
    "failed": 1,
    "fixed_accounts": [
      {
        "user_id": "abc123...",
        "email": "user@example.com",
        "account_type": "creator"
      }
    ],
    "failed_accounts": [
      {
        "user_id": "def456...",
        "email": "problem@example.com",
        "error": "Metadata inválida"
      }
    ]
  },
  "source": "cleanup-orphaned-accounts",
  "priority": "high",
  "timestamp": "2025-11-05T03:00:00.000Z"
}
```

### 9. `system_error` (error)
**Quando**: Erro crítico em qualquer edge function
**Webhook**: `https://webhook.pamboocriativos.com.br/webhook/d9e34937-f301-emailsinternos`
**Payload**:
```json
{
  "type": "error",
  "subject": "Erro crítico em publish-to-social",
  "message": "Failed to publish content: Network timeout",
  "details": {
    "content_id": "123e4567-e89b-12d3-a456-426614174000",
    "platform": "instagram",
    "account": "cliente_instagram",
    "content_type": "reels",
    "stack": "Error: Network timeout\n  at publishToInstagram..."
  },
  "source": "publish-to-social",
  "priority": "critical",
  "timestamp": "2025-11-05T14:30:00.000Z"
}
```

### 10. `auto_approval_report` (info)
**Quando**: Relatório de auto-aprovações diárias
**Webhook**: `https://webhook.pamboocriativos.com.br/webhook/d9e34937-f301-emailsinternos`
**Payload**:
```json
{
  "type": "info",
  "subject": "15 conteúdo(s) auto-aprovado(s)",
  "message": "Job automático aprovou 15 de 18 conteúdos com deadline vencido.",
  "details": {
    "approved": 15,
    "total_expired": 18,
    "date": "2025-11-05"
  },
  "source": "auto-approve-contents",
  "priority": "low",
  "timestamp": "2025-11-05T00:05:00.000Z"
}
```

### 11. `daily_system_report` (report)
**Quando**: Relatório diário às 8h UTC (5h BRT)
**Webhook**: `https://webhook.pamboocriativos.com.br/webhook/d9e34937-f301-emailsinternos`
**Payload**:
```json
{
  "type": "report",
  "subject": "Relatório Diário do Sistema",
  "message": "Resumo das atividades do dia 2025-11-04",
  "details": {
    "date": "2025-11-04",
    "contents": {
      "total_created": 45,
      "by_status": {
        "draft": 12,
        "in_review": 18,
        "approved": 15
      },
      "published": 23
    },
    "users": {
      "total": 150
    },
    "notifications": {
      "total": 87,
      "by_status": {
        "pending": 5,
        "sent": 80,
        "failed": 2
      }
    },
    "activity": {
      "total_actions": 234
    }
  },
  "source": "daily-report",
  "priority": "low",
  "timestamp": "2025-11-05T08:00:00.000Z"
}
```

### 12. `ip_unblocked` (security)
**Quando**: Administrador desbloqueia um IP
**Webhook**: `https://webhook.pamboocriativos.com.br/webhook/d9e34937-f301-emailsinternos`
**Payload**:
```json
{
  "type": "security",
  "subject": "IP desbloqueado manualmente",
  "message": "IP 192.168.1.100 foi desbloqueado pelo administrador admin@agencia.com",
  "details": {
    "ip_address": "192.168.1.100",
    "unblocked_by": "admin@agencia.com",
    "affected_count": 3,
    "unblocked_at": "2025-11-05T16:00:00.000Z"
  },
  "source": "notify-ip-unblock",
  "priority": "critical",
  "timestamp": "2025-11-05T16:00:00.000Z"
}
```

---

## Campos Comuns

Todos os eventos de notificação para clientes contêm:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `notification_id` | UUID | ID único da notificação |
| `event` | string | Nome do evento |
| `channel` | string | Canal de envio (email, whatsapp, webhook) |
| `content_id` | UUID | ID do conteúdo (quando aplicável) |
| `client_id` | UUID | ID do cliente |
| `agency_id` | UUID | ID da agência |
| `user_id` | UUID | ID do usuário que disparou a ação |
| `payload` | object | Dados específicos do evento |
| `created_at` | timestamp | Data/hora de criação |
| `agency` | object | Dados da agência |
| `client` | object | Dados do cliente |

Todos os eventos internos contêm:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `type` | string | Tipo: error, warning, info, report, security |
| `subject` | string | Assunto do email |
| `message` | string | Mensagem principal |
| `details` | object | Detalhes adicionais |
| `source` | string | Edge function de origem |
| `priority` | string | low, medium, high, critical |
| `timestamp` | timestamp | Data/hora do evento |

---

## Configuração no N8N

### Exemplo de Workflow N8N para Eventos de Cliente

```
[Webhook] → [Switch (por event)] → [Email/WhatsApp/Outros]
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
  - `content.approved` → Notificar agência
  - `content.rejected` → Enviar email com motivo
  - `novojob` → Criar ticket no sistema da agência

### Exemplo de Workflow N8N para Emails Internos

```
[Webhook] → [Switch (por type/priority)] → [Email Admin] → [Slack/Discord]
```

**Switch por Prioridade:**
- `critical` → Email + Slack urgente
- `high` → Email imediato
- `medium` → Email consolidado
- `low` → Relatório diário

---

## Testando Webhooks

Use o botão "Testar Webhook N8N" no dashboard administrativo ou chame:

```bash
# Evento de teste
curl -X POST https://webhook.pamboocriativos.com.br/webhook/seu-path \
  -H "Content-Type: application/json" \
  -d '{
    "notification_id": "test-123",
    "event": "content.approved",
    "channel": "email",
    "content_id": "test-content",
    "client_id": "test-client",
    "payload": {
      "title": "Teste"
    }
  }'
```
