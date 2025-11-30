# ⚡ EXECUTAR PRIMEIRO - Gerar Script SQL Consolidado

## 🎯 Objetivo

Gerar um único arquivo SQL com todas as 143 migrações para aplicar no novo Supabase.

---

## 🚀 Passo 1: Executar o Script Gerador

### No terminal, na raiz do projeto:

```bash
node generate-consolidated-migration.js
```

### Resultado esperado:

```
🔄 Consolidando migrações SQL...

📁 Encontrados 143 arquivos de migração

  1/143 - 20250125000000_add_api_key_functions.sql
  2/143 - 20250125000001_fix_ai_templates_rls.sql
  3/143 - 20251004000553_76b6371c-21a5-4175-a584-869efd5de32e.sql
  ...
  143/143 - 20251129150231_ca5148ff-7357-4bb1-9904-affc28328017.sql

✅ Arquivo consolidado gerado com sucesso!

📄 Arquivo: ./MIGRATION_CONSOLIDADA_SUPABASE.sql
📊 Total de migrações: 143
💾 Tamanho: ~850 KB

🚀 Próximos passos:
   1. Abra o arquivo MIGRATION_CONSOLIDADA_SUPABASE.sql
   2. Copie todo o conteúdo
   3. Cole no SQL Editor do novo Supabase
   4. Execute e aguarde a conclusão
```

---

## 📋 Passo 2: Aplicar no Novo Supabase

### 2.1. Acesse o Supabase Dashboard

```
https://supabase.com/dashboard/project/hdbfdzgetfkynvbqhgsd
```

### 2.2. Abra o SQL Editor

Dashboard → **SQL Editor** → **New Query**

### 2.3. Cole o Conteúdo

1. Abra o arquivo gerado: `MIGRATION_CONSOLIDADA_SUPABASE.sql`
2. Selecione TODO o conteúdo (Ctrl+A ou Cmd+A)
3. Copie (Ctrl+C ou Cmd+C)
4. Cole no SQL Editor do Supabase (Ctrl+V ou Cmd+V)

### 2.4. Execute

1. Clique no botão **"Run"** (canto inferior direito)
2. ⏳ Aguarde (pode levar 5-10 minutos para executar todas as 143 migrações)
3. ✅ Verifique se apareceu "Success" sem erros

---

## ⚠️ Se Houver Erro

### Erro comum: "relation already exists"

**Solução:**
- Significa que já existe alguma tabela/função no banco
- Limpe o banco completamente antes de executar:

```sql
-- Cole isto ANTES do script consolidado para limpar tudo:
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

### Erro: "permission denied"

**Solução:**
- Verifique se está logado como admin no Supabase
- Use a conexão "postgres" no SQL Editor

---

## 📊 O Que Será Criado

Após executar o script consolidado, você terá:

### ✅ Tabelas (47+)
- `agencies` - Agências
- `clients` - Clientes
- `profiles` - Perfis de usuários
- `contents` - Conteúdos
- `content_media` - Mídias
- `content_texts` - Legendas/textos
- `comments` - Comentários
- `ai_configurations` - Configurações de IA
- `ai_text_templates` - Templates de IA
- `client_ai_profiles` - Perfis IA dos clientes
- `briefing_templates` - Templates de briefing
- E mais 35+ tabelas...

### ✅ Funções SQL (30+)
- `get_user_agency_id()`
- `get_user_client_id()`
- `has_role()`
- `encrypt_api_key()`
- `decrypt_api_key()`
- E mais 25+ funções...

### ✅ Políticas RLS (200+)
- Todas as regras de acesso por role
- Proteção de dados por agência/cliente
- Segurança de storage

### ✅ Triggers (15+)
- Auto-atualização de timestamps
- Validações automáticas
- Notificações de eventos

### ✅ Índices (50+)
- Otimizações de performance

---

## 🔄 Próximos Passos

Após executar o script SQL consolidado:

1. ✅ Schema aplicado
2. ⏭️ **Exportar dados** do banco atual (ver README_MIGRACAO.md)
3. ⏭️ **Importar dados** no novo Supabase
4. ⏭️ **Configurar secrets**
5. ⏭️ **Deploy Edge Functions**
6. ⏭️ **Migrar arquivos de storage**
7. ⏭️ **Criar projeto Lovable novo**
8. ⏭️ **Testar tudo**

**Leia o arquivo completo:** `README_MIGRACAO.md`

---

## 📞 Dúvidas?

- O script `generate-consolidated-migration.js` lê todos os arquivos `.sql` da pasta `supabase/migrations`
- Ordena automaticamente por timestamp (que está no nome do arquivo)
- Cria um arquivo único com BEGIN/COMMIT para garantir atomicidade
- O arquivo gerado tem ~850 KB (normal para 143 migrações)

---

**Pronto para começar? Execute o comando acima! 🚀**

```bash
node generate-consolidated-migration.js
```
