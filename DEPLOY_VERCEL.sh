#!/bin/bash

# Script de Deploy Manual para Vercel
# Execute: bash DEPLOY_VERCEL.sh

echo "🚀 Iniciando deploy manual para Vercel..."
echo ""

# Verificar se Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI não encontrado. Instalando..."
    npm install -g vercel
fi

echo "✅ Vercel CLI encontrado!"
echo ""

# Fazer login (se necessário)
echo "🔑 Verificando autenticação..."
vercel whoami || vercel login

echo ""
echo "🚀 Fazendo deploy para PRODUÇÃO..."
echo ""

# Deploy
vercel --prod

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "🎯 Próximos passos:"
echo "   1. Abra a URL fornecida pelo Vercel"
echo "   2. Faça Hard Reload (Cmd+Shift+R)"
echo "   3. Teste o assistente de IA"
echo ""

