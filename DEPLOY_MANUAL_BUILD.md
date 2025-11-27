# Deploy Manual via Build Local

## Passo 1: Fazer Build Local

```bash
cd /Users/jarvis/Documents/aprovacriativos/approval-grid-pro

# Instalar dependências (se necessário)
npm install

# Fazer build de produção
npm run build
```

**O que vai acontecer:**
- Vite vai compilar o projeto
- Arquivos otimizados vão para pasta `dist/`
- Demora ~1-2 minutos

---

## Passo 2: Testar Build Localmente (Opcional)

```bash
npm run preview
```

- Abre o build em: http://localhost:4173
- Teste o assistente de IA
- Se funcionar, prossiga para deploy

---

## Passo 3: Deploy via Lovable CLI (se disponível)

```bash
# Se o Lovable tem CLI
lovable deploy

# Ou
lovable deploy --prod
```

---

## Passo 4: Deploy via Vercel CLI (alternativa)

```bash
# Instalar Vercel CLI (se não tiver)
npm install -g vercel

# Fazer login
vercel login

# Deploy
vercel --prod
```

---

## Passo 5: Deploy via Upload Manual

Se nada acima funcionar, você pode fazer upload manual da pasta `dist/`:

1. **Acesse o dashboard do seu hosting** (Lovable/Vercel/Netlify)
2. **Procure por**: "Upload build" ou "Manual deploy"
3. **Faça upload** da pasta `dist/` inteira
4. **Aguarde processamento**

---

## ⚠️ IMPORTANTE

Depois de qualquer deploy, sempre:
1. **Aguarde 1-2 minutos** para propagação
2. **Hard Reload** no navegador (Cmd+Shift+R)
3. **Limpe cache** se necessário (Cmd+Shift+Delete)

