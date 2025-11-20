export const migrationGuideContent = `# 🚀 Instruções de Migração Completa

## ✅ Etapa 1: Backup dos Dados (ATUAL)

### 1.1 Gerar Backup SQL
A edge function \`export-database-backup\` foi criada e está pronta para uso.

**Como executar:**
\`\`\`bash
# Via curl
curl -X POST https://sgarwrreywadxsodnxng.supabase.co/functions/v1/export-database-backup \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  > backup-completo.sql
\`\`\`

Ou acesse diretamente pela interface da aplicação (se implementado um botão admin).

### 1.2 Backup do Storage
**Bucket: content-media**

\`\`\`bash
# Instalar Supabase CLI
npm install -g supabase

# Login no projeto ANTIGO
supabase login

# Link ao projeto antigo
supabase link --project-ref sgarwrreywadxsodnxng

# Download de todos os arquivos
supabase storage download content-media --recursive ./storage-backup/
\`\`\`

---

## ✅ Etapa 2: Configuração do Novo Projeto

### 2.1 Aplicar Migrations no Novo Banco

\`\`\`bash
# Link ao projeto NOVO
supabase link --project-ref dhwuvhcpqlbmqnklsgjz

# Aplicar todas as 102 migrations
supabase db push
\`\`\`

### 2.2 Configurar Secrets no Novo Projeto

Acesse: \`https://supabase.com/dashboard/project/dhwuvhcpqlbmqnklsgjz/settings/vault\`

**Secrets necessários:**
\`\`\`
SUPABASE_URL = https://dhwuvhcpqlbmqnklsgjz.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_DB_URL = postgresql://postgres:vULwg3i_1c_gsB1x@db.dhwuvhcpqlbmqnklsgjz.supabase.co:5432/postgres

# Copiar do projeto antigo:
STRIPE_SECRET_KEY = sk_...
STRIPE_WEBHOOK_SECRET = whsec_...
ADMIN_TASK_TOKEN = ...
N8N_WEBHOOK_URL = ...
N8N_WEBHOOK_TOKEN = ...
FACEBOOK_APP_ID = 1274445270923090
FACEBOOK_APP_SECRET = ...
APROVA_API_KEY = ...
LOVABLE_API_KEY = ...
\`\`\`

### 2.3 Criar Bucket de Storage

\`\`\`sql
-- Executar no SQL Editor do novo projeto
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('content-media', 'content-media', false, 104857600);
\`\`\`

---

## ✅ Etapa 3: Deploy das Edge Functions

\`\`\`bash
# Verificar se está linkado ao projeto NOVO
supabase link --project-ref dhwuvhcpqlbmqnklsgjz

# Deploy de TODAS as funções (48 funções)
for func in supabase/functions/*/; do
  func_name=$(basename "$func")
  if [ "$func_name" != "_shared" ]; then
    echo "Deploying $func_name..."
    supabase functions deploy "$func_name"
  fi
done
\`\`\`

**Lista de funções a deployar:**
- admin-change-plan
- admin-delete-user
- admin-edit-user
- alert-failed-2fa-attempts
- approval-media-urls
- approve-content
- archive-contents
- auto-approve-contents
- check-payment-notifications
- cleanup-orphaned-accounts
- collect-financial-snapshot
- create-billing-portal
- create-checkout
- create-initial-users
- create-stripe-product
- create-team-member
- daily-report
- delete-content
- exchange-facebook-token
- facebook-data-deletion
- fix-orphaned-users
- generate-approval-link
- generate-database-backup
- generate-thumbnails
- get-media-url
- get-user-emails
- list-orphaned-accounts
- list-stripe-prices
- list-stripe-products
- notify-event
- notify-ip-unblock
- publish-to-social
- reset-user-password
- send-2fa-code
- send-for-review
- send-platform-notifications
- send-webhook
- stripe-webhook
- subscription-enforcement
- sync-stripe-subscriptions
- test-2fa-webhook
- test-notification
- track-conversion
- update-docs
- validate-approval-token
- validate-client-session
- verify-2fa-code
- export-database-backup (nova)

---

## ✅ Etapa 4: Importar Dados

### 4.1 Importar SQL Backup
\`\`\`bash
# Executar o backup SQL no novo banco
psql "postgresql://postgres:vULwg3i_1c_gsB1x@db.dhwuvhcpqlbmqnklsgjz.supabase.co:5432/postgres" \\
  < backup-completo.sql
\`\`\`

### 4.2 Upload do Storage
\`\`\`bash
# Upload de todos os arquivos para o novo bucket
supabase storage upload content-media ./storage-backup/* --recursive
\`\`\`

---

## ✅ Etapa 5: Configurar Authentication

Acesse: \`https://supabase.com/dashboard/project/dhwuvhcpqlbmqnklsgjz/auth/providers\`

### 5.1 Configurar Email Auth
- ✅ Enable Email Provider
- ✅ **Enable auto-confirm email** (para desenvolvimento)
- ✅ Configurar redirect URLs:
  - \`http://localhost:5173/**\`
  - \`https://seu-dominio.com/**\`

### 5.2 Rate Limiting
- Configurar limites de tentativas de login
- Configurar IP whitelisting se necessário

---

## ✅ Etapa 6: Testes e Validação

### 6.1 Teste de Conexão
\`\`\`bash
# Verificar se a aplicação conecta ao novo banco
npm run dev
\`\`\`

### 6.2 Checklist de Testes
- [ ] Login de usuário funciona
- [ ] Criação de novo usuário funciona
- [ ] Upload de arquivo funciona
- [ ] Download de arquivo funciona
- [ ] Edge functions respondem corretamente
- [ ] Webhooks externos funcionam
- [ ] Notificações são enviadas
- [ ] RLS policies funcionam corretamente

### 6.3 Verificar Dados
\`\`\`sql
-- Contar registros em cada tabela
SELECT 
  schemaname,
  tablename,
  n_tup_ins as total_records
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_tup_ins DESC;
\`\`\`

---

## ⚠️ Problemas Conhecidos

### Usuários precisarão se re-cadastrar
A tabela \`auth.users\` não pode ser migrada diretamente. Opções:
1. **Recomendado**: Usuários se re-cadastram
2. **Alternativa**: Criar usuários manualmente via Dashboard
3. **Avançado**: Script de migração de usuários (complexo)

### Webhooks Externos
- Stripe webhook: atualizar URL em \`https://dashboard.stripe.com/webhooks\`
- N8N webhook: verificar se URL está correta
- Facebook: verificar configurações de app

### Secrets
- Todos os secrets precisam ser reconfigurados manualmente
- Não há exportação automática de secrets do Lovable Cloud

---

## 📊 Monitoramento Pós-Migração

### Logs do Supabase
\`\`\`bash
# Ver logs em tempo real
supabase functions logs export-database-backup --tail
\`\`\`

### Métricas
- Verificar uso de Storage
- Verificar uso de Database
- Verificar uso de Bandwidth
- Monitorar erros em edge functions

---

## 🆘 Rollback (Se necessário)

Se algo der errado, você pode voltar ao projeto antigo:

1. Reverter \`.env\` para valores antigos
2. Reverter \`supabase/config.toml\` para project_id antigo
3. Rebuild da aplicação

**Backup dos valores antigos:**
\`\`\`
VITE_SUPABASE_PROJECT_ID="sgarwrreywadxsodnxng"
VITE_SUPABASE_URL="https://sgarwrreywadxsodnxng.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnYXJ3cnJleXdhZHhzb2RueG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MDAxMTMsImV4cCI6MjA3NDk3NjExM30.PhZjoK6J-2zg2YGMueOfGwrxI4GkqKEmhCfJUNAjeqo"
\`\`\`

---

## ✅ Status da Migração

- [x] Edge function de backup criada
- [x] .env atualizado para novo projeto
- [x] config.toml atualizado
- [ ] Backup SQL gerado
- [ ] Migrations aplicadas no novo banco
- [ ] Secrets configurados
- [ ] Edge functions deployadas
- [ ] Dados importados
- [ ] Storage migrado
- [ ] Testes realizados
- [ ] Aplicação em produção

---

## 📞 Próximos Passos

1. **Agora**: Gerar o backup SQL usando a edge function
2. **Depois**: Aplicar migrations no novo banco
3. **Então**: Configurar secrets
4. **Finalmente**: Deploy das edge functions e importação dos dados
`;
