# Sistema de Notificações Internas

Este diretório contém utilitários compartilhados entre as Edge Functions.

## internal-notifications.ts

Sistema centralizado para enviar notificações internas por email via webhook N8N.

### Webhook Configurado

Todas as notificações internas são enviadas para:
```
https://webhook.pamboocriativos.com.br/webhook/d9e34937-f301-emailsinternos
```

### Tipos de Notificação

- **error**: Erros críticos do sistema que requerem atenção imediata
- **warning**: Alertas e avisos sobre situações anormais
- **info**: Informações gerais sobre operações do sistema
- **report**: Relatórios diários/periódicos automáticos
- **security**: Alertas de segurança (tentativas de acesso, bloqueios, etc.)

### Como Usar

#### 1. Importar as funções

```typescript
import { 
  sendInternalNotification, 
  notifyError, 
  notifyWarning, 
  notifySecurity,
  notifyReport 
} from '../_shared/internal-notifications.ts';
```

#### 2. Enviar notificações

**Notificação de Erro:**
```typescript
await notifyError(
  'nome-da-funcao',
  error,
  {
    content_id: '123',
    platform: 'instagram',
    // ... outros detalhes relevantes
  }
);
```

**Notificação de Alerta:**
```typescript
await notifyWarning(
  'nome-da-funcao',
  'Descrição do alerta',
  {
    // detalhes do alerta
  }
);
```

**Notificação de Segurança:**
```typescript
await notifySecurity(
  'IP bloqueado permanentemente',
  'IP 192.168.1.1 foi bloqueado após 10 tentativas',
  {
    ip_address: '192.168.1.1',
    attempts: 10
  }
);
```

**Relatório:**
```typescript
await notifyReport(
  'Relatório Diário',
  'Resumo das atividades',
  {
    total_contents: 150,
    published: 42,
    // ... estatísticas
  }
);
```

### Onde está Integrado

O sistema de notificações internas está atualmente integrado em:

1. **cleanup-orphaned-accounts** 
   - Notifica quando contas órfãs são detectadas
   - Prioridade: HIGH se houver falhas, MEDIUM caso contrário

2. **auto-approve-contents**
   - Notifica sobre auto-aprovações diárias
   - Notifica erros críticos no processamento
   - Prioridade: LOW para relatórios, CRITICAL para erros

3. **publish-to-social**
   - Notifica erros ao publicar em cada plataforma
   - Notifica erros críticos gerais de publicação
   - Prioridade: CRITICAL

4. **daily-report** (novo)
   - Envia relatório diário às 8h UTC
   - Estatísticas de conteúdos, usuários, notificações
   - Prioridade: LOW

### Estrutura do Payload

```typescript
{
  type: 'error' | 'warning' | 'info' | 'report' | 'security',
  subject: string,          // Assunto do email
  message: string,          // Mensagem principal
  details?: object,         // Detalhes adicionais (JSON)
  timestamp: string,        // ISO timestamp
  source: string,           // Nome da edge function
  priority: 'low' | 'medium' | 'high' | 'critical'
}
```

### Manutenção

Para adicionar notificações em novas edge functions:

1. Importe as funções helper de `internal-notifications.ts`
2. Adicione `await notifyError()` nos catch blocks
3. Adicione `await notifyWarning()` para situações anormais
4. Adicione `await notifyReport()` para relatórios automáticos

### Exemplos de Uso Real

**Erro de Publicação:**
```typescript
try {
  // publicar conteúdo
} catch (error) {
  await notifyError('publish-to-social', error, {
    content_id: contentId,
    platform: 'instagram'
  });
}
```

**Contas Órfãs Detectadas:**
```typescript
if (orphanedCount > 0) {
  await notifyWarning(
    'cleanup-orphaned-accounts',
    `${orphanedCount} contas órfãs detectadas`,
    { orphaned_accounts: orphanedList }
  );
}
```
