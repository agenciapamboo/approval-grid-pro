import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { notifySecurity } from '../_shared/internal-notifications.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertRequest {
  ip_address: string;
  user_agent?: string;
  token_attempted?: string;
  approver_identifier?: string;
}

interface FailedAttempt {
  attempted_at: string;
  user_agent: string;
  token_attempted: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { ip_address, user_agent, token_attempted, approver_identifier }: AlertRequest = await req.json();

    if (!ip_address) {
      return new Response(
        JSON.stringify({ error: 'IP address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Verificando tentativas falhadas do IP: ${ip_address}`);

    // Buscar tentativas falhadas recentes (últimos 15 minutos)
    const { data: recentFailures, error: failuresError } = await supabaseClient
      .from('token_validation_attempts')
      .select('attempted_at, user_agent, token_attempted')
      .eq('ip_address', ip_address)
      .eq('success', false)
      .gte('attempted_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
      .order('attempted_at', { ascending: false });

    if (failuresError) {
      console.error('❌ Erro ao buscar tentativas falhadas:', failuresError);
      throw failuresError;
    }

    const failureCount = recentFailures?.length || 0;
    console.log(`📊 Total de tentativas falhadas (15 min): ${failureCount}`);

    // Definir níveis de alerta
    let alertType = '';
    let priority: 'high' | 'critical' = 'high';
    let shouldAlert = false;

    if (failureCount >= 10) {
      alertType = 'permanent_block';
      priority = 'critical';
      shouldAlert = true;
    } else if (failureCount >= 5) {
      alertType = 'critical_failures';
      priority = 'critical';
      shouldAlert = true;
    } else if (failureCount >= 3) {
      alertType = 'warning_failures';
      priority = 'high';
      shouldAlert = true;
    }

    if (!shouldAlert) {
      console.log('ℹ️ Número de tentativas ainda não requer alerta');
      return new Response(
        JSON.stringify({ message: 'No alert needed yet', failure_count: failureCount }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se já foi enviado alerta hoje para este IP e tipo
    const { data: existingAlert } = await supabaseClient
      .from('security_alerts_sent')
      .select('id')
      .eq('alert_type', alertType)
      .eq('ip_address', ip_address)
      .gte('notified_at', new Date().toISOString().split('T')[0]) // Hoje
      .limit(1)
      .maybeSingle();

    if (existingAlert) {
      console.log('⏭️ Alerta já enviado hoje para este IP e tipo');
      return new Response(
        JSON.stringify({ message: 'Alert already sent today', failure_count: failureCount }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar informações do bloqueio atual
    const { data: blockInfo } = await supabaseClient
      .from('token_validation_attempts')
      .select('blocked_until')
      .eq('ip_address', ip_address)
      .not('blocked_until', 'is', null)
      .gte('blocked_until', new Date().toISOString())
      .order('blocked_until', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Tentar identificar aprovador e cliente pelo código tentado
    let approverInfo: { name: string; email: string; whatsapp: string } | null = null;
    let clientInfo: { name: string; slug: string } | null = null;

    if (approver_identifier) {
      const { data: approver } = await supabaseClient
        .from('client_approvers')
        .select(`
          id,
          name,
          email,
          whatsapp,
          client_id,
          clients!inner (
            id,
            name,
            slug
          )
        `)
        .or(`email.eq.${approver_identifier},whatsapp.eq.${approver_identifier}`)
        .limit(1)
        .maybeSingle();

      if (approver) {
        approverInfo = {
          name: approver.name,
          email: approver.email,
          whatsapp: approver.whatsapp
        };
        
        const client = approver.clients as any;
        if (client && !Array.isArray(client)) {
          clientInfo = {
            name: client.name,
            slug: client.slug
          };
        }
      }
    }

    // Preparar detalhes do alerta
    const userAgents = [...new Set((recentFailures as FailedAttempt[] || []).map(f => f.user_agent).filter(Boolean))];
    
    const alertDetails = {
      ip_address,
      failed_attempts: failureCount,
      time_window: '15 minutos',
      user_agents: userAgents,
      last_attempt: recentFailures?.[0]?.attempted_at,
      is_blocked: !!blockInfo,
      blocked_until: blockInfo?.blocked_until || null,
      approver_attempted: approverInfo ? `${approverInfo.name} (${approverInfo.email || approverInfo.whatsapp})` : null,
      client_name: clientInfo?.name || null,
      client_slug: clientInfo?.slug || null,
      alert_level: alertType
    };

    // Preparar mensagem do alerta
    let subject = '';
    let message = '';

    if (failureCount >= 10) {
      subject = '🚨 BLOQUEIO PERMANENTE - Tentativas 2FA Excessivas';
      message = `IP ${ip_address} foi BLOQUEADO PERMANENTEMENTE após ${failureCount} tentativas falhadas em 15 minutos.`;
    } else if (failureCount >= 5) {
      subject = '⚠️ ALERTA CRÍTICO - Possível Ataque 2FA';
      message = `IP ${ip_address} teve ${failureCount} tentativas falhadas de 2FA em 15 minutos. BLOQUEADO temporariamente.`;
    } else {
      subject = '⚠️ Alerta de Segurança - Tentativas Falhadas 2FA';
      message = `IP ${ip_address} teve ${failureCount} tentativas falhadas de 2FA em 15 minutos.`;
    }

    if (approverInfo && clientInfo) {
      message += `\n\nAprovador: ${approverInfo.name}\nCliente: ${clientInfo.name}`;
    }

    console.log(`📧 Enviando alerta: ${subject}`);

    // Enviar notificação via N8N
    const notificationResult = await notifySecurity(
      subject,
      message,
      alertDetails,
      supabaseClient
    );

    if (!notificationResult.success) {
      console.error('❌ Falha ao enviar notificação:', notificationResult.error);
    }

    // Registrar alerta enviado
    const { error: insertError } = await supabaseClient
      .from('security_alerts_sent')
      .insert({
        alert_type: alertType,
        ip_address,
        details: alertDetails
      });

    if (insertError) {
      console.error('❌ Erro ao registrar alerta enviado:', insertError);
    }

    // Registrar no activity_log
    await supabaseClient
      .from('activity_log')
      .insert({
        entity: 'security_alert',
        action: 'sent',
        metadata: {
          alert_type: alertType,
          ip_address,
          failure_count: failureCount,
          notification_sent: notificationResult.success
        }
      });

    console.log('✅ Alerta de segurança processado com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        alert_sent: true,
        alert_type: alertType,
        failure_count: failureCount,
        notification_result: notificationResult
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao processar alerta:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
