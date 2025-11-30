# 📋 Guia de Migração para Novo Supabase

## 🎯 Objetivo

Migrar o projeto atual (Lovable Cloud) para um novo projeto Lovable conectado a um Supabase externo (sem Lovable Cloud).

---

## 📊 Informações do Novo Supabase

```env
VITE_SUPABASE_URL=https://hdbfdzgetfkynvbqhgsd.supabase.co
VITE_SUPABASE_PROJECT_ID=hdbfdzgetfkynvbqhgsd
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_FACEBOOK_APP_ID=1274445270923090
```

---

## 🔧 Passo 1: Gerar Script SQL Consolidado

### Opção A: Usando Node.js (Recomendado)

```bash
# No diretório raiz do projeto
node generate-consolidated-migration.js
```

Isso criará o arquivo `MIGRATION_CONSOLIDADA_SUPABASE.sql` com todas as 143 migrações.

### Opção B: Usando Bash (Linux/Mac)

```bash
# Criar arquivo consolidado manualmente
cat supabase/migrations/*.sql > MIGRATION_CONSOLIDADA_SUPABASE.sql
```

---

## 🗄️ Passo 2: Aplicar Schema no Novo Supabase

1. **Abra o Supabase Dashboard:**
   - URL: https://supabase.com/dashboard/project/hdbfdzgetfkynvbqhgsd
   - Vá em: **SQL Editor** → **New Query**

2. **Cole o conteúdo de `MIGRATION_CONSOLIDADA_SUPABASE.sql`**

3. **Execute a query**
   - Clique em "Run" (pode levar 5-10 minutos)
   - Aguarde até ver "Success" no canto inferior direito

4. **Verifique se não houve erros:**
   ```sql
   -- Se houver erro, o Supabase faz rollback automático
   -- Verifique os logs de erro e corrija antes de tentar novamente
   ```

---

## 📤 Passo 3: Exportar Dados do Banco Atual

### 3.1. Gerar Backup via Interface

1. Acesse: `/admin/backups` no projeto atual
2. Clique em **"Gerar Backup"**
3. Aguarde a geração do arquivo SQL
4. Faça download do backup

### 3.2. Ou via Edge Function

```bash
curl -X POST \
  'https://sgarwrreywadxsodnxng.supabase.co/functions/v1/export-database-backup' \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI' \
  -H 'Content-Type: application/json' \
  -d '{}' \
  -o backup-dados.sql
```

---

## 💾 Passo 4: Importar Dados no Novo Supabase

1. **Abra o SQL Editor novamente**

2. **Desabilite triggers temporariamente:**
   ```sql
   SET session_replication_role = 'replica';
   ```

3. **Cole o conteúdo do arquivo de backup**
   - Todo o SQL com os INSERTs

4. **Execute**

5. **Reabilite triggers:**
   ```sql
   SET session_replication_role = 'origin';
   ```

---

## 🔐 Passo 5: Configurar Secrets no Supabase

Acesse: **Settings** → **Vault** (ou **Secrets**) e adicione:

```
STRIPE_SECRET_KEY = sk_test_... (ou sk_live_...)
STRIPE_WEBHOOK_SECRET = whsec_...
FACEBOOK_APP_SECRET = seu_app_secret
ADMIN_TASK_TOKEN = [gerar UUID único]
N8N_WEBHOOK_URL = https://... (opcional)
N8N_WEBHOOK_TOKEN = [seu token] (opcional)
OPENAI_API_KEY = sk-proj-... (opcional)
```

**Gerar UUID para ADMIN_TASK_TOKEN:**
```bash
uuidgen  # Linux/Mac
# Ou use: https://www.uuidgenerator.net/
```

---

## 🪣 Passo 6: Criar Bucket de Storage

1. **Acesse Storage no Dashboard**

2. **Create new bucket:**
   - Name: `content-media`
   - Public: ✅ Yes
   - File size limit: 50 MB
   - Allowed MIME types:
     - `image/jpeg`
     - `image/png`
     - `image/webp`
     - `image/gif`
     - `video/mp4`
     - `video/quicktime`

3. **As políticas RLS já foram criadas pelas migrações**

---

## 🚀 Passo 7: Deploy das Edge Functions

### 7.1. Instalar Supabase CLI

```bash
npm install -g supabase
```

### 7.2. Login e Link

```bash
supabase login
supabase link --project-ref hdbfdzgetfkynvbqhgsd
```

### 7.3. Deploy de TODAS as funções

```bash
supabase functions deploy --all
```

**Total de funções a serem deployadas: 58**

---

## 📦 Passo 8: Migrar Arquivos de Storage

### 8.1. Download do bucket atual

No Supabase Dashboard do projeto atual:
1. Storage → content-media
2. Download de todos os arquivos (manter estrutura de pastas)

### 8.2. Upload para o novo bucket

No novo Supabase:
1. Storage → content-media
2. Upload dos arquivos mantendo a mesma estrutura

**Estrutura esperada:**
```
content-media/
  └── media/
      └── {agency_id}/
          └── {client_id}/
              └── {content_id}/
                  └── arquivo.jpg
```

---

## 🔗 Passo 9: Criar Novo Projeto Lovable

1. **Criar projeto em [lovable.dev](https://lovable.dev)**

2. **⚠️ CRÍTICO: Desabilitar Lovable Cloud**
   - Settings → Integrations → Lovable Cloud → **Disable Cloud**

3. **Importar código do repositório GitHub**

4. **Atualizar `.env` com as novas credenciais:**
   ```env
   VITE_FACEBOOK_APP_ID="1274445270923090"
   VITE_SUPABASE_PROJECT_ID="hdbfdzgetfkynvbqhgsd"
   VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGci..."
   VITE_SUPABASE_URL="https://hdbfdzgetfkynvbqhgsd.supabase.co"
   ```

---

## ✅ Passo 10: Verificação Final

### 10.1. Testar Login

- [ ] Fazer login com: `juaumluihs@gmail.com` (super_admin)
- [ ] Fazer login com: `contato@pamboo.com.br` (agency_admin)
- [ ] Fazer login com: `faq@redeclassea.com.br` (client_user)

### 10.2. Verificar Dados

- [ ] Dashboard carrega corretamente
- [ ] Lista de clientes visível para agency_admin
- [ ] Conteúdos aparecem no ContentGrid
- [ ] Mídia é exibida corretamente (signed URLs funcionando)

### 10.3. Testar Edge Functions

```bash
# Testar generate-caption
curl -X POST \
  'https://hdbfdzgetfkynvbqhgsd.supabase.co/functions/v1/generate-caption' \
  -H 'Authorization: Bearer SEU_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"title": "teste", "objective": "engagement"}'
```

### 10.4. Verificar Logs

```sql
-- No SQL Editor, verificar se não há erros de recursão
SELECT * FROM auth.users LIMIT 5;
SELECT * FROM profiles LIMIT 5;
SELECT * FROM agencies LIMIT 5;
SELECT * FROM clients LIMIT 5;
SELECT * FROM contents LIMIT 10;
```

---

## ⚠️ Pontos Críticos de Atenção

### 🔴 Senhas de Usuários

- **Senhas NÃO são migradas** (por segurança)
- Todos os usuários devem redefinir senhas:
  - Usar "Esqueci minha senha" no login
  - Ou resetar manualmente via Supabase Dashboard

### 🔴 Configurações Externas

Após migração, atualizar:

1. **Stripe Webhooks:**
   - Dashboard Stripe → Webhooks → Editar endpoint
   - Nova URL: `https://hdbfdzgetfkynvbqhgsd.supabase.co/functions/v1/stripe-webhook`

2. **Facebook App Redirect URLs:**
   - Dashboard Facebook → Settings → OAuth Redirect URIs
   - Adicionar: `https://SEU_DOMINIO_LOVABLE/callback`

3. **N8N Webhooks (se usado):**
   - Atualizar URLs no N8N para apontarem para novas Edge Functions

---

## 📞 Suporte

Se houver erros durante a migração:

1. **Verificar logs do Supabase:**
   - Dashboard → Logs → Database
   - Dashboard → Logs → Edge Functions

2. **Verificar se todas as secrets foram configuradas**

3. **Confirmar que Lovable Cloud está DESABILITADO**

---

## 📊 Resumo dos Números

| Item | Quantidade |
|------|-----------|
| Migrações SQL | 143 |
| Edge Functions | 58 |
| Tabelas | 47+ |
| Usuários de produção | 3 |
| Conteúdos | 10+ |

---

**Boa sorte com a migração! 🚀**
