# Relatório de Auditoria: Assistente de IA

## Data: 24 de Novembro de 2025
## Revisor: AI Assistant

---

## 1. Resumo Executivo

Este relatório apresenta uma análise completa do componente de Assistente de IA no sistema Approval Grid Pro, incluindo bugs, problemas de permissões, regras de validação e filtros.

### Principais Descobertas:

#### ✅ **Funcional**
- Componentes React (AILegendAssistant, CaptionContextDialog) estão bem estruturados
- RLS policies para `client_ai_profiles` estão corretas
- Sistema de cache implementado corretamente
- Limites por plano configurados adequadamente

#### ⚠️ **Problemas Encontrados**

1. **CRÍTICO: Função `decrypt_api_key` Não Encontrada**
2. **CRÍTICO: Templates globais (agency_id NULL) não são buscados**
3. **MÉDIO: RLS policy restritiva em ai_text_templates**
4. **BAIXO: Falta validação de permissões no lado do cliente**

---

## 2. Análise Detalhada por Componente

### 2.1 Componentes React

#### `AILegendAssistant.tsx`
**Status:** ✅ Funcional

**Funcionalidades:**
- Exibição de sugestões de IA
- Cache indicator
- Opção de copiar sugestões
- Integração com `useAILegendAssistant` hook

**Sem problemas identificados.**

---

#### `CaptionContextDialog.tsx`
**Status:** ⚠️ Problema Menor

**Funcionalidades:**
- Formulário contextual para geração
- Busca de brand tone do cliente
- Busca de templates de roteiro

**Problema:**
- Linha 92: `eq('agency_id', clientData.agency_id)` - **não busca templates globais** (agency_id NULL criados por super_admin)

**Recomendação:**
```typescript
// Linha 89-95: Mudar para buscar templates da agência OU templates globais
const { data: templatesData } = await supabase
  .from('ai_text_templates')
  .select('id, template_name')
  .or(`agency_id.eq.${clientData.agency_id},agency_id.is.null`)
  .eq('template_type', 'script')
  .eq('is_active', true)
  .order('template_name');
```

---

#### `useAILegendAssistant.ts`
**Status:** ✅ Funcional

**Funcionalidades:**
- Gerenciamento de estado de sugestões
- Chamada à Edge Function
- Tratamento robusto de erros
- Validação de sessão

**Sem problemas identificados.**

---

### 2.2 Edge Function `generate-caption`

**Status:** 🔴 **ERRO CRÍTICO**

#### Problema 1: Função `decrypt_api_key` Não Existe

**Local:** Linhas 269-273
```typescript
const { data: decryptedKey } = await supabaseClient.rpc('decrypt_api_key', {
  encrypted_key: aiConfig.openai_api_key_encrypted
});
```

**Problema:**
- A função SQL `decrypt_api_key` **não foi encontrada** nas migrations
- Isso causa falha na geração de sugestões

**Solução:**
Criar a função na migration `20251123200322_4c06c61e-64dc-4037-a3d0-6e0d43169db2.sql`:

```sql
-- Função para descriptografar chave OpenAI
CREATE OR REPLACE FUNCTION public.decrypt_api_key(encrypted_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  decryption_key text;
BEGIN
  IF encrypted_key IS NULL OR encrypted_key = '' THEN
    RETURN NULL;
  END IF;
  
  -- Usar secret key do projeto para descriptografar
  -- Assumindo que a chave foi criptografada com pgcrypto
  decryption_key := current_setting('app.encryption_key', true);
  
  IF decryption_key IS NULL OR decryption_key = '' THEN
    -- Fallback para uma chave baseada no projeto
    decryption_key := md5(current_database()::text || 'ai_api_keys_secret_v1');
  END IF;
  
  -- Descriptografar usando pgcrypto
  RETURN pgp_sym_decrypt(encrypted_key::bytea, decryption_key);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to decrypt API key: %', SQLERRM;
    RETURN NULL;
END;
$$;

-- Função para criptografar chave OpenAI
CREATE OR REPLACE FUNCTION public.encrypt_api_key(plain_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  IF plain_key IS NULL OR plain_key = '' THEN
    RETURN NULL;
  END IF;
  
  encryption_key := current_setting('app.encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    encryption_key := md5(current_database()::text || 'ai_api_keys_secret_v1');
  END IF;
  
  RETURN pgp_sym_encrypt(plain_key, encryption_key);
END;
$$;
```

---

#### Problema 2: Templates Globais Não São Buscados

**Local:** Linhas 298-306
```typescript
const { data: templates } = await supabaseClient
  .from('ai_text_templates')
  .select('*')
  .eq('agency_id', agencyId)  // ❌ Não busca templates com agency_id NULL
  .eq('template_type', ...)
  .eq('is_active', true)
  .order('created_at', { ascending: false })
  .limit(5);
```

**Problema:**
- Templates globais criados por super_admin (agency_id NULL) não são incluídos
- Agências não podem usar templates globais

**Solução:**
```typescript
const { data: templates } = await supabaseClient
  .from('ai_text_templates')
  .select('*')
  .or(`agency_id.eq.${agencyId},agency_id.is.null`)  // ✅ Inclui templates globais
  .eq('template_type', contentType === 'post' || contentType === 'plan_caption' || contentType === 'plan_description' ? 'caption' : 'script')
  .eq('is_active', true)
  .order('created_at', { ascending: false })
  .limit(5);
```

---

### 2.3 Tabelas e RLS Policies

#### `ai_configurations`
**Status:** ✅ Correto

**RLS Policy:**
```sql
CREATE POLICY "super_admin_full_access_ai_config" ON public.ai_configurations
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));
```

**Acesso:**
- ✅ Super Admin: Total
- ❌ Agency Admin: Nenhum (correto - configuração global)

---

#### `ai_text_templates`
**Status:** ⚠️ **Problema com Templates Globais**

**RLS Policies Atuais:**
```sql
-- Super admin pode tudo
CREATE POLICY "Super admin full access on ai_text_templates"
ON ai_text_templates
FOR ALL
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Agency admin pode gerenciar templates da própria agência
CREATE POLICY "Agency admin can manage own templates"
ON ai_text_templates
FOR ALL
USING (
  has_role(auth.uid(), 'agency_admin') AND
  agency_id = get_user_agency_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'agency_admin') AND
  agency_id = get_user_agency_id(auth.uid())
);

-- Usuários podem ler templates da própria agência (para IA usar)
CREATE POLICY "Users can read own agency templates"
ON ai_text_templates
FOR SELECT
USING (
  agency_id = get_user_agency_id(auth.uid()) OR
  has_role(auth.uid(), 'super_admin')
);
```

**Problema:**
- A policy "Users can read own agency templates" **não inclui templates globais** (agency_id NULL)
- Agency admins e usuários não conseguem ver templates globais

**Solução:**
```sql
-- REMOVER policy antiga
DROP POLICY IF EXISTS "Users can read own agency templates" ON ai_text_templates;

-- CRIAR nova policy que inclui templates globais
CREATE POLICY "Users can read own agency and global templates"
ON ai_text_templates
FOR SELECT
USING (
  agency_id = get_user_agency_id(auth.uid()) OR
  agency_id IS NULL OR  -- ✅ Permite ver templates globais
  has_role(auth.uid(), 'super_admin')
);
```

---

#### `ai_usage_logs`
**Status:** ✅ Correto

**RLS Policies:**
- Super admin pode ver todos
- Agency admin pode ver da própria agência
- Sistema pode inserir (sem autenticação)

**Sem problemas identificados.**

---

#### `ai_response_cache`
**Status:** ✅ Correto

**RLS Policy:**
```sql
CREATE POLICY "system_only_ai_cache" ON public.ai_response_cache
  FOR ALL USING (false); -- Apenas edge functions acessam
```

**Acesso:**
- ❌ Usuários: Nenhum (correto - cache interno)
- ✅ Edge Functions: Via service role

---

#### `client_ai_profiles`
**Status:** ✅ Correto

**RLS Policies:**
- Super admin: acesso total
- Agency admin: acesso aos clientes da agência
- Client user: leitura do próprio perfil

**Sem problemas identificados.**

---

### 2.4 Páginas de Configuração

#### `/admin/ai` (AISettings.tsx)
**Status:** ✅ Funcional

**Permissões:**
```tsx
<AccessGate allow={['super_admin', 'agency_admin']}>
```

**Funcionalidades:**
- Configuração de OpenAI (somente super_admin tem acesso via RLS)
- Visualização de limites por plano
- Dashboard de custos

**Observação:**
- Agency admin **vê a página**, mas **não consegue salvar** configurações (RLS bloqueia)
- Pode ser confuso para o usuário

**Recomendação:**
Adicionar verificação de role e exibir mensagem clara:

```tsx
export default function AISettings() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.rpc('get_user_role', { _user_id: user.id });
        setRole(data);
      }
    };
    checkRole();
  }, []);

  return (
    <AccessGate allow={['super_admin', 'agency_admin']}>
      <AppLayout>
        <div className="container mx-auto p-6 space-y-6">
          {role === 'agency_admin' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Você pode visualizar as configurações de IA, mas apenas Super Admins podem editá-las.
              </AlertDescription>
            </Alert>
          )}
          {/* ... resto do componente ... */}
        </div>
      </AppLayout>
    </AccessGate>
  );
}
```

---

#### `/admin/ai-templates` (AITextTemplateManager.tsx)
**Status:** ⚠️ **Acesso Restrito Incorretamente**

**Permissões Atuais:**
```tsx
// Em App.tsx
<Route path="/admin/ai-templates" element={
  <RoleProtectedRoute allow={['super_admin']}>
    <AITextTemplateManager />
  </RoleProtectedRoute>
} />
```

**Problema:**
- Agency admins **não podem acessar** a página de templates
- Mas RLS **permite** que agency admins gerenciem seus próprios templates

**Conflito:**
- Rota: Bloqueia agency_admin
- RLS: Permite agency_admin

**Solução:**
```tsx
// Em App.tsx - MUDAR permissões da rota
<Route path="/admin/ai-templates" element={
  <RoleProtectedRoute allow={['super_admin', 'agency_admin']}>
    <AITextTemplateManager />
  </RoleProtectedRoute>
} />
```

```tsx
// Em AITextTemplateManager.tsx - Filtrar templates por role
const loadTemplates = async () => {
  try {
    setLoading(true);
    
    // Verificar role do usuário
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");
    
    const { data: roleData } = await supabase
      .rpc('get_user_role', { _user_id: user.id });
    
    let query = supabase
      .from("ai_text_templates")
      .select("*");
    
    // Se não for super_admin, filtrar por agency_id
    if (roleData !== 'super_admin') {
      const { data: profile } = await supabase
        .from("profiles")
        .select("agency_id")
        .eq("id", user.id)
        .single();
      
      if (profile?.agency_id) {
        query = query.eq('agency_id', profile.agency_id);
      }
    }
    
    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;
    setTemplates((data || []) as Template[]);
  } catch (error) {
    console.error("Erro ao carregar templates:", error);
    toast({
      title: "Erro ao carregar templates",
      description: "Não foi possível carregar os templates",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};
```

---

## 3. Priorização de Correções

### 🔴 **CRÍTICO (Resolver Imediatamente)**

1. **Criar funções `encrypt_api_key` e `decrypt_api_key`**
   - **Impacto:** Sistema de IA não funciona
   - **Arquivo:** `supabase/migrations/20251123200322_4c06c61e-64dc-4037-a3d0-6e0d43169db2.sql`

2. **Corrigir busca de templates globais na Edge Function**
   - **Impacto:** Templates globais não são usados
   - **Arquivo:** `supabase/functions/generate-caption/index.ts` (linha 299)

3. **Corrigir RLS policy para incluir templates globais**
   - **Impacto:** Usuários não veem templates globais
   - **Arquivo:** Nova migration

---

### ⚠️ **MÉDIO (Resolver em 1-2 Dias)**

4. **Liberar acesso agency_admin a `/admin/ai-templates`**
   - **Impacto:** Agency admins não podem gerenciar seus templates
   - **Arquivos:** 
     - `src/App.tsx`
     - `src/components/admin/AITextTemplateManager.tsx`

5. **Corrigir busca de templates no CaptionContextDialog**
   - **Impacto:** Templates globais não aparecem no diálogo
   - **Arquivo:** `src/components/content/CaptionContextDialog.tsx` (linha 89)

6. **Adicionar alerta visual em AISettings para agency_admin**
   - **Impacto:** UX confusa
   - **Arquivo:** `src/pages/admin/AISettings.tsx`

---

### ✅ **BAIXO (Melhorias Opcionais)**

7. **Adicionar validação de permissões no lado do cliente**
   - **Impacto:** Melhor UX, mas RLS já protege
   - **Arquivos:** Vários componentes

8. **Adicionar testes automatizados**
   - **Impacto:** Prevenção de regressões
   - **Arquivos:** Novos arquivos de teste

---

## 4. Checklist de Correções

### Migration de Criptografia
```sql
-- [ ] Adicionar à migration 20251123200322_4c06c61e-64dc-4037-a3d0-6e0d43169db2.sql
-- [ ] CREATE FUNCTION encrypt_api_key
-- [ ] CREATE FUNCTION decrypt_api_key
-- [ ] Testar criptografia/descriptografia
```

### Migration de RLS para Templates Globais
```sql
-- [ ] Criar nova migration
-- [ ] DROP POLICY "Users can read own agency templates"
-- [ ] CREATE POLICY "Users can read own agency and global templates"
-- [ ] Testar acesso de agency_admin e usuários comuns
```

### Edge Function generate-caption
```typescript
// [ ] Linha 299: Alterar .eq('agency_id', agencyId) para .or(...)
// [ ] Testar geração com templates globais
// [ ] Verificar se templates da agência + globais aparecem
```

### CaptionContextDialog
```typescript
// [ ] Linha 89: Alterar busca para incluir templates globais
// [ ] Testar dropdown de templates
```

### AITextTemplateManager
```tsx
// [ ] Adicionar filtro por role em loadTemplates()
// [ ] Testar como super_admin (ver todos)
// [ ] Testar como agency_admin (ver apenas seus templates)
```

### App.tsx
```tsx
// [ ] Linha 158: Adicionar 'agency_admin' à rota /admin/ai-templates
// [ ] Testar acesso de agency_admin
```

### AISettings.tsx
```tsx
// [ ] Adicionar verificação de role
// [ ] Exibir Alert para agency_admin
// [ ] Testar visualização como agency_admin
```

---

## 5. Testes Recomendados

### Teste 1: Geração de Sugestão de IA
**Como:** Super Admin
1. [ ] Configurar chave OpenAI em `/admin/ai`
2. [ ] Criar template global (agency_id NULL)
3. [ ] Ir para criação de conteúdo
4. [ ] Clicar em "Gerar Legendas"
5. [ ] Verificar se template global foi usado

**Como:** Agency Admin
1. [ ] Criar template da agência
2. [ ] Ir para criação de conteúdo
3. [ ] Clicar em "Gerar Legendas"
4. [ ] Verificar se template da agência + globais foram usados

---

### Teste 2: Gerenciamento de Templates
**Como:** Super Admin
1. [ ] Acessar `/admin/ai-templates`
2. [ ] Criar template SEM agency_id (global)
3. [ ] Criar template COM agency_id
4. [ ] Ver lista de templates (todos)

**Como:** Agency Admin
1. [ ] Acessar `/admin/ai-templates`
2. [ ] Ver lista (apenas da agência, sem globais visíveis na lista)
3. [ ] Criar novo template
4. [ ] Verificar se agency_id foi preenchido automaticamente

---

### Teste 3: Configurações de IA
**Como:** Super Admin
1. [ ] Acessar `/admin/ai`
2. [ ] Configurar chave OpenAI
3. [ ] Salvar com sucesso

**Como:** Agency Admin
1. [ ] Acessar `/admin/ai`
2. [ ] Ver alerta: "Apenas visualização"
3. [ ] Tentar salvar (deve falhar com mensagem clara)

---

## 6. Observações Finais

### Pontos Positivos
- Arquitetura bem estruturada
- Separação clara de responsabilidades
- Sistema de cache eficiente
- RLS implementado (com pequenos ajustes necessários)

### Pontos de Atenção
- **Funções de criptografia faltando**
- **Templates globais não acessíveis**
- **Inconsistência entre rotas e RLS**

### Recomendações de Melhoria Futura
1. Implementar logs de auditoria para uso de IA
2. Adicionar rate limiting na Edge Function
3. Criar dashboard de métricas de uso de IA por agência
4. Implementar sistema de feedback de qualidade das sugestões
5. Adicionar suporte a múltiplos idiomas

---

## 7. Conclusão

O sistema de Assistente de IA está **80% funcional**, mas requer correções críticas para ser completamente operacional:

1. ✅ Componentes React estão corretos
2. ✅ Hook de gerenciamento de estado funcional
3. 🔴 Edge Function precisa de função de descriptografia
4. ⚠️ RLS policies precisam de ajuste para templates globais
5. ⚠️ Permissões de rota precisam de ajuste

**Tempo estimado para correções:** 2-3 horas

**Prioridade:** ALTA

---

*Relatório gerado automaticamente em 24/11/2025*


