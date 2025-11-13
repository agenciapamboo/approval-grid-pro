import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Lista de todas as tabelas públicas
    const tables = [
      'profiles', 'agencies', 'clients', 'contents', 'content_media', 'content_texts',
      'content_history', 'comments', 'client_approvers', 'approval_tokens', 'notifications',
      'user_roles', 'role_permissions', 'plan_entitlements', 'plan_permissions',
      'activity_log', 'client_sessions', 'two_factor_codes', 'token_validation_attempts',
      'trusted_ips', 'security_alerts_sent', 'user_preferences', 'webhooks',
      'content_suggestions_feedback', 'ticket_messages', 'client_notes',
      'platform_notifications', 'kanban_columns', 'system_settings', 'lovable_plan_config',
      'financial_snapshots', 'client_social_accounts', 'support_tickets',
      'revenue_taxes', 'operational_costs', 'consents', 'conversion_events',
      'lgpd_pages', 'tracking_pixels', 'creative_requests'
    ];

    let sqlBackup = `-- Database Backup Generated: ${new Date().toISOString()}\n`;
    sqlBackup += `-- Supabase Project: ${supabaseUrl}\n\n`;
    sqlBackup += `-- ========================================\n`;
    sqlBackup += `-- IMPORTANT: This backup contains sensitive data\n`;
    sqlBackup += `-- Keep it secure and never commit to version control\n`;
    sqlBackup += `-- ========================================\n\n`;

    // Para cada tabela, buscar dados e gerar INSERTs
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*');
        
        if (error) {
          console.warn(`Could not backup table ${table}:`, error.message);
          sqlBackup += `-- Warning: Could not backup table ${table}: ${error.message}\n\n`;
          continue;
        }

        if (!data || data.length === 0) {
          sqlBackup += `-- Table ${table} is empty\n\n`;
          continue;
        }

        sqlBackup += `-- ========================================\n`;
        sqlBackup += `-- Table: ${table}\n`;
        sqlBackup += `-- Records: ${data.length}\n`;
        sqlBackup += `-- ========================================\n\n`;

        // Truncate para limpar antes de inserir
        sqlBackup += `TRUNCATE TABLE public.${table} CASCADE;\n\n`;

        // Gerar INSERTs
        for (const row of data) {
          const columns = Object.keys(row);
          const values = columns.map(col => {
            const value = row[col];
            if (value === null) return 'NULL';
            if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
            if (typeof value === 'boolean') return value ? 'true' : 'false';
            if (value instanceof Date) return `'${value.toISOString()}'`;
            if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
            return value;
          });

          sqlBackup += `INSERT INTO public.${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
        }

        sqlBackup += `\n`;
      } catch (err) {
        console.error(`Error backing up table ${table}:`, err);
        sqlBackup += `-- Error backing up table ${table}: ${err.message}\n\n`;
      }
    }

    // Adicionar informação sobre auth.users (não podemos exportar dados, mas podemos documentar)
    sqlBackup += `-- ========================================\n`;
    sqlBackup += `-- AUTH.USERS TABLE\n`;
    sqlBackup += `-- This table is managed by Supabase Auth\n`;
    sqlBackup += `-- Cannot be directly exported via this function\n`;
    sqlBackup += `-- Use Supabase Dashboard > Authentication > Users to manage\n`;
    sqlBackup += `-- ========================================\n\n`;

    // Adicionar informação sobre secrets
    sqlBackup += `-- ========================================\n`;
    sqlBackup += `-- SECRETS AND ENVIRONMENT VARIABLES\n`;
    sqlBackup += `-- These are managed in Supabase Vault and Edge Function Secrets\n`;
    sqlBackup += `-- Cannot be exported for security reasons\n`;
    sqlBackup += `-- Configured secrets:\n`;
    sqlBackup += `--   - N8N_WEBHOOK_TOKEN\n`;
    sqlBackup += `--   - N8N_WEBHOOK_URL\n`;
    sqlBackup += `--   - APROVA_API_KEY\n`;
    sqlBackup += `--   - ADMIN_TASK_TOKEN\n`;
    sqlBackup += `--   - FACEBOOK_APP_ID\n`;
    sqlBackup += `--   - FACEBOOK_APP_SECRET\n`;
    sqlBackup += `--   - STRIPE_SECRET_KEY\n`;
    sqlBackup += `--   - STRIPE_WEBHOOK_SECRET\n`;
    sqlBackup += `--   - LOVABLE_API_KEY\n`;
    sqlBackup += `-- ========================================\n\n`;

    // Adicionar informação sobre storage
    sqlBackup += `-- ========================================\n`;
    sqlBackup += `-- STORAGE BUCKETS\n`;
    sqlBackup += `-- Bucket: content-media (private)\n`;
    sqlBackup += `-- Files must be backed up separately via Supabase Dashboard\n`;
    sqlBackup += `-- or using the Storage API\n`;
    sqlBackup += `-- ========================================\n\n`;

    sqlBackup += `-- Backup completed: ${new Date().toISOString()}\n`;

    return new Response(sqlBackup, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/sql',
        'Content-Disposition': `attachment; filename="database-backup-${new Date().toISOString().split('T')[0]}.sql"`,
      },
    });
  } catch (error) {
    console.error('Error generating backup:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
