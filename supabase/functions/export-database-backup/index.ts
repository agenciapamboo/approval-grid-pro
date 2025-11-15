import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔄 Iniciando backup completo do banco de dados...');

    // Lista completa de todas as tabelas do sistema
    const tables = [
      // Tabelas principais
      'profiles', 'agencies', 'clients', 'contents', 'content_media', 'content_texts',
      'content_history', 'comments', 'client_approvers', 'approval_tokens', 'notifications',
      
      // Autenticação e segurança
      'user_roles', 'role_permissions', 'client_sessions', 'two_factor_codes', 
      'token_validation_attempts', 'trusted_ips', 'security_alerts_sent',
      
      // Configurações e permissões
      'plan_entitlements', 'plan_permissions', 'user_preferences', 'system_settings',
      'lovable_plan_config', 'kanban_columns',
      
      // Notificações e comunicação
      'platform_notifications', 'webhooks', 'content_suggestions_feedback',
      
      // Suporte e tickets
      'support_tickets', 'ticket_messages', 'client_notes',
      
      // Financeiro
      'financial_snapshots', 'revenue_taxes', 'operational_costs',
      
      // Integrações e rastreamento
      'client_social_accounts', 'conversion_events', 'tracking_pixels',
      
      // LGPD
      'consents', 'lgpd_pages',
      
      // Outros
      'creative_requests', 'activity_log'
    ];

    let sqlBackup = `-- ========================================\n`;
    sqlBackup += `-- BACKUP COMPLETO DO BANCO DE DADOS\n`;
    sqlBackup += `-- Data: ${new Date().toISOString()}\n`;
    sqlBackup += `-- Projeto Original: sgarwrreywadxsodnxng\n`;
    sqlBackup += `-- Projeto Destino: dhwuvhcpqlbmqnklsgjz\n`;
    sqlBackup += `-- ========================================\n\n`;

    sqlBackup += `-- INSTRUÇÕES DE USO:\n`;
    sqlBackup += `-- 1. Execute este script no NOVO banco de dados (dhwuvhcpqlbmqnklsgjz)\n`;
    sqlBackup += `-- 2. Certifique-se de que todas as migrations já foram aplicadas\n`;
    sqlBackup += `-- 3. Execute este SQL via psql ou Supabase SQL Editor\n\n`;

    sqlBackup += `-- DESABILITAR TRIGGERS TEMPORARIAMENTE\n`;
    sqlBackup += `SET session_replication_role = 'replica';\n\n`;

    let totalRecords = 0;
    const tableStats: Record<string, number> = {};

    // Para cada tabela, exportar dados
    for (const table of tables) {
      try {
        console.log(`📦 Exportando tabela: ${table}`);
        
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(10000); // Limite de segurança
        
        if (error) {
          console.warn(`⚠️  Erro ao exportar ${table}:`, error.message);
          sqlBackup += `-- ⚠️  Tabela ${table}: ${error.message}\n\n`;
          continue;
        }

        if (!data || data.length === 0) {
          sqlBackup += `-- Tabela ${table}: VAZIA\n\n`;
          tableStats[table] = 0;
          continue;
        }

        tableStats[table] = data.length;
        totalRecords += data.length;

        sqlBackup += `-- ========================================\n`;
        sqlBackup += `-- Tabela: ${table}\n`;
        sqlBackup += `-- Registros: ${data.length}\n`;
        sqlBackup += `-- ========================================\n\n`;

        // Gerar INSERTs
        for (const row of data) {
          const columns = Object.keys(row);
          const values = columns.map(col => {
            const value = row[col];
            
            if (value === null) return 'NULL';
            if (typeof value === 'string') {
              // Escapar aspas simples
              const escaped = value.replace(/'/g, "''");
              return `'${escaped}'`;
            }
            if (typeof value === 'boolean') return value ? 'true' : 'false';
            if (value instanceof Date) return `'${value.toISOString()}'`;
            if (typeof value === 'object') {
              // Arrays e JSONs
              const jsonStr = JSON.stringify(value).replace(/'/g, "''");
              return `'${jsonStr}'::jsonb`;
            }
            return value;
          });

          sqlBackup += `INSERT INTO public.${table} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;\n`;
        }

        sqlBackup += `\n`;
        console.log(`✅ ${table}: ${data.length} registros exportados`);
        
      } catch (err) {
        const error = err as Error;
        console.error(`❌ Erro exportando ${table}:`, err);
        sqlBackup += `-- ❌ ERRO em ${table}: ${error.message}\n\n`;
      }
    }

    // Exportar usuários do auth.users (apenas metadados)
    sqlBackup += `-- ========================================\n`;
    sqlBackup += `-- USUÁRIOS (auth.users)\n`;
    sqlBackup += `-- ========================================\n`;
    sqlBackup += `-- ⚠️  ATENÇÃO: A tabela auth.users NÃO pode ser exportada diretamente\n`;
    sqlBackup += `-- Os usuários precisarão:\n`;
    sqlBackup += `-- 1. Se re-cadastrar no novo sistema OU\n`;
    sqlBackup += `-- 2. Você precisará criar manualmente via Supabase Dashboard\n\n`;

    try {
      const { data: authData } = await supabase.auth.admin.listUsers();
      
      if (authData?.users) {
        sqlBackup += `-- Total de usuários encontrados: ${authData.users.length}\n`;
        sqlBackup += `-- Lista de emails para referência:\n`;
        authData.users.forEach(user => {
          sqlBackup += `-- - ${user.email} (ID: ${user.id})\n`;
        });
      }
    } catch (err) {
      const error = err as Error;
      sqlBackup += `-- Erro ao listar usuários: ${error.message}\n`;
    }

    sqlBackup += `\n\n`;

    // Reabilitar triggers
    sqlBackup += `-- REABILITAR TRIGGERS\n`;
    sqlBackup += `SET session_replication_role = 'origin';\n\n`;

    // Estatísticas finais
    sqlBackup += `-- ========================================\n`;
    sqlBackup += `-- ESTATÍSTICAS DO BACKUP\n`;
    sqlBackup += `-- ========================================\n`;
    sqlBackup += `-- Total de registros: ${totalRecords}\n`;
    sqlBackup += `-- Total de tabelas: ${Object.keys(tableStats).length}\n\n`;
    sqlBackup += `-- Distribuição por tabela:\n`;
    Object.entries(tableStats)
      .sort(([, a], [, b]) => b - a)
      .forEach(([table, count]) => {
        sqlBackup += `-- ${table}: ${count} registros\n`;
      });

    sqlBackup += `\n-- Backup concluído: ${new Date().toISOString()}\n`;

    console.log(`✅ Backup completo gerado: ${totalRecords} registros de ${Object.keys(tableStats).length} tabelas`);

    return new Response(sqlBackup, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/sql',
        'Content-Disposition': `attachment; filename="backup-completo-${new Date().toISOString().split('T')[0]}.sql"`,
      },
    });
    
  } catch (err) {
    const error = err as Error;
    console.error('❌ Erro ao gerar backup:', err);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
