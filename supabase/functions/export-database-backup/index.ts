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
      'login_validation_attempts',
      
      // Configurações e permissões
      'plan_entitlements', 'plan_permissions', 'user_preferences', 'system_settings',
      'lovable_plan_config', 'kanban_columns',
      
      // Notificações e comunicação
      'platform_notifications', 'webhooks', 'content_suggestions_feedback',
      'webhook_events',
      
      // Suporte e tickets
      'support_tickets', 'ticket_messages', 'client_notes',
      
      // Financeiro
      'financial_snapshots', 'revenue_taxes', 'operational_costs',
      
      // Integrações e rastreamento
      'client_social_accounts', 'conversion_events', 'tracking_pixels',
      
      // LGPD
      'consents', 'lgpd_pages',
      
      // IA (Sistema de Inteligência Artificial)
      'ai_configurations', 'ai_text_templates', 'ai_usage_logs',
      'briefing_templates', 'client_ai_profiles',
      
      // Equipe
      'team_member_functions',
      
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

    // Mapeamento de colunas text[] por tabela
    const textArrayColumns: Record<string, string[]> = {
      'contents': ['channels'],
      'agency_caption_cache': ['hashtags', 'tone'],
      'ai_text_templates': ['tone'],
      'client_ai_profiles': ['best_posting_times', 'content_pillars', 'keywords', 'priority_themes', 'tone_of_voice'],
      'conversion_events': ['content_ids', 'platforms'],
    };

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
              // Verificar se é coluna text[]
              const isTextArray = textArrayColumns[table]?.includes(col);
              
              if (Array.isArray(value) && isTextArray) {
                // text[] - usar sintaxe ARRAY[...]::text[]
                if (value.length === 0) return `ARRAY[]::text[]`;
                const arrayValues = value.map(v => `'${String(v).replace(/'/g, "''")}'`).join(',');
                return `ARRAY[${arrayValues}]::text[]`;
              } else {
                // JSONB - manter sintaxe atual
                const jsonStr = JSON.stringify(value).replace(/'/g, "''");
                return `'${jsonStr}'::jsonb`;
              }
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

    // Exportar usuários do auth.users (apenas metadados, SEM SENHAS)
    sqlBackup += `-- ========================================\n`;
    sqlBackup += `-- USUÁRIOS (auth.users)\n`;
    sqlBackup += `-- ========================================\n`;
    sqlBackup += `-- ⚠️  SEGURANÇA: Senhas NÃO são exportadas\n`;
    sqlBackup += `-- Todos os usuários precisarão REDEFINIR suas senhas após restauração\n`;
    sqlBackup += `-- Procedimento recomendado:\n`;
    sqlBackup += `-- 1. Restaurar usuários via SQL abaixo (sem senhas)\n`;
    sqlBackup += `-- 2. Enviar link de "esqueci minha senha" para todos os usuários\n`;
    sqlBackup += `-- 3. Ou usar Supabase Dashboard para resetar senhas manualmente\n\n`;

    try {
      const { data: authData } = await supabase.auth.admin.listUsers();
      
      if (authData?.users) {
        sqlBackup += `-- Total de usuários: ${authData.users.length}\n\n`;
        
        // Exportar metadados de usuários SEM senhas
        for (const user of authData.users) {
          sqlBackup += `-- Usuário: ${user.email}\n`;
          sqlBackup += `INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, raw_user_meta_data, aud, role)\n`;
          sqlBackup += `VALUES (\n`;
          sqlBackup += `  '${user.id}',\n`;
          sqlBackup += `  '${user.email}',\n`;
          sqlBackup += `  ${user.email_confirmed_at ? `'${user.email_confirmed_at}'` : 'NULL'},\n`;
          sqlBackup += `  '${user.created_at}',\n`;
          sqlBackup += `  '${user.updated_at}',\n`;
          sqlBackup += `  '${JSON.stringify(user.user_metadata || {}).replace(/'/g, "''")}'::jsonb,\n`;
          sqlBackup += `  'authenticated',\n`;
          sqlBackup += `  'authenticated'\n`;
          sqlBackup += `) ON CONFLICT (id) DO NOTHING;\n`;
          sqlBackup += `-- ⚠️ Senha removida por segurança - usuário deve redefinir\n\n`;
        }
      }
    } catch (err) {
      const error = err as Error;
      sqlBackup += `-- Erro ao listar usuários: ${error.message}\n`;
    }

    sqlBackup += `\n`;
    
    // Adicionar seção sobre SECRETS não incluídas
    sqlBackup += `-- ========================================\n`;
    sqlBackup += `-- ⚠️  SECRETS NÃO INCLUÍDAS NESTE BACKUP\n`;
    sqlBackup += `-- ========================================\n`;
    sqlBackup += `-- As seguintes secrets do Supabase Vault NÃO estão incluídas por segurança.\n`;
    sqlBackup += `-- Você DEVE reconfigurá-las manualmente após a restauração.\n\n`;
    
    sqlBackup += `-- 🔴 CRÍTICAS (sistema não funciona sem estas):\n`;
    sqlBackup += `--   1. SUPABASE_SERVICE_ROLE_KEY - Service role do projeto Supabase\n`;
    sqlBackup += `--   2. STRIPE_SECRET_KEY - Secret key do Stripe (test ou prod)\n`;
    sqlBackup += `--   3. STRIPE_WEBHOOK_SECRET - Webhook signing secret do Stripe\n`;
    sqlBackup += `--   4. FACEBOOK_APP_SECRET - App secret do Facebook Developers\n`;
    sqlBackup += `--   5. ADMIN_TASK_TOKEN - Token interno para cron jobs\n\n`;
    
    sqlBackup += `-- 🟡 IMPORTANTES (funcionalidades específicas podem falhar):\n`;
    sqlBackup += `--   6. N8N_WEBHOOK_URL - URL do webhook de notificações internas\n`;
    sqlBackup += `--   7. N8N_WEBHOOK_TOKEN - Token de autenticação do N8N\n`;
    sqlBackup += `--   8. APROVA_API_KEY - API key do sistema Aprova (opcional)\n\n`;
    
    sqlBackup += `-- 🟢 AUTO-GERADAS (Supabase recria automaticamente):\n`;
    sqlBackup += `--   9. SUPABASE_URL\n`;
    sqlBackup += `--   10. SUPABASE_ANON_KEY\n`;
    sqlBackup += `--   11. SUPABASE_PUBLISHABLE_KEY\n`;
    sqlBackup += `--   12. SUPABASE_DB_URL\n\n`;
    
    sqlBackup += `-- 📚 GUIA COMPLETO DE RECUPERAÇÃO:\n`;
    sqlBackup += `-- Consulte: docs/SECRETS_RECOVERY_GUIDE.md\n`;
    sqlBackup += `-- Validação automática: /admin/backups?tab=secrets\n`;
    sqlBackup += `-- ========================================\n\n`;
    
    // Adicionar nota sobre webhooks do system_settings
    sqlBackup += `-- ⚠️  WEBHOOKS EXPORTADOS (system_settings)\n`;
    sqlBackup += `-- Os webhooks em system_settings FORAM exportados.\n`;
    sqlBackup += `-- Valide se as URLs ainda estão corretas após restauração:\n`;
    sqlBackup += `--   - internal_webhook_url\n`;
    sqlBackup += `--   - n8n_webhook_url (se configurado)\n`;
    sqlBackup += `-- ========================================\n\n`;

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
