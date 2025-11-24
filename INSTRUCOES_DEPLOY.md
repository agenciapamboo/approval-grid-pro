# 🚀 Instruções de Deploy - Correções do Sistema de IA

## ✅ Correções Aplicadas com Sucesso

### 🔧 Problema Corrigido
**Agency Admin** recebia erro "Erro ao gerar perfil" ao usar formulário de briefing com IA.

---

## 📦 Arquivos Prontos para Deploy

### 1. Migrações SQL (3 arquivos) ✅
```
✅ supabase/migrations/20251124030000_fix_ai_decrypt_functions.sql
   └─ Funções de criptografia/descriptografia de API keys

✅ supabase/migrations/20251124030001_fix_ai_templates_global_access.sql
   └─ Acesso a templates globais para agency_admin

✅ supabase/migrations/20251124050000_fix_briefing_client_profiles.sql
   └─ Estrutura da tabela + permissões de ai_configurations
```

### 2. Função Edge Atualizada ✅
```
✅ supabase/functions/generate-client-profile/index.ts
   └─ Mapeamento correto de campos
   └─ Fallbacks para arrays
   └─ Upsert com constraint correto
```

### 3. Documentação Criada ✅
```
✅ RELATORIO_AUDITORIA_IA.md (Auditoria completa do sistema)
✅ RESUMO_CORRECOES_IA.md (Correções de templates e criptografia)
✅ RESUMO_CORRECAO_BRIEFING.md (Correção específica do briefing)
✅ RESUMO_CORRECOES_COMPLETO.md (Visão geral de todas as correções)
✅ INSTRUCOES_DEPLOY.md (Este arquivo)
```

---

## 🎯 Passo a Passo para Deploy

### Etapa 1: Revisar Migrações
```bash
# Revisar cada migração antes de aplicar
cat supabase/migrations/20251124030000_fix_ai_decrypt_functions.sql
cat supabase/migrations/20251124030001_fix_ai_templates_global_access.sql
cat supabase/migrations/20251124050000_fix_briefing_client_profiles.sql
```

### Etapa 2: Aplicar Migrações no Supabase
```bash
# Opção 1: Via CLI (recomendado)
supabase db push

# Opção 2: Via Dashboard
# 1. Acesse: https://supabase.com/dashboard
# 2. Selecione seu projeto
# 3. Vá em: SQL Editor
# 4. Copie e execute cada arquivo .sql na ordem
```

### Etapa 3: Deploy da Função Edge
```bash
# Deploy da função atualizada
supabase functions deploy generate-client-profile

# Verificar se o deploy foi bem-sucedido
supabase functions list
```

### Etapa 4: Verificar Permissões
```sql
-- Execute no SQL Editor do Supabase

-- 1. Verificar se agency_admin pode ler ai_configurations
SELECT 
  tablename, 
  policyname 
FROM pg_policies 
WHERE tablename = 'ai_configurations';

-- 2. Verificar constraint da tabela client_ai_profiles
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'client_ai_profiles'::regclass
  AND contype = 'u'; -- UNIQUE constraints

-- Resultado esperado: client_ai_profiles_client_id_key
```

### Etapa 5: Testar a Funcionalidade

#### 5.1 Login como Agency Admin
```
1. Acesse a aplicação
2. Faça login com conta agency_admin
```

#### 5.2 Testar Geração de Perfil
```
1. Navegue até a seção de clientes
2. Selecione um cliente ou crie um novo
3. Acesse o formulário de briefing
4. Preencha todos os campos obrigatórios
5. Clique em "Gerar Perfil com IA"
6. ✅ Deve exibir: "Perfil gerado! (X tokens)" ou "Perfil gerado (cache)! ✨"
```

#### 5.3 Verificar Dados Salvos
```sql
-- No SQL Editor do Supabase
SELECT 
  id,
  client_id,
  profile_summary,
  editorial_line,
  content_pillars,
  tone_of_voice,
  keywords,
  created_at
FROM client_ai_profiles
ORDER BY created_at DESC
LIMIT 5;
```

---

## ✅ Checklist de Validação

### Antes do Deploy
- [x] Todas as migrações revisadas
- [x] Função Edge atualizada e revisada
- [x] Documentação criada

### Durante o Deploy
- [ ] Migrações aplicadas sem erro
- [ ] Função Edge deployed com sucesso
- [ ] Logs não mostram erros críticos

### Após o Deploy
- [ ] Agency Admin consegue acessar configurações de IA
- [ ] Agency Admin consegue ver templates globais
- [ ] Formulário de briefing funciona sem erros
- [ ] Perfil é gerado e salvo corretamente
- [ ] Logs de uso são registrados
- [ ] Cache está funcionando (segundo teste reutiliza cache)

---

## 🐛 Problemas Comuns e Soluções

### Problema 1: "OpenAI API key not configured"
**Causa**: Configuração de IA não existe ou agency_admin não tem permissão

**Solução**:
```sql
-- Verificar se existe configuração
SELECT * FROM ai_configurations;

-- Se não existir, criar uma (como super_admin)
INSERT INTO ai_configurations (
  openai_api_key_encrypted,
  default_model
) VALUES (
  encrypt_api_key('sk-...'), -- Sua API key da OpenAI
  'gpt-4o-mini'
);

-- Verificar permissões
SELECT * FROM pg_policies WHERE tablename = 'ai_configurations';
```

### Problema 2: "Template not found"
**Causa**: Template não existe ou está inativo

**Solução**:
```sql
-- Verificar templates ativos
SELECT id, name, is_active FROM briefing_templates;

-- Ativar template se necessário (como super_admin)
UPDATE briefing_templates 
SET is_active = true 
WHERE id = 'uuid-do-template';
```

### Problema 3: Erro de Constraint ao Salvar
**Causa**: Constraint UNIQUE ainda não foi corrigido

**Solução**:
```sql
-- Verificar constraints
SELECT conname FROM pg_constraint 
WHERE conrelid = 'client_ai_profiles'::regclass;

-- Se ainda tiver client_id_created_at_key, executar:
ALTER TABLE client_ai_profiles 
DROP CONSTRAINT client_ai_profiles_client_id_created_at_key;

ALTER TABLE client_ai_profiles 
ADD CONSTRAINT client_ai_profiles_client_id_key UNIQUE (client_id);
```

### Problema 4: Erro de Permissão RLS
**Causa**: Políticas RLS não foram criadas corretamente

**Solução**:
```sql
-- Recriar política para agency_admin
DROP POLICY IF EXISTS "agency_admin_read_ai_config" ON ai_configurations;

CREATE POLICY "agency_admin_read_ai_config" ON ai_configurations
  FOR SELECT 
  USING (has_role(auth.uid(), 'agency_admin'));
```

---

## 📊 Monitoramento Pós-Deploy

### Logs da Edge Function
```bash
# Acompanhar logs em tempo real
supabase functions logs generate-client-profile --tail

# Ver apenas erros
supabase functions logs generate-client-profile --level error

# Ver últimas 100 linhas
supabase functions logs generate-client-profile --tail 100
```

### Métricas de Uso
```sql
-- Uso de IA por agência (último mês)
SELECT 
  a.name as agency_name,
  COUNT(*) as total_uses,
  SUM(CASE WHEN from_cache THEN 1 ELSE 0 END) as from_cache,
  SUM(CASE WHEN from_cache THEN 0 ELSE 1 END) as from_api,
  SUM(tokens_used) as total_tokens,
  ROUND(SUM(cost_usd)::numeric, 4) as total_cost_usd
FROM ai_usage_logs l
JOIN agencies a ON a.id = l.agency_id
WHERE l.created_at >= NOW() - INTERVAL '30 days'
GROUP BY a.id, a.name
ORDER BY total_uses DESC;
```

### Taxa de Acerto do Cache
```sql
-- Eficiência do cache
SELECT 
  feature,
  COUNT(*) as total,
  SUM(CASE WHEN from_cache THEN 1 ELSE 0 END) as cache_hits,
  ROUND(
    (SUM(CASE WHEN from_cache THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric) * 100, 
    2
  ) as cache_hit_rate_percent
FROM ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY feature;
```

---

## 🎉 Sucesso!

Se todos os testes passaram:
- ✅ **Agency Admin agora pode gerar perfis de cliente com IA**
- ✅ **Sistema de cache está funcionando (economia de tokens)**
- ✅ **Limites por plano estão sendo respeitados**
- ✅ **Logs de auditoria estão sendo registrados**

---

## 📞 Suporte

Em caso de dúvidas ou problemas:

1. **Verificar documentação**:
   - `RESUMO_CORRECOES_COMPLETO.md` - Visão geral
   - `RESUMO_CORRECAO_BRIEFING.md` - Detalhes técnicos
   - `RELATORIO_AUDITORIA_IA.md` - Auditoria completa

2. **Verificar logs**:
   ```bash
   supabase functions logs generate-client-profile --level error
   ```

3. **Verificar banco**:
   ```sql
   -- Verificar se dados estão sendo salvos
   SELECT * FROM client_ai_profiles ORDER BY created_at DESC LIMIT 5;
   
   -- Verificar logs de uso
   SELECT * FROM ai_usage_logs ORDER BY created_at DESC LIMIT 10;
   ```

---

**Data de Criação**: 2025-11-24  
**Versão**: 1.0.0  
**Status**: ✅ Pronto para Deploy
