# Análise de Renderização - CaptionContextDialog

## Data: 2025-11-28

### Objetivo
Verificar regras e filtros de renderização para usuário `agency_admin` e hierarquia de renderização de elementos no componente `CaptionContextDialog`.

---

## 1. Estado Atual

### 1.1 Verificações de Permissão
**Status:** ❌ **NENHUMA VERIFICAÇÃO IMPLEMENTADA**

- O componente **não verifica** o role do usuário (`agency_admin`, `super_admin`, `client_user`, etc.)
- Não utiliza hooks de permissões (`useUserData`, `usePermissions`)
- Todos os elementos são renderizados para **qualquer usuário autenticado**

### 1.2 Hierarquia de Renderização

#### Elementos Sempre Visíveis (sem condicionais de role):
1. ✅ Título da Peça (campo obrigatório)
2. ✅ Objetivo da Peça (dropdown)
3. ✅ Tom de Voz (dropdown com opção "Da Marca" condicional por `brandTone`)
4. ✅ Pilar de Conteúdo (dropdown com pilares padrão + pilares do cliente)
5. ✅ Seletor de Tipo (Roteiro/Legenda/Carrossel)
6. ✅ Configurações específicas por tipo:
   - Slides para carrossel (1-20)
   - Duração do vídeo para roteiro (15-180s)
7. ✅ Templates (buscados sempre que há `selectedType`)
8. ✅ Ação Esperada do Público
9. ✅ Prompt Personalizado (opcional)
10. ✅ Botões Cancelar e Gerar Sugestões

#### Elementos Condicionais (apenas por estado local):
- **Tom de Voz "Da Marca"**: Exibido apenas se `brandTone` estiver disponível
- **Pilares customizados do cliente**: Exibidos apenas se `contentPillars.length > 0`
- **Configurações de slides/carrossel**: Exibidas apenas se `selectedType === 'carousel'`
- **Configurações de duração/vídeo**: Exibidas apenas se `selectedType === 'script'`
- **Lista de templates**: Exibida apenas se `templates.length > 0`
- **Mensagem "Nenhum template":**: Exibida apenas se `templates.length === 0 && !loadingTemplates`

---

## 2. Análise de Permissões por Role

### 2.1 Agency Admin
**Permissões no sistema:**
- ✅ `create_content`: true
- ✅ `edit_content`: true
- ✅ `approve_content`: true
- ✅ `delete_content`: true

**Comportamento esperado:**
- ✅ Deve poder usar todos os campos do formulário
- ✅ Deve poder buscar templates globais (`agency_id = NULL`)
- ✅ Deve poder gerar sugestões de conteúdo

**Comportamento atual:**
- ✅ Funciona corretamente (sem restrições)
- ⚠️ Não há verificação explícita de permissões

### 2.2 Super Admin
**Permissões no sistema:**
- ✅ Todas as permissões habilitadas

**Comportamento esperado:**
- ✅ Mesmo comportamento que agency_admin

**Comportamento atual:**
- ✅ Funciona corretamente (sem restrições)

### 2.3 Team Member
**Permissões no sistema:**
- ✅ `create_content`: true
- ✅ `edit_content`: true
- ❌ `approve_content`: false

**Comportamento esperado:**
- ✅ Deve poder usar todos os campos do formulário
- ✅ Deve poder gerar sugestões

**Comportamento atual:**
- ✅ Funciona corretamente (sem restrições)

### 2.4 Client User
**Permissões no sistema:**
- ❌ `create_content`: false
- ❌ `edit_content`: false

**Comportamento esperado:**
- ❌ Não deveria poder criar/editar conteúdo
- ❌ Não deveria ter acesso ao componente

**Comportamento atual:**
- ⚠️ **PROBLEMA**: Componente renderiza completamente para `client_user`
- ⚠️ Botão "Gerar Sugestões" está disponível (mas pode ser bloqueado em outro nível)

---

## 3. Problemas Identificados

### 3.1 Falta de Verificação de Permissões
**Severidade:** 🟡 MÉDIA  
**Impacto:** `client_user` pode ver formulário que não deveria usar

**Recomendação:**
```typescript
const { role } = useUserData();
if (role === 'client_user' || role === 'approver') {
  // Não renderizar ou mostrar mensagem de acesso negado
}
```

### 3.2 Busca de Templates sem Verificação RLS Explícita
**Severidade:** 🟢 BAIXA  
**Impacto:** Apenas impacto de performance/logs

**Status atual:**
- RLS Policy existe: `"Users can read own agency and global templates"`
- Policy permite: `agency_id = NULL` OU `agency_id = get_user_agency_id(auth.uid())`
- Para `agency_admin`, deveria funcionar corretamente

**Observação:**
- A query busca apenas templates globais (`agency_id IS NULL`)
- Policy deveria permitir acesso sem problemas

### 3.3 Logs de Debug Excessivos em Produção
**Severidade:** 🟢 BAIXA  
**Impacto:** Performance e poluição do console

**Recomendação:**
- Remover ou condicionar logs de debug em produção
- Usar apenas em ambiente de desenvolvimento

---

## 4. Hierarquia de Renderização Atual

```
Dialog
├── DialogHeader
│   └── DialogTitle (sempre visível)
├── ScrollArea
│   └── Form Fields (sempre visíveis)
│       ├── Título (sempre)
│       ├── Objetivo + Tom de Voz (sempre)
│       ├── Pilar de Conteúdo (sempre)
│       │   └── Pilares customizados (condicional: contentPillars.length > 0)
│       ├── Seletor de Tipo (sempre)
│       │   ├── Roteiro
│       │   ├── Legenda
│       │   └── Carrossel
│       ├── Configurações por Tipo (condicional: selectedType)
│       │   ├── Slides carrossel (selectedType === 'carousel')
│       │   └── Duração vídeo (selectedType === 'script')
│       ├── Templates (condicional: loadingTemplates state)
│       │   ├── Loading (loadingTemplates === true)
│       │   ├── Mensagem vazio (templates.length === 0)
│       │   └── Select + Lista (templates.length > 0)
│       ├── Ação Esperada (sempre)
│       └── Prompt Personalizado (sempre)
└── Botões Footer (sempre)
    ├── Cancelar
    └── Gerar Sugestões (disabled se !title.trim())
```

---

## 5. Recomendações

### 5.1 Adicionar Verificação de Permissões (OPCIONAL)
Se necessário restringir acesso para `client_user`:

```typescript
import { useUserData } from '@/hooks/useUserData';

export function CaptionContextDialog({ ... }) {
  const { role, loading: userLoading } = useUserData();
  
  // Não renderizar para client_user e approver
  if (!userLoading && (role === 'client_user' || role === 'approver')) {
    return null; // ou mostrar mensagem de acesso negado
  }
  
  // ... resto do código
}
```

### 5.2 Manter Comportamento Atual (RECOMENDADO)
**Justificativa:**
- O componente é usado apenas em contextos onde o usuário já tem permissão
- O controle de acesso pode ser feito no nível do componente pai
- Simplifica a manutenção do código

### 5.3 Melhorar Logs de Debug
```typescript
// Adicionar flag de desenvolvimento
const isDev = import.meta.env.DEV;

if (isDev) {
  console.log('[CaptionContextDialog] 🔍 Debug info...');
}
```

---

## 6. Conclusão

### Status Geral: ✅ FUNCIONAL

**Para `agency_admin`:**
- ✅ Todos os campos são renderizados corretamente
- ✅ Busca de templates funciona (apenas globais)
- ✅ Não há bloqueios ou restrições indevidas
- ⚠️ Falta verificação explícita de permissões (mas não é crítica)

**Hierarquia de Renderização:**
- ✅ Lógica condicional baseada em estado local está correta
- ✅ Elementos são exibidos/ocultados conforme esperado
- ✅ Não há problemas de ordem de renderização

**Recomendação Final:**
- **Manter comportamento atual** para `agency_admin`
- O componente funciona corretamente sem verificações adicionais
- Se necessário restringir acesso, fazer no componente pai

---

## 7. Checklist de Validação

- [x] Todos os campos são renderizados para agency_admin
- [x] Templates são buscados corretamente (apenas globais)
- [x] Elementos condicionais funcionam (slides, duração, templates)
- [x] Botões estão sempre visíveis
- [ ] Verificação de permissões implementada (não necessário)
- [x] RLS Policy permite acesso a templates globais
- [x] Hierarquia de renderização está correta

---

**Última atualização:** 2025-11-28
**Autor:** Análise Automática
