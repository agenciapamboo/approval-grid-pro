# 🚀 Deploy Manual via Lovable Dashboard

## Método 1: Forçar Redeploy via Interface

### Passo 1: Acessar Lovable
1. Acesse: **https://lovable.dev**
2. Faça login
3. Abra o projeto **"approval-grid-pro"**

### Passo 2: Ir para Deployments
1. No menu lateral, procure por:
   - **"Deployments"** ou
   - **"Deploy"** ou
   - **Ícone de foguete 🚀**

### Passo 3: Forçar Novo Deploy
1. Clique em:
   - **"Redeploy"** ou
   - **"Deploy from main"** ou
   - **"Trigger New Deployment"**
   
2. Selecione a branch: **main**

3. Clique em **"Deploy"** ou **"Start Deployment"**

### Passo 4: Aguardar Build
- O Lovable vai detectar o novo commit: `63cefad`
- Build leva ~2-5 minutos
- Você verá logs em tempo real

### Passo 5: Verificar Deploy
1. Quando completar, aparecerá: ✅ **Deployed Successfully**
2. Clique no link de **preview/production**
3. Ou acesse sua URL de produção diretamente

---

## Método 2: Via GitHub Integration (se configurado)

Se o Lovable está conectado ao seu GitHub:

1. **O push que você fez já deveria ter disparado** um deploy automático
2. Verifique em: **Lovable Dashboard > Deployments**
3. Procure pelo commit: `63cefad - fix: Processa corretamente sugestões`

Se não disparou automaticamente:
- Pode haver um problema com a integração
- Use o **Método 1** acima para forçar manualmente

---

## Método 3: Configurar Webhook (para deploys futuros)

Para garantir que futuros pushes disparem deploy automático:

1. **Lovable Dashboard** > Settings > Integrations
2. Procure por **GitHub Webhook** ou **Auto Deploy**
3. Habilite e configure para:
   - Branch: `main`
   - Trigger: `on push`

---

## 🎯 Após Deploy Completar

1. **Aguarde 30-60 segundos** para propagação CDN
2. **Abra sua aplicação** em produção
3. **Hard Reload**: Cmd+Shift+R (Mac) ou Ctrl+Shift+R (Windows)
4. **Limpe cache** se necessário:
   - Chrome: Cmd+Shift+Delete > "Cached images"
   
5. **Teste o assistente de IA**:
   - Clique no botão verde ✨
   - Gere sugestões
   - Verifique se o dialog bonito aparece! 🎨

---

## ⚠️ Troubleshooting

### Deploy não aparece?
- Verifique se está logado com a conta correta
- Confirme que o projeto está na sua organização/workspace

### Deploy falhou?
- Clique em "View Logs" para ver o erro
- Geralmente são problemas de:
  - Variáveis de ambiente faltando
  - Erro de build (TypeScript, etc)

### Dialog não aparece após deploy?
1. **Hard reload** (Cmd+Shift+R)
2. Abra DevTools (F12) > Console
3. Procure por erros em vermelho
4. Me envie os erros se houver

