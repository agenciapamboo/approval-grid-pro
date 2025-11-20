export const secretsRecoveryContent = `# Guia de Recuperação de Secrets

Este guia detalha como recuperar e reconfigurar todas as secrets do sistema após uma restauração de banco de dados.

## ⚠️ Importante

**Nenhuma secret do Supabase Vault é incluída nos backups por questões de segurança.**

Após restaurar um backup, você DEVE reconfigurar manualmente as secrets críticas para que o sistema funcione corretamente.

---

## 🔴 SECRETS CRÍTICAS (Obrigatórias)

Estas secrets são essenciais. O sistema **não funcionará** sem elas.

### 1. SUPABASE_SERVICE_ROLE_KEY

**O que é:** Chave com permissões de administrador para acessar o banco de dados sem restrições de RLS.

**Como obter:**

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Copie a chave **service_role** (⚠️ **secret** - nunca exponha no frontend)

**Como configurar:**

Via Lovable Cloud:
\`\`\`bash
# No painel da Lovable, vá em:
Settings → Cloud → Secrets → Add Secret
Nome: SUPABASE_SERVICE_ROLE_KEY
Valor: [cole a chave aqui]
\`\`\`

**Tempo estimado:** 2 minutos

---

### 2. STRIPE_SECRET_KEY

**O que é:** Chave secreta da API do Stripe para processar pagamentos.

**Como obter:**

1. Acesse o [Stripe Dashboard](https://dashboard.stripe.com)
2. Vá em **Developers** → **API keys**
3. Copie a **Secret key** do ambiente desejado:
   - **Test mode**: \`sk_test_...\` (para desenvolvimento)
   - **Live mode**: \`sk_live_...\` (para produção)

**Como configurar:**

\`\`\`bash
Settings → Cloud → Secrets → Add Secret
Nome: STRIPE_SECRET_KEY
Valor: sk_test_... ou sk_live_...
\`\`\`

**⚠️ Atenção:** Se você perdeu a chave live, precisará:
1. Rolar (rotate) a chave antiga no Stripe Dashboard
2. Atualizar em todos os sistemas que a usam

**Tempo estimado:** 3 minutos

---

### 3. STRIPE_WEBHOOK_SECRET

**O que é:** Secret usado para validar que webhooks realmente vieram do Stripe.

**Como obter:**

1. Acesse [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**
2. Se o webhook ainda existe:
   - Clique no webhook
   - Vá em **Signing secret**
   - Clique em **Reveal** e copie
3. Se o webhook foi perdido:
   - Clique em **Add endpoint**
   - URL: \`https://[seu-projeto].supabase.co/functions/v1/stripe-webhook\`
   - Eventos a ouvir:
     - \`customer.subscription.created\`
     - \`customer.subscription.updated\`
     - \`customer.subscription.deleted\`
     - \`invoice.payment_succeeded\`
     - \`invoice.payment_failed\`
   - Copie o novo **Signing secret**

**Como configurar:**

\`\`\`bash
Settings → Cloud → Secrets → Add Secret
Nome: STRIPE_WEBHOOK_SECRET
Valor: whsec_...
\`\`\`

**Tempo estimado:** 5 minutos (se precisar recriar)

---

### 4. FACEBOOK_APP_SECRET

**O que é:** Secret do app do Facebook para validar tokens de autenticação e publicações.

**Como obter:**

1. Acesse [Facebook Developers](https://developers.facebook.com)
2. Selecione seu app
3. Vá em **Settings** → **Basic**
4. Clique em **Show** no campo **App Secret**
5. Digite sua senha do Facebook para confirmar

**Se você perdeu o acesso ao app:**
1. Verifique se outro admin tem acesso
2. Se não, você precisará criar um novo app no Facebook
3. Atualize o \`FACEBOOK_APP_ID\` também

**Como configurar:**

\`\`\`bash
Settings → Cloud → Secrets → Add Secret
Nome: FACEBOOK_APP_SECRET
Valor: [cole o app secret aqui]
\`\`\`

**Tempo estimado:** 3 minutos

---

### 5. ADMIN_TASK_TOKEN

**O que é:** Token interno usado para autenticar cron jobs e tarefas administrativas.

**Como obter:**

Este é um token gerado por você. Se você perdeu o original:

1. Gere um novo token seguro:
   \`\`\`bash
   # No terminal
   openssl rand -base64 32
   \`\`\`
   Ou use um gerador online: https://generate-secret.vercel.app/32

2. **IMPORTANTE:** Se você mudar este token, também precisa atualizar:
   - Todos os cron jobs que chamam edge functions administrativas
   - GitHub Actions (se houver)
   - Scripts externos que chamam funções admin

**Como configurar:**

\`\`\`bash
Settings → Cloud → Secrets → Add Secret
Nome: ADMIN_TASK_TOKEN
Valor: [token gerado]
\`\`\`

**Tempo estimado:** 5 minutos (incluindo atualização de consumidores)

---

## 🟡 SECRETS IMPORTANTES (Funcionalidades específicas)

### 6. N8N_WEBHOOK_URL

**O que é:** URL do webhook do N8N para enviar notificações internas por email/WhatsApp.

**Como obter:**

1. Acesse sua instância do N8N
2. Abra o workflow de notificações internas
3. Copie a URL do nó **Webhook**

**Alternativa:** Esta URL também pode estar salva em \`system_settings\`:
\`\`\`sql
SELECT value FROM system_settings WHERE key = 'internal_webhook_url';
\`\`\`

**Como configurar:**

\`\`\`bash
Settings → Cloud → Secrets → Add Secret
Nome: N8N_WEBHOOK_URL
Valor: https://webhook.pamboocriativos.com.br/webhook/...
\`\`\`

**Tempo estimado:** 2 minutos

---

### 7. N8N_WEBHOOK_TOKEN

**O que é:** Token de autenticação para o webhook do N8N.

**Como obter:**

1. Verifique no N8N se o webhook requer autenticação
2. Se sim, copie o token configurado lá

**Se não houver:** Você pode deixar vazio ou gerar um novo token e configurar no N8N.

**Como configurar:**

\`\`\`bash
Settings → Cloud → Secrets → Add Secret (opcional)
Nome: N8N_WEBHOOK_TOKEN
Valor: [token do N8N]
\`\`\`

**Tempo estimado:** 2 minutos

---

### 8. APROVA_API_KEY

**O que é:** API key do sistema Aprova (se integrado).

**Status:** Opcional - o sistema funciona sem esta integração.

**Como obter:**

1. Se você usa o Aprova, solicite nova chave ao suporte
2. Se não usa, pode deixar vazio

**Como configurar:**

\`\`\`bash
Settings → Cloud → Secrets → Add Secret (se necessário)
Nome: APROVA_API_KEY
Valor: [chave fornecida pelo Aprova]
\`\`\`

**Tempo estimado:** Depende do suporte do Aprova

---

## 🟢 SECRETS AUTO-GERADAS (Não requerem ação)

Estas secrets são geradas automaticamente pelo Supabase quando você cria um projeto:

9. **SUPABASE_URL** - URL base do projeto
10. **SUPABASE_ANON_KEY** - Chave pública (safe para frontend)
11. **SUPABASE_PUBLISHABLE_KEY** - Alias do anon key
12. **SUPABASE_DB_URL** - Connection string do PostgreSQL

**Nenhuma ação necessária** - o Lovable Cloud já as configura automaticamente.

---

## 📋 CHECKLIST PÓS-RESTAURAÇÃO

Use este checklist para garantir que tudo foi configurado:

### Passo 1: Validar Secrets Críticas (10 min)
- [ ] SUPABASE_SERVICE_ROLE_KEY configurada
- [ ] STRIPE_SECRET_KEY configurada
- [ ] STRIPE_WEBHOOK_SECRET configurada
- [ ] FACEBOOK_APP_SECRET configurada
- [ ] ADMIN_TASK_TOKEN configurada

### Passo 2: Validar Sistema (5 min)
- [ ] Acesse \`/admin/backups?tab=secrets\`
- [ ] Verifique se o dashboard mostra "✅ Todas as secrets críticas configuradas"
- [ ] Se houver alertas, siga as instruções

### Passo 3: Testar Funcionalidades (15 min)
- [ ] Teste login de usuário (deve funcionar após redefinir senha)
- [ ] Teste criação de conteúdo (valida acesso ao banco)
- [ ] Teste webhook do Stripe (simule um evento no Stripe Dashboard)
- [ ] Teste publicação no Facebook (se usa esta feature)
- [ ] Verifique se notificações internas chegam (N8N)

### Passo 4: Redefinir Senhas dos Usuários (20 min)
- [ ] Envie email de redefinição de senha para todos os usuários
- [ ] Ou use o Supabase Dashboard para resetar senhas manualmente
- [ ] Notifique usuários sobre a necessidade de redefinir senhas

### Passo 5: Validar Webhooks (5 min)
- [ ] Verifique URLs em \`system_settings\`:
  \`\`\`sql
  SELECT * FROM system_settings WHERE key LIKE '%webhook%';
  \`\`\`
- [ ] Atualize se necessário

**Tempo total estimado: ~55 minutos**

---

## 🆘 PROBLEMAS COMUNS

### "Erro 401: Invalid API key" ao fazer requisições

**Causa:** \`SUPABASE_SERVICE_ROLE_KEY\` incorreta ou não configurada.

**Solução:**
1. Verifique se a secret está configurada
2. Confirme que copiou a chave **service_role** (não a anon key)
3. Re-deploy das edge functions: vá em Cloud → Functions → Deploy All

---

### "Stripe webhook signature invalid"

**Causa:** \`STRIPE_WEBHOOK_SECRET\` incorreta.

**Solução:**
1. Vá no Stripe Dashboard → Webhooks
2. Copie o signing secret correto
3. Atualize a secret no Lovable Cloud
4. Teste enviando um evento de teste do Stripe

---

### Usuários não conseguem fazer login

**Causa:** Senhas não foram exportadas (por segurança).

**Solução:**
1. Envie link de "Esqueci minha senha" para todos os usuários
2. Ou use Supabase Dashboard:
   - Authentication → Users
   - Clique no usuário → Send password reset email

---

### Notificações internas não chegam

**Causa:** \`N8N_WEBHOOK_URL\` incorreta ou N8N offline.

**Solução:**
1. Teste a URL manualmente com curl:
   \`\`\`bash
   curl -X POST [N8N_WEBHOOK_URL] \\
     -H "Content-Type: application/json" \\
     -d '{"type":"test","message":"Teste"}'
   \`\`\`
2. Verifique se o N8N está rodando
3. Atualize a URL em \`system_settings\` se mudou

---

### Cron jobs não executam

**Causa:** \`ADMIN_TASK_TOKEN\` não configurado ou incorreto.

**Solução:**
1. Configure o token conforme instruções acima
2. Verifique logs das edge functions para ver erros de autenticação
3. Se mudou o token, atualize consumidores (GitHub Actions, etc.)

---

## 📞 SUPORTE

Se você seguiu todos os passos e ainda tem problemas:

1. **Verifique logs das edge functions:**
   - Cloud → Functions → [função com erro] → Logs

2. **Execute validação automática:**
   - Acesse \`/admin/backups?tab=secrets\`
   - Clique em "Revalidar"

3. **Consulte documentação adicional:**
   - [Supabase Docs - Secrets](https://supabase.com/docs/guides/functions/secrets)
   - [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)

4. **Contate o time:**
   - Email: suporte@pamboocriativos.com.br
   - Forneça:
     - Screenshot da tela de validação de secrets
     - Logs das edge functions com erro
     - Passos que você já tentou

---

## 🔒 BOAS PRÁTICAS DE SEGURANÇA

1. **Nunca commite secrets no Git**
   - Secrets devem estar APENAS no Supabase Vault
   - Use \`.env\` apenas para desenvolvimento local

2. **Rotacione secrets periodicamente**
   - Stripe keys: a cada 6 meses
   - ADMIN_TASK_TOKEN: a cada ano
   - Após qualquer incidente de segurança

3. **Use ambientes separados**
   - Test keys para desenvolvimento
   - Live keys apenas em produção
   - Nunca misture os dois

4. **Monitore uso das APIs**
   - Stripe Dashboard mostra todas as chamadas
   - Supabase mostra logs de edge functions
   - Configure alertas para uso anômalo

5. **Documente mudanças**
   - Sempre que mudar uma secret, documente:
     - Data da mudança
     - Razão (rotação programada, incidente, etc.)
     - Quem fez a mudança

---

**Última atualização:** 2025-11-20  
**Versão:** 1.0
`;
