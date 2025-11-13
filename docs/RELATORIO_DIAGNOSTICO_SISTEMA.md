# Relatório de Diagnóstico e Plano de Reestruturação do Sistema

**Data:** 13 de Novembro de 2025  
**Versão de Referência:** Nov 12, 10:27 AM (última versão funcional)  
**Status Atual:** Sistema parcialmente não-funcional

---

## 1. Histórico de Alterações (Desde 12 Nov, 10:27 AM)

### Alteração #1: Simplificação do Sistema de 2FA
**Data:** 12-13 Nov  
**Objetivo:** Remover sistema complexo de autenticação 2FA e converter todos os usuários para autenticação padrão email/senha

**Ações Realizadas:**
- Remoção de lógica de sessionStorage em `useContentPermissions` e `useContentAccess`
- Conversão de `ClientApproval.tsx` de fluxo 2FA para formulário de login padrão
- Depreciação de tabelas `two_factor_codes` e `client_sessions`
- Desativação de edge functions `verify-2fa-code` e `send-2fa-code`

**Impacto:**
- ❌ Sistema quebrou para aprovadores (perderam acesso)
- ❌ Páginas de aprovação pararam de funcionar
- ⚠️ Dados de aprovadores existentes ficaram órfãos

---

### Alteração #2: Redução de Permissões Granulares
**Data:** 13 Nov  
**Objetivo:** Simplificar de 41 permissões granulares para 10 permissões essenciais

**Ações Realizadas:**
- Deletadas 31 permissões (view_media_blocks, view_action_buttons, etc.)
- Mantidas apenas: view_content, create_content, edit_content, delete_content, approve_content, add_comment, manage_clients, manage_approvers, view_analytics, manage_settings
- Atualização da tabela `role_permissions`

**Impacto:**
- ❌ Páginas retornaram `null` em verificações de permissão
- ❌ `usePermissions().can('manage_clients')` retornou undefined
- ⚠️ Race condition entre carregamento de permissões e renderização de páginas

---

### Alteração #3: Tentativa de Correção de Recursão RLS
**Data:** 13 Nov  
**Objetivo:** Eliminar recursão infinita em políticas RLS que causavam erros "infinite recursion detected"

**Ações Realizadas:**
- Remoção de política duplicada "Users can view their own client" na tabela `clients`
- Tentativa de usar `SECURITY DEFINER` em algumas funções SQL
- Reescrita parcial de políticas RLS

**Impacto:**
- ⚠️ Recursão não foi completamente eliminada
- ❌ Algumas consultas continuaram lentas ou falhando silenciosamente
- ⚠️ Funções SQL (`get_user_agency_id`, `get_user_client_id`) ainda executam no contexto do usuário

---

### Alteração #4: Criação do Hook `useUserData`
**Data:** 13 Nov  
**Objetivo:** Centralizar carregamento de dados do usuário (profile, role, agency, client) antes de qualquer renderização de página

**Ações Realizadas:**
- Criado `src/hooks/useUserData.ts`
- Hook busca sequencialmente: profile → role → agency (se agency_id) → client (se client_id)
- Retorna `{ profile, role, agency, client, loading }`

**Impacto:**
- ✅ Hook criado com sucesso
- ✅ Elimina race conditions quando usado corretamente
- ⚠️ **NEM TODAS as páginas foram refatoradas para usar este hook**

---

### Alteração #5: Refatoração de Dashboard e ContentGrid
**Data:** 13 Nov  
**Objetivo:** Aplicar padrão "application-first" usando `useUserData()` e filtragem direta no frontend

**Ações Realizadas:**
- Refatorado `src/pages/Dashboard.tsx`:
  - Usa `useUserData()` e aguarda `loading=false`
  - Filtragem condicional baseada em role (super_admin, agency_admin, client_user)
  - Queries diretas: `.eq('agency_id', profile.agency_id)` para agency_admin
- Refatorado `src/pages/ContentGrid.tsx`:
  - Mesmo padrão de `useUserData()` + filtragem direta
  - Não depende de RLS para filtrar dados

**Impacto:**
- ✅ Dashboard funciona corretamente
- ✅ ContentGrid carrega dados filtrados corretamente
- ⚠️ **Clientes.tsx NÃO foi refatorado (problema crítico atual)**

---

### Alteração #6: Clientes.tsx NÃO Refatorado (PROBLEMA CRÍTICO ATUAL)
**Data:** 13 Nov  
**Identificação:** Página `/clientes` continua usando `usePermissions()` e validação prematura

**Código Problemático Atual em `src/pages/Clientes.tsx`:**
```typescript
const { can, loading: permissionsLoading } = usePermissions();

if (permissionsLoading) return <div>Carregando permissões...</div>;

if (!can('manage_clients')) {
  navigate('/dashboard');
  return null;
}
```

**Problema:**
- ❌ `can('manage_clients')` é validado ANTES do hook `usePermissions` terminar de carregar
- ❌ Race condition: `can()` retorna `false` prematuramente → redirecionamento indevido
- ❌ Página de clientes fica inacessível mesmo para agency_admin com permissão correta
- ❌ RLS ainda é usado como filtro primário de dados (deveria ser secundário)

**Causa Raiz:**
- `usePermissions()` depende de múltiplas queries assíncronas (user_roles → role_permissions)
- Frontend valida permissão antes da query completar
- Sistema quebra mesmo com dados e permissões corretas no backend

---

## 2. Problemas Identificados

### 2.1 Race Condition em usePermissions (Clientes.tsx)
**Severidade:** 🔴 CRÍTICA  
**Impacto:** Página `/clientes` inacessível para agency_admin

**Descrição:**
- `usePermissions` retorna `can()` function que valida permissões
- `can('manage_clients')` é chamado ANTES do hook terminar de buscar `role_permissions`
- Validação prematura retorna `false` → redirecionamento para `/dashboard`
- Mesmo quando permissões existem no banco, frontend não consegue acessá-las a tempo

**Páginas Afetadas:**
- `/clientes` (agency_admin não consegue listar clientes)
- Potencialmente outras páginas usando padrão similar de `can()` antes de `loading=false`

---

### 2.2 Políticas RLS Complexas com Sub-queries
**Severidade:** 🟠 ALTA  
**Impacto:** Recursão infinita, performance degradada

**Descrição:**
- Políticas RLS usam funções como `get_user_agency_id()` que fazem sub-queries
- Funções SQL consultam `profiles` → políticas de `profiles` consultam outras tabelas → loop
- Queries falham silenciosamente ou retornam dados vazios
- Logs mostram "infinite recursion detected in recursive CTE"

**Tabelas Afetadas:**
- `agencies` (10 políticas → reduzidas para 4, ainda com problemas)
- `clients` (política duplicada removida, mas recursão persiste)
- `client_approvers` (simplificada, mas depende de `get_user_agency_id`)
- `contents` (depende de validações cruzadas agency/client)

---

### 2.3 Funções SQL Sem SECURITY DEFINER
**Severidade:** 🟠 ALTA  
**Impacto:** Funções executam com permissões insuficientes, retornam NULL

**Descrição:**
- Funções `get_user_agency_id()`, `get_user_client_id()`, `user_belongs_to_agency()` executam no contexto do usuário
- Usuários sem permissão para ler `profiles` → função retorna NULL
- RLS policies dependem dessas funções → políticas falham silenciosamente

**Funções Problemáticas:**
```sql
CREATE OR REPLACE FUNCTION get_user_agency_id(user_uuid UUID)
RETURNS UUID AS $$
  SELECT agency_id FROM profiles WHERE id = user_uuid;
$$ LANGUAGE SQL;
-- ❌ FALTA: SECURITY DEFINER, SET search_path = public
```

**Solução Necessária:**
```sql
CREATE OR REPLACE FUNCTION get_user_agency_id(user_uuid UUID)
RETURNS UUID AS $$
  SELECT agency_id FROM profiles WHERE id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;
-- ✅ Executa com permissões da função, não do usuário
```

---

### 2.4 Frontend Depende de RLS para Filtrar Dados
**Severidade:** 🟡 MÉDIA  
**Impacto:** Páginas em branco quando RLS falha

**Descrição:**
- Frontend faz queries genéricas: `supabase.from('clients').select('*')`
- Espera que RLS filtre dados automaticamente baseado em agency_id/client_id
- Quando RLS falha → query retorna array vazio → página em branco
- Frontend não sabe se falha é por falta de dados ou erro de RLS

**Padrão Incorreto Atual:**
```typescript
// ❌ Depende de RLS para filtrar
const { data: clients } = await supabase.from('clients').select('*');
// Se RLS falhar → data = []
```

**Padrão Correto (Application-First):**
```typescript
// ✅ Filtragem explícita no frontend
const { data: profile } = await supabase.from('profiles').select('agency_id').single();
const { data: clients } = await supabase
  .from('clients')
  .select('*')
  .eq('agency_id', profile.agency_id);
// Se RLS falhar → ainda retorna dados corretos
```

---

## 3. Dados de Produção a Preservar

### 3.1 Usuários Críticos
**NUNCA DELETAR OU RESETAR:**

1. **Super Admin:**
   - Email: `juaumluihs@gmail.com`
   - Role: `super_admin`
   - Acesso: Total ao sistema

2. **Agency Admin (Pamboo):**
   - Email: `contato@pamboo.com.br`
   - Role: `agency_admin`
   - Agency: "Pamboo Criativos"
   - Clientes Associados: 2 clientes ativos

3. **Client User (Caminho do Vale):**
   - Email: `faq@redeclassea.com.br`
   - Role: `client_user`
   - Client: "Caminho do Vale"
   - Conteúdos: 10+ contents em status de aprovação

---

### 3.2 Conteúdos Críticos
**Cliente:** Caminho do Vale  
**Conteúdos em Aprovação:**
- "24 horas" (conteúdo de teste mencionado em conversas)
- 9+ outros conteúdos em workflow de aprovação

**IMPORTANTE:** Qualquer migração deve preservar:
- Status de aprovação dos conteúdos
- Histórico de ações/comentários
- Relacionamentos entre contents → clients → agencies

---

## 4. Arquitetura Proposta (Frontend-First)

### 4.1 Camadas de Validação

```
┌─────────────────────────────────────────────────┐
│  1. AUTENTICAÇÃO (Supabase Auth)                │
│     - Email/senha para todos os roles           │
│     - auth.users (super_admin, agency_admin,    │
│       team_member, client_user, approver)       │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  2. DADOS DO USUÁRIO (useUserData hook)         │
│     - Busca: profile → role → agency → client   │
│     - Centralizado, executado ANTES de render   │
│     - Retorna: { profile, role, agency, client }│
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  3. VALIDAÇÃO FRONTEND (Inline no Componente)   │
│     - if (role === 'super_admin') ...           │
│     - .eq('agency_id', profile.agency_id)       │
│     - Filtragem EXPLÍCITA de dados              │
│     - Deprecar: usePermissions.can()            │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  4. RLS (Camada de Segurança Secundária)        │
│     - Políticas SIMPLES com has_role()          │
│     - Funções SQL com SECURITY DEFINER          │
│     - SEM sub-queries complexas                 │
│     - Valida mas NÃO filtra primariamente       │
└─────────────────────────────────────────────────┘
```

---

### 4.2 Exemplo de Implementação

**Hook Centralizado (`src/hooks/useUserData.ts`):**
```typescript
export const useUserData = () => {
  const [data, setData] = useState({
    profile: null,
    role: null,
    agency: null,
    client: null,
    loading: true
  });

  useEffect(() => {
    const loadUserData = async () => {
      // 1. Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .single();

      // 2. Role
      const { data: roleData } = await supabase
        .rpc('get_user_role');

      // 3. Agency (se agency_id existe)
      let agency = null;
      if (profile?.agency_id) {
        const { data: agencyData } = await supabase
          .from('agencies')
          .select('*')
          .eq('id', profile.agency_id)
          .single();
        agency = agencyData;
      }

      // 4. Client (se client_id existe)
      let client = null;
      if (profile?.client_id) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('*')
          .eq('id', profile.client_id)
          .single();
        client = clientData;
      }

      setData({ profile, role: roleData, agency, client, loading: false });
    };

    loadUserData();
  }, []);

  return data;
};
```

**Uso em Página (`src/pages/Clientes.tsx` - REFATORADO):**
```typescript
export default function Clientes() {
  const { profile, role, agency, loading } = useUserData();
  const [clients, setClients] = useState([]);

  useEffect(() => {
    if (loading || !profile) return;

    const loadClients = async () => {
      let query = supabase.from('clients').select('*');

      // Filtragem explícita baseada em role
      if (role === 'super_admin') {
        // Super admin vê todos os clientes
      } else if (role === 'agency_admin') {
        // Agency admin vê apenas clientes da sua agência
        query = query.eq('agency_id', profile.agency_id);
      } else if (role === 'client_user') {
        // Client user vê apenas seu próprio cliente
        query = query.eq('id', profile.client_id);
      } else {
        // Outros roles não têm acesso
        setClients([]);
        return;
      }

      const { data } = await query;
      setClients(data || []);
    };

    loadClients();
  }, [profile, role, loading]);

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <h1>Clientes</h1>
      {clients.map(client => (
        <ClientCard key={client.id} client={client} />
      ))}
    </div>
  );
}
```

---

## 5. Plano de Implementação Incremental

### FASE 0: Preparação (30 min)
**Objetivo:** Backup e documentação antes de qualquer alteração

**Ações:**
1. ✅ Backup completo do banco de dados
2. ✅ Documentar todas as políticas RLS atuais:
   ```sql
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
   FROM pg_policies
   WHERE schemaname = 'public'
   ORDER BY tablename, policyname;
   ```
3. ✅ Validar que 3 usuários de produção existem e têm dados corretos

---

### FASE 1: Correção Crítica - Race Condition (1-2h)
**Prioridade:** 🔴 CRÍTICA  
**Objetivo:** Restaurar funcionalidade de `/clientes` para agency_admin

#### 1.1 Refatorar `src/pages/Clientes.tsx`
**Arquivo:** `src/pages/Clientes.tsx`

**Mudanças:**
```typescript
// ❌ REMOVER:
const { can, loading: permissionsLoading } = usePermissions();
if (!can('manage_clients')) { navigate('/dashboard'); }

// ✅ ADICIONAR:
const { profile, role, agency, loading } = useUserData();

useEffect(() => {
  if (loading || !profile) return;

  const loadClients = async () => {
    let query = supabase.from('clients').select(`
      *,
      agencies (name, slug),
      profiles!clients_owner_id_fkey (full_name, email)
    `);

    if (role === 'super_admin') {
      // Todos os clientes
    } else if (role === 'agency_admin') {
      query = query.eq('agency_id', profile.agency_id);
    } else {
      // Sem permissão
      setClients([]);
      return;
    }

    const { data, error } = await query;
    if (error) {
      toast.error('Erro ao carregar clientes');
      return;
    }
    setClients(data || []);
  };

  loadClients();
}, [profile, role, loading]);
```

#### 1.2 Validar ContentGrid Já Usa useUserData
**Arquivo:** `src/pages/ContentGrid.tsx`

**Verificação:**
- ✅ Confirmar que já usa `useUserData()` corretamente
- ✅ Confirmar filtragem direta de conteúdos por `agency_id` ou `client_id`

#### 1.3 Teste de Validação
**Cenários:**
1. Login como `contato@pamboo.com.br` (agency_admin)
2. Navegar para `/clientes`
3. ✅ Deve ver 2 clientes da agência Pamboo
4. ✅ NÃO deve ser redirecionado para `/dashboard`

---

### FASE 2: Correção de Recursão SQL (2-3h)
**Prioridade:** 🟠 ALTA  
**Objetivo:** Eliminar recursão infinita em funções SQL e RLS

#### 2.1 Reescrever Funções SQL com SECURITY DEFINER

**Arquivo:** Migration SQL

```sql
-- ============================================
-- FUNÇÃO: get_user_agency_id
-- ============================================
DROP FUNCTION IF EXISTS get_user_agency_id(UUID);

CREATE OR REPLACE FUNCTION get_user_agency_id(user_uuid UUID)
RETURNS UUID AS $$
  SELECT p.agency_id
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE u.id = user_uuid
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

-- ============================================
-- FUNÇÃO: get_user_client_id
-- ============================================
DROP FUNCTION IF EXISTS get_user_client_id(UUID);

CREATE OR REPLACE FUNCTION get_user_client_id(user_uuid UUID)
RETURNS UUID AS $$
  SELECT p.client_id
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE u.id = user_uuid
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

-- ============================================
-- FUNÇÃO: user_belongs_to_agency
-- ============================================
DROP FUNCTION IF EXISTS user_belongs_to_agency(UUID, UUID);

CREATE OR REPLACE FUNCTION user_belongs_to_agency(
  user_uuid UUID,
  agency_uuid UUID
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE u.id = user_uuid AND p.agency_id = agency_uuid
  );
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

-- ============================================
-- FUNÇÃO: user_belongs_to_client
-- ============================================
DROP FUNCTION IF EXISTS user_belongs_to_client(UUID, UUID);

CREATE OR REPLACE FUNCTION user_belongs_to_client(
  user_uuid UUID,
  client_uuid UUID
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE u.id = user_uuid AND p.client_id = client_uuid
  );
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;
```

**Explicação:**
- `SECURITY DEFINER`: Executa função com permissões do criador (bypass RLS)
- `SET search_path = public`: Previne ambiguidade de schemas
- `LEFT JOIN auth.users`: Evita consultar `profiles` com RLS (elimina recursão)

---

### FASE 3: Simplificação de RLS (3-4h)
**Prioridade:** 🟠 ALTA  
**Objetivo:** Reduzir políticas RLS para ~10 políticas simples como camada secundária

#### 3.1 Política RLS para `agencies`

**Migration SQL:**
```sql
-- Remover todas as políticas antigas
DROP POLICY IF EXISTS "Super admins can manage all agencies" ON agencies;
DROP POLICY IF EXISTS "Agency admins can view their agency" ON agencies;
DROP POLICY IF EXISTS "Users can view agencies" ON agencies;
-- ... (remover todas as 10 políticas antigas)

-- Criar políticas simples
CREATE POLICY "super_admin_full_access"
  ON agencies FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "agency_admin_own_agency"
  ON agencies FOR SELECT
  USING (
    has_role(auth.uid(), 'agency_admin')
    AND id = get_user_agency_id(auth.uid())
  );

CREATE POLICY "team_member_view_own_agency"
  ON agencies FOR SELECT
  USING (
    has_role(auth.uid(), 'team_member')
    AND id = get_user_agency_id(auth.uid())
  );
```

**Total:** 3 políticas (antes: 10 políticas)

---

#### 3.2 Política RLS para `clients`

**Migration SQL:**
```sql
-- Remover políticas antigas
DROP POLICY IF EXISTS "Super admins can manage all clients" ON clients;
DROP POLICY IF EXISTS "Agency admins can manage their clients" ON clients;
DROP POLICY IF EXISTS "Users can view their own client" ON clients;
-- ... (remover todas)

-- Criar políticas simples
CREATE POLICY "super_admin_full_access"
  ON clients FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "agency_admin_own_clients"
  ON clients FOR ALL
  USING (
    has_role(auth.uid(), 'agency_admin')
    AND agency_id = get_user_agency_id(auth.uid())
  );

CREATE POLICY "client_user_view_own_client"
  ON clients FOR SELECT
  USING (
    has_role(auth.uid(), 'client_user')
    AND id = get_user_client_id(auth.uid())
  );

CREATE POLICY "approver_view_assigned_client"
  ON clients FOR SELECT
  USING (
    has_role(auth.uid(), 'approver')
    AND id = get_user_client_id(auth.uid())
  );
```

**Total:** 4 políticas (antes: 6+ políticas)

---

#### 3.3 Política RLS para `client_approvers`

**Migration SQL:**
```sql
-- Remover políticas antigas
DROP POLICY IF EXISTS "Super admins can manage all approvers" ON client_approvers;
-- ... (remover todas)

-- Criar políticas simples
CREATE POLICY "super_admin_full_access"
  ON client_approvers FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "agency_admin_manage_own_agency_approvers"
  ON client_approvers FOR ALL
  USING (
    has_role(auth.uid(), 'agency_admin')
    AND EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_approvers.client_id
        AND clients.agency_id = get_user_agency_id(auth.uid())
    )
  );

CREATE POLICY "client_user_view_own_approvers"
  ON client_approvers FOR SELECT
  USING (
    has_role(auth.uid(), 'client_user')
    AND client_id = get_user_client_id(auth.uid())
  );
```

**Total:** 3 políticas

---

#### 3.4 Política RLS para `contents`

**Migration SQL:**
```sql
-- Remover políticas antigas
DROP POLICY IF EXISTS "Super admins can manage all contents" ON contents;
-- ... (remover todas)

-- Criar políticas simples
CREATE POLICY "super_admin_full_access"
  ON contents FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "agency_admin_own_agency_contents"
  ON contents FOR ALL
  USING (
    has_role(auth.uid(), 'agency_admin')
    AND EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = contents.client_id
        AND clients.agency_id = get_user_agency_id(auth.uid())
    )
  );

CREATE POLICY "client_user_own_client_contents"
  ON contents FOR SELECT
  USING (
    has_role(auth.uid(), 'client_user')
    AND client_id = get_user_client_id(auth.uid())
  );

CREATE POLICY "approver_view_assigned_contents"
  ON contents FOR SELECT
  USING (
    has_role(auth.uid(), 'approver')
    AND client_id = get_user_client_id(auth.uid())
  );
```

**Total:** 4 políticas

---

**RESUMO FASE 3:**
- `agencies`: 3 políticas (antes: 10)
- `clients`: 4 políticas (antes: 6+)
- `client_approvers`: 3 políticas
- `contents`: 4 políticas
- **Total Geral:** ~14 políticas (antes: 30+ políticas)

---

### FASE 4: Validação e Testes (2h)
**Prioridade:** 🟡 MÉDIA  
**Objetivo:** Garantir que todas as alterações funcionam corretamente

#### 4.1 Testes Manuais

**Usuário:** `juaumluihs@gmail.com` (super_admin)
- ✅ Login com email/senha
- ✅ Acesso a `/clientes` → deve ver TODOS os clientes
- ✅ Acesso a `/dashboard` → deve ver todas as agências
- ✅ Acesso a `/content-grid` → deve ver todos os conteúdos

**Usuário:** `contato@pamboo.com.br` (agency_admin)
- ✅ Login com email/senha
- ✅ Acesso a `/clientes` → deve ver apenas 2 clientes da Pamboo
- ✅ Acesso a `/dashboard` → deve ver dados da agência Pamboo
- ✅ Acesso a `/content-grid` → deve ver conteúdos dos clientes da Pamboo

**Usuário:** `faq@redeclassea.com.br` (client_user)
- ✅ Login com email/senha
- ✅ Acesso a `/dashboard` → deve ver dados do cliente "Caminho do Vale"
- ✅ Acesso a `/content-grid` → deve ver 10+ conteúdos em aprovação
- ✅ Conteúdo "24 horas" deve estar visível e em status correto

#### 4.2 Monitoramento de Logs

**Verificar Logs Supabase:**
```sql
-- Logs de erro relacionados a RLS
SELECT * FROM postgres_logs
WHERE event_message ILIKE '%infinite recursion%'
  OR event_message ILIKE '%permission denied%'
ORDER BY timestamp DESC
LIMIT 50;
```

**Critério de Sucesso:**
- ❌ ZERO ocorrências de "infinite recursion detected"
- ❌ ZERO erros "permission denied for relation profiles"

---

### FASE 5: Limpeza e Depreciação (1h)
**Prioridade:** 🟢 BAIXA  
**Objetivo:** Remover código obsoleto e atualizar documentação

#### 5.1 Depreciar `usePermissions.ts`

**Arquivo:** `src/hooks/usePermissions.ts`

**Ação:**
- Adicionar comentário de depreciação no topo do arquivo
- Manter arquivo por compatibilidade temporária
- Adicionar console.warn() para avisar devs

```typescript
/**
 * @deprecated
 * Este hook está sendo depreciado em favor de validação inline baseada em role.
 * Use o hook useUserData() e valide permissões diretamente:
 *
 * const { role, profile } = useUserData();
 * if (role === 'super_admin') { ... }
 * if (role === 'agency_admin' && profile.agency_id === targetAgencyId) { ... }
 */
export const usePermissions = () => {
  console.warn('usePermissions is deprecated. Use useUserData() instead.');
  // ... código existente
};
```

#### 5.2 Atualizar README.md

**Arquivo:** `README.md`

**Adicionar Seção:**
```markdown
## Arquitetura de Permissões (Atualizado Nov 2025)

### Sistema de Validação Frontend-First

Este projeto usa uma abordagem "application-first" para controle de acesso:

1. **Hook Centralizado:** `useUserData()` carrega profile, role, agency, client
2. **Validação Inline:** Componentes validam role diretamente no código
3. **RLS Secundário:** Políticas RLS servem como camada de segurança, não filtro primário

### Exemplo de Uso

```typescript
const { profile, role, loading } = useUserData();

if (loading) return <LoadingSpinner />;

// Validação inline baseada em role
if (role === 'super_admin') {
  // Acesso total
} else if (role === 'agency_admin') {
  // Filtrar por agency_id do profile
  query.eq('agency_id', profile.agency_id);
}
```

### Roles Disponíveis

- `super_admin`: Acesso total ao sistema
- `agency_admin`: Gerencia clientes e conteúdos da própria agência
- `team_member`: Membro de equipe com permissões limitadas
- `client_user`: Usuário de cliente, acessa apenas dados do próprio cliente
- `approver`: Aprova conteúdos do cliente atribuído

### Depreciação

- ❌ `usePermissions().can()` - Deprecado, usar validação inline
- ❌ Sistema de 2FA - Removido, todos usam email/senha
```

---

### FASE 6: Monitoramento Pós-Deploy (Contínuo)
**Prioridade:** 🟢 BAIXA  
**Objetivo:** Garantir estabilidade a longo prazo

#### 6.1 Métricas a Monitorar

**Performance:**
- Tempo de resposta de queries em `clients`, `contents`, `agencies`
- Taxa de erro em RLS policies (deve ser ~0%)

**Erros:**
- Logs de "infinite recursion" (deve ser 0)
- Logs de "permission denied" (validar se são legítimos)

**Uso:**
- Páginas mais acessadas: `/dashboard`, `/clientes`, `/content-grid`
- Taxa de redirecionamento indevido de `/clientes` (deve ser 0%)

---

## 6. Plano de Reestruturação Total (Alternativa Destrutiva)

### ⚠️ ATENÇÃO: ABORDAGEM DE ALTO RISCO

Este plano é uma **alternativa radical** ao Plano Incremental. Use apenas se:
- Plano Incremental falhar após 3 tentativas
- Sistema estiver completamente não-funcional
- Aprovação explícita do cliente

---

### FASE A: Backup Completo (1h)

#### A.1 Backup de Banco de Dados
```bash
# Exportar dump completo
pg_dump -h [HOST] -U postgres -d postgres > backup_completo_$(date +%Y%m%d_%H%M%S).sql

# Exportar apenas dados de produção (CSV)
COPY (SELECT * FROM auth.users WHERE email IN (
  'juaumluihs@gmail.com',
  'contato@pamboo.com.br',
  'faq@redeclassea.com.br'
)) TO '/tmp/production_users.csv' CSV HEADER;

COPY (SELECT * FROM profiles WHERE id IN (
  SELECT id FROM auth.users WHERE email IN (...)
)) TO '/tmp/production_profiles.csv' CSV HEADER;

COPY (SELECT * FROM agencies WHERE slug = 'pamboo-criativos')
TO '/tmp/production_agencies.csv' CSV HEADER;

COPY (SELECT * FROM clients WHERE agency_id = (
  SELECT id FROM agencies WHERE slug = 'pamboo-criativos'
)) TO '/tmp/production_clients.csv' CSV HEADER;

COPY (SELECT * FROM contents WHERE client_id = (
  SELECT id FROM clients WHERE name = 'Caminho do Vale'
)) TO '/tmp/production_contents.csv' CSV HEADER;
```

#### A.2 Backup de Código
```bash
# Criar branch de backup
git checkout -b backup/pre-total-restructure
git add .
git commit -m "BACKUP: State before total restructure"
git push origin backup/pre-total-restructure
```

---

### FASE B: Destruição Controlada (2h)

#### B.1 Desabilitar RLS em Todas as Tabelas
```sql
-- CUIDADO: Isso remove toda a segurança RLS temporariamente
ALTER TABLE agencies DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_approvers DISABLE ROW LEVEL SECURITY;
ALTER TABLE contents DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;
-- ... (todas as tabelas relevantes)
```

#### B.2 Deletar TODAS as Políticas RLS
```sql
-- Script para deletar todas as políticas
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;
```

#### B.3 Deletar Funções SQL Problemáticas
```sql
DROP FUNCTION IF EXISTS get_user_agency_id(UUID);
DROP FUNCTION IF EXISTS get_user_client_id(UUID);
DROP FUNCTION IF EXISTS user_belongs_to_agency(UUID, UUID);
DROP FUNCTION IF EXISTS user_belongs_to_client(UUID, UUID);
DROP FUNCTION IF EXISTS has_role(UUID, TEXT);
-- ... (todas as funções de validação)
```

#### B.4 Limpar Tabela de Permissões
```sql
-- Deletar todas as permissões granulares antigas
DELETE FROM role_permissions;
```

---

### FASE C: Reconstrução Limpa (3-4h)

#### C.1 Recriar Funções SQL (SECURITY DEFINER)
```sql
-- ============================================
-- has_role: Verifica se usuário tem um role específico
-- ============================================
CREATE OR REPLACE FUNCTION has_role(user_uuid UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    LEFT JOIN public.user_roles ur ON u.id = ur.user_id
    WHERE u.id = user_uuid AND ur.role = role_name
  );
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

-- ============================================
-- get_user_agency_id: Retorna agency_id do usuário
-- ============================================
CREATE OR REPLACE FUNCTION get_user_agency_id(user_uuid UUID)
RETURNS UUID AS $$
  SELECT p.agency_id
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE u.id = user_uuid
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

-- ============================================
-- get_user_client_id: Retorna client_id do usuário
-- ============================================
CREATE OR REPLACE FUNCTION get_user_client_id(user_uuid UUID)
RETURNS UUID AS $$
  SELECT p.client_id
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE u.id = user_uuid
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;
```

#### C.2 Criar Políticas RLS Mínimas (Total: ~10 Políticas)

**Tabela: agencies (2 políticas)**
```sql
CREATE POLICY "super_admin_full" ON agencies FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "agency_admin_own" ON agencies FOR SELECT
  USING (
    has_role(auth.uid(), 'agency_admin')
    AND id = get_user_agency_id(auth.uid())
  );
```

**Tabela: clients (3 políticas)**
```sql
CREATE POLICY "super_admin_full" ON clients FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "agency_admin_own" ON clients FOR ALL
  USING (
    has_role(auth.uid(), 'agency_admin')
    AND agency_id = get_user_agency_id(auth.uid())
  );

CREATE POLICY "client_user_view" ON clients FOR SELECT
  USING (
    has_role(auth.uid(), 'client_user')
    AND id = get_user_client_id(auth.uid())
  );
```

**Tabela: contents (3 políticas)**
```sql
CREATE POLICY "super_admin_full" ON contents FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "agency_admin_own" ON contents FOR ALL
  USING (
    has_role(auth.uid(), 'agency_admin')
    AND EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = contents.client_id
        AND clients.agency_id = get_user_agency_id(auth.uid())
    )
  );

CREATE POLICY "client_approver_view" ON contents FOR SELECT
  USING (
    (has_role(auth.uid(), 'client_user') OR has_role(auth.uid(), 'approver'))
    AND client_id = get_user_client_id(auth.uid())
  );
```

**Tabela: role_permissions (2 políticas)**
```sql
CREATE POLICY "super_admin_manage" ON role_permissions FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "all_users_read" ON role_permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);
```

#### C.3 Re-habilitar RLS
```sql
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
-- ... (todas as tabelas)
```

#### C.4 Popular role_permissions com 10 Permissões Essenciais
```sql
-- Limpar e repopular
DELETE FROM role_permissions;

-- Super Admin: Todas as 10 permissões
INSERT INTO role_permissions (role, permission_key, enabled) VALUES
  ('super_admin', 'view_content', true),
  ('super_admin', 'create_content', true),
  ('super_admin', 'edit_content', true),
  ('super_admin', 'delete_content', true),
  ('super_admin', 'approve_content', true),
  ('super_admin', 'add_comment', true),
  ('super_admin', 'manage_clients', true),
  ('super_admin', 'manage_approvers', true),
  ('super_admin', 'view_analytics', true),
  ('super_admin', 'manage_settings', true);

-- Agency Admin: 9 permissões (sem manage_settings)
INSERT INTO role_permissions (role, permission_key, enabled) VALUES
  ('agency_admin', 'view_content', true),
  ('agency_admin', 'create_content', true),
  ('agency_admin', 'edit_content', true),
  ('agency_admin', 'delete_content', true),
  ('agency_admin', 'approve_content', true),
  ('agency_admin', 'add_comment', true),
  ('agency_admin', 'manage_clients', true),
  ('agency_admin', 'manage_approvers', true),
  ('agency_admin', 'view_analytics', true);

-- Client User: 6 permissões
INSERT INTO role_permissions (role, permission_key, enabled) VALUES
  ('client_user', 'view_content', true),
  ('client_user', 'create_content', true),
  ('client_user', 'edit_content', true),
  ('client_user', 'add_comment', true),
  ('client_user', 'manage_approvers', true),
  ('client_user', 'view_analytics', true);

-- Approver: 3 permissões
INSERT INTO role_permissions (role, permission_key, enabled) VALUES
  ('approver', 'view_content', true),
  ('approver', 'approve_content', true),
  ('approver', 'add_comment', true);

-- Team Member: 5 permissões
INSERT INTO role_permissions (role, permission_key, enabled) VALUES
  ('team_member', 'view_content', true),
  ('team_member', 'create_content', true),
  ('team_member', 'edit_content', true),
  ('team_member', 'add_comment', true),
  ('team_member', 'view_analytics', true);
```

---

### FASE D: Refatoração Total do Frontend (4-6h)

#### D.1 Deletar usePermissions.ts
```bash
rm src/hooks/usePermissions.ts
```

#### D.2 Garantir useUserData.ts Existe
**Arquivo:** `src/hooks/useUserData.ts` (já criado na FASE 4 do plano incremental)

#### D.3 Refatorar TODAS as Páginas Relevantes

**Lista de Páginas para Refatorar:**
1. `src/pages/Clientes.tsx` - Listagem de clientes
2. `src/pages/ClienteDetalhes.tsx` - Detalhes do cliente
3. `src/pages/AgenciaDetalhes.tsx` - Detalhes da agência
4. `src/pages/Agencias.tsx` - Listagem de agências
5. `src/pages/Dashboard.tsx` - Dashboard (já refatorado)
6. `src/pages/ContentGrid.tsx` - Grid de conteúdos (já refatorado)
7. `src/pages/Configuracoes.tsx` - Configurações

**Padrão de Refatoração (TODOS os arquivos acima):**
```typescript
// ❌ REMOVER:
import { usePermissions } from '@/hooks/usePermissions';
const { can, loading: permissionsLoading } = usePermissions();
if (!can('permission_name')) { navigate('/dashboard'); }

// ✅ ADICIONAR:
import { useUserData } from '@/hooks/useUserData';
const { profile, role, agency, client, loading } = useUserData();

useEffect(() => {
  if (loading || !profile) return;

  // Validação inline baseada em role
  if (role === 'super_admin') {
    // Acesso total
    loadAllData();
  } else if (role === 'agency_admin') {
    // Filtrar por agency_id
    loadDataByAgency(profile.agency_id);
  } else if (role === 'client_user') {
    // Filtrar por client_id
    loadDataByClient(profile.client_id);
  } else {
    // Sem acesso
    navigate('/dashboard');
  }
}, [profile, role, loading]);
```

---

### FASE E: Validação Final e Deploy (2h)

#### E.1 Testes Completos (Mesmos da FASE 4)

**Usuário 1:** `juaumluihs@gmail.com` (super_admin)
- ✅ Login, acesso total, visualização de todos os dados

**Usuário 2:** `contato@pamboo.com.br` (agency_admin)
- ✅ Login, acesso apenas aos 2 clientes da Pamboo

**Usuário 3:** `faq@redeclassea.com.br` (client_user)
- ✅ Login, acesso apenas ao cliente "Caminho do Vale"
- ✅ Visualização dos 10+ conteúdos em aprovação

#### E.2 Monitoramento de 48h
- Monitorar logs de erro
- Verificar performance de queries
- Confirmar zero recursão RLS

---

## 7. Comparação dos Planos

| Aspecto | Plano Incremental | Plano Total (Destrutivo) |
|---------|-------------------|--------------------------|
| **Risco** | 🟢 Baixo | 🔴 Alto |
| **Tempo Estimado** | 8-12h | 12-18h |
| **Reversibilidade** | ✅ Fácil (changes isoladas) | ⚠️ Difícil (requer restore completo) |
| **Preservação de Dados** | ✅ 100% garantido | ⚠️ Requer backup cuidadoso |
| **Complexidade** | 🟢 Média | 🔴 Alta |
| **Adequado Para** | Sistema com problemas localizados | Sistema completamente quebrado |
| **Downtime** | ⚠️ Mínimo (por fase) | 🔴 Várias horas |

---

## 8. Recomendação Final

### Executar Plano Incremental Primeiro

**Justificativa:**
1. ✅ **Dados de Produção Preservados:** 3 usuários críticos com dados funcionais
2. ✅ **Problema Identificado:** Race condition em `Clientes.tsx` tem solução clara
3. ✅ **Menor Risco:** Mudanças isoladas e reversíveis
4. ✅ **Custo/Benefício:** 8-12h vs 12-18h do plano total

**Condição para Plano Total:**
- Execute apenas se **3 tentativas** do Plano Incremental falharem
- Aprovação explícita do cliente após apresentar riscos

---

## 9. Próximos Passos Imediatos

### Decisão Requerida:

**Opção A (Recomendada):**
- ✅ Executar **FASE 1** do Plano Incremental (correção de Clientes.tsx)
- Tempo: 1-2h
- Risco: Baixo

**Opção B (Alta Complexidade):**
- ⚠️ Executar **FASE 2** do Plano Incremental (funções SQL)
- Tempo: 2-3h
- Risco: Médio

**Opção C (Extrema):**
- 🔴 Executar Plano de Reestruturação Total
- Tempo: 12-18h
- Risco: Alto
- **Requer aprovação explícita**

---

## 10. Contato e Suporte

**Questões antes de prosseguir?**
- Aprovação de qual plano executar?
- Necessidade de mais detalhes técnicos?
- Preocupações sobre preservação de dados?

**Pronto para começar quando aprovado.**

---

**Fim do Relatório**
