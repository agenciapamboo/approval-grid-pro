# Documentação de Testes - Sistema de Assinaturas

## Visão Geral

Este documento descreve a estratégia de testes para o sistema de assinaturas e controle de acesso do Aprova Criativos, incluindo verificações de limites, bloqueios por inadimplência, e tratamento especial para usuários internos.

## Estrutura de Testes

### 1. Testes Unitários
Localizados em `src/lib/__tests__/`

- **subscription-enforcement.test.ts**: Testa funções de verificação de status e permissões
- **plan-limits.test.ts**: Testa funções de verificação de limites de planos

### 2. Testes de Integração
Localizados em `tests/edge-functions/`

Testam as Edge Functions do Supabase:
- `subscription-enforcement`: Enforcement diário de assinaturas
- `archive-contents`: Arquivamento de conteúdos
- `create-team-member`: Criação de membros da equipe

### 3. Testes End-to-End (E2E)
Localizados em `tests/e2e/`

- **subscription-flows.spec.ts**: Testa fluxos completos do usuário

## Executando os Testes

### Pré-requisitos

```bash
# Instalar dependências
npm install
```

### Testes Unitários

```bash
# Executar todos os testes unitários
npm run test

# Executar testes em modo watch
npm run test:watch

# Executar com cobertura
npm run test:coverage

# Executar com UI do Vitest
npm run test:ui
```

### Testes E2E

```bash
# Executar testes E2E
npm run test:e2e

# Executar em modo UI (interativo)
npm run test:e2e:ui

# Executar em modo debug
npm run test:e2e:debug
```

## Cenários de Teste

### Usuários Internos (skip_subscription_check = true)

#### ✅ Deve retornar status ativo
- Usuário com `skip_subscription_check = true`
- Status deve ser `isActive = true` e `isBlocked = false`
- Mesmo com `delinquent = true` ou grace period expirado

#### ✅ Deve permitir todas as ações pro
- `canPerformProAction()` retorna `allowed = true`
- Independente de `subscription_status`

#### ✅ Deve ter acesso a todas as features
- `hasFeatureAccess()` retorna `hasAccess = true` para todas as features
- Features testadas:
  - whatsapp
  - graphics_approval
  - supplier_link
  - global_agenda
  - team_kanban
  - team_notifications

#### ✅ Não deve ser processado pelo enforcement
- Edge function `subscription-enforcement` não deve alterar esses usuários
- Queries de enforcement devem excluir `skip_subscription_check = true`

### Bloqueio por Inadimplência

#### ✅ Grace Period Ativo
- Usuário com `delinquent = true` e `grace_period_end` no futuro
- `isBlocked = false`
- `isInGracePeriod = true`
- Usuário pode criar conteúdo
- Alerta de grace period é exibido

#### ✅ Grace Period Expirado
- Usuário com `delinquent = true` e `grace_period_end` no passado
- `isBlocked = true`
- `blockReason = 'grace_period_expired'`
- Criação de conteúdo é bloqueada
- Alerta de bloqueio é exibido

#### ✅ Subscription Canceled (sem bloqueio)
- `subscription_status = 'canceled'` mas `delinquent = false`
- `isBlocked = false`
- Usuário é downgraded para 'creator' pelo enforcement

#### ✅ Subscription Unpaid (sem bloqueio)
- `subscription_status = 'unpaid'` mas `delinquent = false`
- `isBlocked = false`
- Usuário é downgraded para 'creator'

### Limites de Plano

#### ✅ Limite de Posts Mensais
- Verificar `checkMonthlyPostsLimit()`
- `withinLimit = true` antes do limite
- `withinLimit = false` no limite
- `CreativeRotationDialog` é exibido quando limite atingido

#### ✅ Limite de Criativos Arquivados
- Verificar `checkCreativesStorageLimit()`
- `withinLimit = true` antes do limite
- `withinLimit = false` no limite
- `oldestContentTitle` presente quando limite excedido
- `CreativeRotationDialog` é exibido

#### ✅ Limites Ilimitados (NULL)
- Planos com `posts_limit = null` ou `creatives_limit = null`
- `checkLimit()` retorna `withinLimit: true` sempre

### Acesso a Features

#### ✅ Creator Plan
- Todas as features devem retornar `hasAccess: false`

#### ✅ Eugência Plan
- Features habilitadas conforme `plan_entitlements`

#### ✅ Social Mídia Plan
- Features habilitadas conforme `plan_entitlements`

#### ✅ Full Service Plan
- Todas (ou maioria) features habilitadas

## Dados de Teste

### Setup Automático

Execute o script SQL em `tests/setup/test-data.sql` para criar:

- 9 usuários de teste com diferentes cenários
- Perfis correspondentes com diferentes planos
- Agency e cliente de teste
- Conteúdos de teste para validar limites

### Usuários Criados

| Email | Senha | Cenário |
|-------|-------|---------|
| internal@test.com | testpassword123 | Usuário interno (skip_subscription_check) |
| grace-period@test.com | testpassword123 | Em período de carência ativo |
| expired-grace@test.com | testpassword123 | Grace period expirado (bloqueado) |
| canceled@test.com | testpassword123 | Assinatura cancelada |
| user@test.com | testpassword123 | Usuário normal (eugencia) |
| admin@agency.com | testpassword123 | Agency admin |
| blocked-member@test.com | testpassword123 | Team member bloqueado |
| limit-test@test.com | testpassword123 | Próximo do limite de posts (49/50) |
| storage-limit@test.com | testpassword123 | No limite de storage (100/100) |

### Limpeza de Dados

```sql
-- Execute o script de limpeza no final de test-data.sql
```

## Testes Manuais

### Checklist

- [ ] Usuário interno pode criar conteúdo sem alertas
- [ ] Usuário interno não é processado pelo enforcement
- [ ] Usuário em grace period vê alerta mas pode criar
- [ ] Usuário com grace expirado vê bloqueio
- [ ] Usuário atingindo limite de posts vê dialog de rotação
- [ ] Usuário atingindo limite de criativos vê dialog
- [ ] Dialog permite arquivamento
- [ ] Arquivamento move para `content_history_logs`
- [ ] Team member bloqueado não pode acessar
- [ ] Team member vê apenas clientes de sua agência

## Monitoramento e Logs

### Edge Functions

Todas as edge functions incluem logging detalhado com `logStep()`:

```typescript
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FUNCTION-NAME] ${step}${detailsStr}`);
};
```

### Verificar Logs

```bash
# Via Supabase CLI
supabase functions logs subscription-enforcement

# Via dashboard (se disponível)
# Navegue até Functions > subscription-enforcement > Logs
```

## Troubleshooting

### Testes Falhando

1. **Erro de autenticação nos testes**
   - Verifique se `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` estão configurados
   - Verifique se o setup mock está correto em `src/test/setup.ts`

2. **Testes E2E timeout**
   - Verifique se a aplicação está rodando em `http://localhost:8080`
   - Aumente o timeout no `playwright.config.ts` se necessário

3. **Dados de teste não encontrados**
   - Execute o script `tests/setup/test-data.sql` no banco de dados de teste
   - Verifique se os IDs dos usuários estão corretos

### Edge Functions não processando corretamente

1. **Usuários internos sendo processados**
   - Verifique query SQL para garantir `eq('skip_subscription_check', false)`
   - Confira logs da edge function

2. **Grace period não funcionando**
   - Verifique formato de data: deve ser ISO string
   - Confira timezone do servidor vs. timezone do teste

## Cobertura de Código

Meta de cobertura: **80%+** para código crítico

```bash
# Gerar relatório de cobertura
npm run test:coverage

# Abrir relatório HTML
open coverage/index.html
```

### Áreas Críticas (devem ter 100% cobertura)

- `src/lib/subscription-enforcement.ts`
- `src/lib/plan-limits.ts`
- `supabase/functions/subscription-enforcement/index.ts`

## CI/CD

### GitHub Actions (exemplo)

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - run: npx playwright install
      - run: npm run test:e2e
```

## Próximos Passos

- [ ] Adicionar testes de integração para edge functions
- [ ] Implementar testes de carga para verificar performance
- [ ] Adicionar testes de acessibilidade
- [ ] Configurar testes de regressão visual
- [ ] Implementar testes de segurança automatizados

## Referências

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)
- [React Testing Library](https://testing-library.com/react)
