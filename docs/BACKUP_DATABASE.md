# Backup do Banco de Dados

## Visão Geral

Este documento descreve como fazer backup completo do banco de dados, incluindo todas as tabelas, usuários e configurações.

## Método 1: Edge Function Automática (Recomendado)

A edge function `generate-database-backup` gera automaticamente um arquivo SQL com backup de todas as tabelas.

### Como usar:

1. **Via código (React/TypeScript):**

```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-database-backup`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabase.auth.session()?.access_token}`,
    },
  }
);

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `database-backup-${new Date().toISOString().split('T')[0]}.sql`;
a.click();
```

2. **Via curl:**

```bash
curl -X POST \
  "https://sgarwrreywadxsodnxng.supabase.co/functions/v1/generate-database-backup" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output database-backup.sql
```

## Método 2: Backup Manual via SQL

### 1. Exportar Dados das Tabelas

Execute o seguinte SQL para gerar INSERTs de todas as tabelas:

```sql
-- Para cada tabela, execute:
COPY (SELECT * FROM public.table_name) TO '/tmp/table_name.csv' WITH CSV HEADER;
```

### 2. Backup de Usuários (auth.users)

⚠️ **Atenção:** A tabela `auth.users` não pode ser exportada diretamente via SQL por questões de segurança.

**Opções:**
- Use o Supabase Dashboard > Authentication > Users para exportar via interface
- Use a API de gerenciamento do Supabase
- Os dados de perfil dos usuários estão na tabela `public.profiles`

### 3. Backup de Secrets

🔒 **Secrets não podem ser exportados** por questões de segurança.

**Lista de secrets configurados:**
- `N8N_WEBHOOK_TOKEN`
- `N8N_WEBHOOK_URL`
- `APROVA_API_KEY`
- `ADMIN_TASK_TOKEN`
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `LOVABLE_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_DB_URL`
- `SUPABASE_PUBLISHABLE_KEY`

**Recomendação:** Mantenha uma cópia segura desses valores em um gerenciador de senhas.

### 4. Backup de Storage (Arquivos)

O bucket `content-media` contém arquivos de mídia que devem ser backupeados separadamente:

```typescript
// Listar todos os arquivos
const { data: files } = await supabase.storage.from('content-media').list();

// Baixar cada arquivo
for (const file of files) {
  const { data } = await supabase.storage
    .from('content-media')
    .download(file.name);
  // Salvar localmente
}
```

## Método 3: Backup Completo via pg_dump

Se você tiver acesso direto ao PostgreSQL:

```bash
# Backup completo (estrutura + dados)
pg_dump -h db.sgarwrreywadxsodnxng.supabase.co \
  -U postgres \
  -d postgres \
  -F c \
  -f backup-completo-$(date +%Y%m%d).dump

# Backup apenas da estrutura
pg_dump -h db.sgarwrreywadxsodnxng.supabase.co \
  -U postgres \
  -d postgres \
  --schema-only \
  -f backup-estrutura-$(date +%Y%m%d).sql

# Backup apenas dos dados
pg_dump -h db.sgarwrreywadxsodnxng.supabase.co \
  -U postgres \
  -d postgres \
  --data-only \
  -f backup-dados-$(date +%Y%m%d).sql
```

## Restauração

### Restaurar do arquivo SQL gerado:

```bash
psql -h db.sgarwrreywadxsodnxng.supabase.co \
  -U postgres \
  -d postgres \
  -f database-backup-YYYY-MM-DD.sql
```

### Restaurar do pg_dump:

```bash
pg_restore -h db.sgarwrreywadxsodnxng.supabase.co \
  -U postgres \
  -d postgres \
  -c \
  backup-completo-YYYYMMDD.dump
```

## Tabelas Incluídas no Backup

### Tabelas Principais:
- `profiles` - Perfis de usuários
- `agencies` - Agências
- `clients` - Clientes
- `contents` - Conteúdos
- `content_media` - Mídias dos conteúdos
- `content_texts` - Textos dos conteúdos
- `content_history` - Histórico de conteúdos
- `comments` - Comentários

### Tabelas de Autenticação e Segurança:
- `user_roles` - Roles dos usuários
- `role_permissions` - Permissões por role
- `client_approvers` - Aprovadores de clientes
- `client_sessions` - Sessões de clientes
- `two_factor_codes` - Códigos 2FA
- `token_validation_attempts` - Tentativas de validação
- `trusted_ips` - IPs confiáveis
- `security_alerts_sent` - Alertas de segurança

### Tabelas de Notificações:
- `notifications` - Notificações gerais
- `platform_notifications` - Notificações da plataforma

### Tabelas de Configuração:
- `plan_entitlements` - Permissões por plano
- `plan_permissions` - Configurações de planos
- `system_settings` - Configurações do sistema
- `lovable_plan_config` - Configuração do plano Lovable
- `kanban_columns` - Colunas do Kanban

### Tabelas Financeiras:
- `financial_snapshots` - Snapshots financeiros
- `revenue_taxes` - Impostos sobre receita
- `operational_costs` - Custos operacionais

### Outras Tabelas:
- `support_tickets` - Tickets de suporte
- `ticket_messages` - Mensagens dos tickets
- `activity_log` - Log de atividades
- `webhooks` - Webhooks configurados
- `tracking_pixels` - Pixels de rastreamento
- `conversion_events` - Eventos de conversão
- `creative_requests` - Solicitações criativas
- `user_preferences` - Preferências de usuários
- `consents` - Consentimentos LGPD
- `lgpd_pages` - Páginas LGPD

## Frequência Recomendada

- **Diário:** Backup automático das tabelas principais
- **Semanal:** Backup completo incluindo storage
- **Mensal:** Backup completo arquivado para long-term storage

## Segurança

⚠️ **IMPORTANTE:**

1. **NUNCA** commite arquivos de backup no Git
2. Armazene backups em local seguro e criptografado
3. Backups contêm dados sensíveis (emails, tokens criptografados, etc.)
4. Teste restauração periodicamente
5. Mantenha backups em múltiplas localizações

## Automação

Configure um cron job para executar backups automáticos:

```bash
# Adicione ao crontab
0 2 * * * /path/to/backup-script.sh
```

Ou use GitHub Actions com workflow agendado (certifique-se de usar secrets para credenciais).
