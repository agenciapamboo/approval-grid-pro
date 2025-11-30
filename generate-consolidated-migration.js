#!/usr/bin/env node

/**
 * Script para consolidar todas as migrações SQL em um único arquivo
 * Uso: node generate-consolidated-migration.js
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = './supabase/migrations';
const OUTPUT_FILE = './MIGRATION_CONSOLIDADA_SUPABASE.sql';

console.log('🔄 Consolidando migrações SQL...\n');

// Ler todos os arquivos .sql da pasta de migrações
const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
  .filter(file => file.endsWith('.sql'))
  .sort(); // Já estão ordenados por timestamp no nome

console.log(`📁 Encontrados ${migrationFiles.length} arquivos de migração\n`);

// Cabeçalho do arquivo consolidado
let consolidatedSQL = `-- ========================================
-- SCRIPT SQL CONSOLIDADO - TODAS AS MIGRAÇÕES
-- ========================================
-- Projeto: Pamboo Social Media Management Platform
-- Total de migrações: ${migrationFiles.length}
-- Gerado em: ${new Date().toISOString()}
-- 
-- PARA APLICAR NO NOVO SUPABASE:
-- 1. Acesse: https://hdbfdzgetfkynvbqhgsd.supabase.co/project/hdbfdzgetfkynvbqhgsd/editor
-- 2. Vá em SQL Editor → New Query
-- 3. Cole TODO este conteúdo
-- 4. Execute (pode levar 5-10 minutos)
-- 
-- IMPORTANTE:
-- - Execute em uma única transação (BEGIN/COMMIT já incluídos)
-- - Se houver erro, o Supabase fará rollback automático
-- - Não execute parcialmente - sempre execute o arquivo completo
-- ========================================

BEGIN;

`;

// Processar cada arquivo de migração
migrationFiles.forEach((file, index) => {
  console.log(`  ${index + 1}/${migrationFiles.length} - ${file}`);
  
  const filePath = path.join(MIGRATIONS_DIR, file);
  const sqlContent = fs.readFileSync(filePath, 'utf8');
  
  consolidatedSQL += `\n-- ========================================\n`;
  consolidatedSQL += `-- MIGRAÇÃO ${index + 1}: ${file}\n`;
  consolidatedSQL += `-- ========================================\n\n`;
  consolidatedSQL += sqlContent.trim();
  consolidatedSQL += '\n\n';
});

// Rodapé
consolidatedSQL += `-- ========================================\n`;
consolidatedSQL += `-- FIM DAS MIGRAÇÕES\n`;
consolidatedSQL += `-- Total: ${migrationFiles.length} migrações aplicadas\n`;
consolidatedSQL += `-- ========================================\n\n`;
consolidatedSQL += `COMMIT;\n`;

// Salvar arquivo consolidado
fs.writeFileSync(OUTPUT_FILE, consolidatedSQL, 'utf8');

console.log(`\n✅ Arquivo consolidado gerado com sucesso!\n`);
console.log(`📄 Arquivo: ${OUTPUT_FILE}`);
console.log(`📊 Total de migrações: ${migrationFiles.length}`);
console.log(`💾 Tamanho: ${(consolidatedSQL.length / 1024).toFixed(2)} KB\n`);
console.log(`🚀 Próximos passos:`);
console.log(`   1. Abra o arquivo ${OUTPUT_FILE}`);
console.log(`   2. Copie todo o conteúdo`);
console.log(`   3. Cole no SQL Editor do novo Supabase`);
console.log(`   4. Execute e aguarde a conclusão\n`);
