# Correção de Recursão Infinita em Políticas RLS

## 🔴 PROBLEMA CRÍTICO IDENTIFICADO

O sistema tinha **mais de 20 políticas RLS** que causavam recursão infinita ao fazer SELECT em `profiles` dentro das próprias verificações de política.

### Exemplo do Problema (ANTES):
```sql
-- ❌ ERRADO - Causa recursão infinita
CREATE POLICY "Agency admins can view their agency"
ON agencies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles  -- ⚠️ Consulta profiles dentro da política!
    WHERE profiles.id = auth.uid()
      AND profiles.agency_id = agencies.id
  )
);
```

**Por que causa recursão?**
1. Usuário tenta acessar `agencies`
2. Policy verifica → precisa consultar `profiles`
3. `profiles` tem suas próprias policies
4. Policies de `profiles` fazem SELECT em `profiles` → LOOP INFINITO! 🔄

### Erro Resultante:
```
"infinite recursion detected in policy for relation \"profiles\""
```

---

## ✅ SOLUÇÃO IMPLEMENTADA

### 1. Criar Funções SECURITY DEFINER

Funções com `SECURITY DEFINER` executam com privilégios do dono (sem RLS), quebrando a recursão:

```sql
-- ✅ CORRETO - Função SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_user_agency_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT agency_id
  FROM public.profiles
  WHERE id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_user_client_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id
  FROM public.profiles
  WHERE id = _user_id;
$$;
```

### 2. Substituir Políticas Recursivas

```sql
-- ✅ CORRETO - Usa função SECURITY DEFINER
CREATE POLICY "Agency admins can view their agency"
ON agencies
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'agency_admin') 
  AND id = public.get_user_agency_id(auth.uid())  -- ← Função, não SELECT!
);
```

---

## 📋 POLÍTICAS CORRIGIDAS

### Tabelas Afetadas:
1. ✅ **profiles** - Políticas recursivas removidas
2. ✅ **agencies** - 3 políticas corrigidas
3. ✅ **client_notes** - 1 política corrigida
4. ✅ **client_social_accounts** - 2 políticas corrigidas
5. ✅ **comments** - 3 políticas corrigidas
6. ✅ **content_media** - 4 políticas corrigidas
7. ✅ **content_texts** - 2 políticas corrigidas
8. ✅ **content_suggestions_feedback** - 1 política corrigida

**Total: 20+ políticas corrigidas**

---

## 🚫 REGRAS PARA EVITAR RECURSÃO NO FUTURO

### ❌ NUNCA FAÇA ISSO:
```sql
-- ERRADO: SELECT na mesma tabela dentro da policy
CREATE POLICY "users_policy" ON profiles
USING (
  EXISTS (SELECT 1 FROM profiles WHERE ...)  -- ❌ RECURSÃO!
);

-- ERRADO: Verificar dados do usuário atual via SELECT
CREATE POLICY "agency_policy" ON clients
USING (
  agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())  -- ❌ RECURSÃO!
);
```

### ✅ SEMPRE FAÇA ISSO:
```sql
-- CORRETO: Usar função SECURITY DEFINER
CREATE POLICY "agency_policy" ON clients
USING (
  agency_id = public.get_user_agency_id(auth.uid())  -- ✅ SEM RECURSÃO
);

-- CORRETO: Verificação direta sem JOIN em profiles
CREATE POLICY "users_policy" ON profiles
USING (
  id = auth.uid()  -- ✅ Verifica apenas UUID
);
```

---

## 🔍 COMO DETECTAR RECURSÃO

### Teste Manual:
```sql
-- Consulta que expõe recursão
SELECT * FROM profiles WHERE id = auth.uid();
-- Se retornar erro "infinite recursion", há problema!
```

### Logs do Sistema:
```
❌ Error loading profile: {
  "code": "42P17",
  "message": "infinite recursion detected in policy for relation \"profiles\""
}
```

---

## 📚 REFERÊNCIAS

- [Supabase RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Security Definer Functions](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)
- [Avoiding RLS Recursion](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view)

---

## ⚠️ IMPORTANTE

Este problema já ocorreu **MÚLTIPLAS VEZES** no projeto. Para evitar recorrência:

1. **SEMPRE** revisar policies antes de deploy
2. **NUNCA** fazer SELECT em `profiles` dentro de policies
3. **USAR** funções `SECURITY DEFINER` para dados do usuário
4. **TESTAR** login após mudanças em RLS

---

**Última Atualização:** 2025-11-13  
**Responsável:** Sistema de correção automática  
**Status:** ✅ Corrigido e documentado
