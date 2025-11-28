# 📋 Como Aplicar a Migration de Notificações de Boas-Vindas

## Opção 1: Via Dashboard do Supabase (Recomendado)

### Passos:

1. **Acesse o Dashboard do Supabase:**
   - Vá para: https://supabase.com/dashboard/project/dhwuvhcpqlbmqnklsgjz

2. **Abra o SQL Editor:**
   - No menu lateral, clique em **SQL Editor**
   - Clique em **New query**

3. **Cole o conteúdo da migration:**
   - Abra o arquivo: `supabase/migrations/20251127222034_add_welcome_notifications.sql`
   - Copie todo o conteúdo
   - Cole no SQL Editor

4. **Execute a migration:**
   - Clique no botão **Run** ou pressione `Ctrl+Enter` (ou `Cmd+Enter` no Mac)
   - Aguarde a confirmação de sucesso

### Verificar se foi aplicada:

Execute esta query para verificar se o trigger foi criado:

```sql
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_notify_new_agency_account';
```

Você deve ver o trigger listado.

---

## Opção 2: Via Supabase CLI (Se tiver permissões)

Se você tiver acesso via CLI e estiver logado:

```bash
# 1. Login no Supabase
supabase login

# 2. Link ao projeto
supabase link --project-ref dhwuvhcpqlbmqnklsgjz

# 3. Aplicar migration
supabase db push
```

---

## O que esta migration faz:

1. ✅ Cria a função `notify_new_agency_account()` que dispara notificação quando uma nova conta de agência é criada
2. ✅ Cria o trigger `trigger_notify_new_agency_account` na tabela `profiles`
3. ✅ Remove o trigger antigo `trigger_notify_new_approver` (para evitar duplicação)

---

## Após aplicar a migration:

A migration já está aplicada automaticamente quando:
- ✅ Um novo cliente é criado (via `AddClientDialog.tsx`)
- ✅ Um novo membro da equipe é criado (via `create-team-member` edge function)
- ✅ Um novo aprovador é criado (via `AddApproverDialog.tsx`)
- ✅ Uma nova agência é criada (via `AddAgencyDialog.tsx`)
- ✅ Um novo signup é feito (via `Auth.tsx` - apenas para planos free)

O trigger do banco de dados criará automaticamente a notificação para novos signups de agências (planos pagos).

---

## Testar a funcionalidade:

1. Crie um novo cliente via interface admin
2. Verifique se uma notificação foi criada na tabela `notifications`:
   ```sql
   SELECT * FROM notifications 
   WHERE event = 'user.account_created' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

3. A notificação será processada automaticamente pela edge function `notify-event`

---

## Notas Importantes:

- ⚠️ A senha **não estará disponível** no trigger para signups de agências (planos pagos), pois o trigger roda após a criação do usuário
- ✅ Para outras criações (cliente, membro da equipe, aprovador), a senha **estará incluída** na notificação pois é criada diretamente no frontend
- 📧 As notificações serão enviadas via webhook configurado em `system_settings.internal_webhook_url`

