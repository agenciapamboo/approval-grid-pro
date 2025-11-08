#!/bin/bash
set -e

echo "🚀 Iniciando execução completa de testes..."
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Testes Unitários
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 ETAPA 1/3: Testes Unitários (Vitest)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
npx vitest run
UNIT_EXIT=$?

echo ""
echo ""

# 2. Coverage
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 ETAPA 2/3: Relatório de Coverage${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
npx vitest --coverage
COVERAGE_EXIT=$?

echo ""
echo ""

# 3. Testes E2E
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🌐 ETAPA 3/3: Testes E2E (Playwright)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verificar se o servidor está rodando
if ! curl -s http://localhost:8080 > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  AVISO: Servidor não detectado em http://localhost:8080${NC}"
  echo -e "${YELLOW}   Os testes E2E serão executados, mas podem falhar se o servidor não estiver rodando.${NC}"
  echo -e "${YELLOW}   Execute 'npm run dev' em outro terminal antes dos testes E2E.${NC}"
  echo ""
fi

npx playwright test
E2E_EXIT=$?

echo ""
echo ""

# Resumo Final
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📈 RESUMO DA EXECUÇÃO${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ $UNIT_EXIT -eq 0 ]; then
  echo -e "✅ Testes Unitários: ${GREEN}PASSOU${NC}"
else
  echo -e "❌ Testes Unitários: ${RED}FALHOU${NC}"
fi

if [ $COVERAGE_EXIT -eq 0 ]; then
  echo -e "✅ Coverage: ${GREEN}PASSOU${NC}"
else
  echo -e "❌ Coverage: ${RED}FALHOU${NC}"
fi

if [ $E2E_EXIT -eq 0 ]; then
  echo -e "✅ Testes E2E: ${GREEN}PASSOU${NC}"
else
  echo -e "❌ Testes E2E: ${RED}FALHOU${NC}"
fi

echo ""

# Exit code geral
if [ $UNIT_EXIT -eq 0 ] && [ $COVERAGE_EXIT -eq 0 ] && [ $E2E_EXIT -eq 0 ]; then
  echo -e "${GREEN}🎉 SUCESSO: Todos os testes passaram!${NC}"
  exit 0
else
  echo -e "${RED}❌ FALHA: Alguns testes falharam${NC}"
  exit 1
fi
