import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertRequest {
  ip_address: string;
  user_agent?: string;
  user_identifier?: string;
}

interface FailedAttempt {
  ip_address: string;
  attempted_at: string;
  user_agent?: string;
  success: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { ip_address, user_agent, user_identifier }: AlertRequest = await req.json();

    if (!ip_address) {
      return new Response(
        JSON.stringify({ error: 'IP address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking failed login attempts for IP:', ip_address);

    // Buscar falhas recentes (últimos 15 minutos)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    
    const { data: recentFailures, error: failuresError } = await supabase
      .from('login_validation_attempts')
      .select('*')
      .eq('ip_address', ip_address)
      .eq('success', false)
      .gte('attempted_at', fifteenMinutesAgo)
      .order('attempted_at', { ascending: false });

    if (failuresError) {
      console.error('Error fetching login attempts:', failuresError);
      throw failuresError;
    }

    const failureCount = recentFailures?.length || 0;
    console.log(`Found ${failureCount} failed attempts in last 15 minutes`);

    // Determinar nível de alerta
    let alertLevel: 'warning' | 'critical' | 'permanent' | null = null;
    
    if (failureCount >= 10) {
      alertLevel = 'permanent'; // Bloqueio permanente
    } else if (failureCount >= 5) {
      alertLevel = 'critical'; // Bloqueio temporário de 15 minutos
    } else if (failureCount >= 3) {
      alertLevel = 'warning'; // Aviso de tentativas suspeitas
    }

    if (!alertLevel) {
      return new Response(
        JSON.stringify({ success: true, message: 'No alert needed', failure_count: failureCount }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se já enviou alerta hoje para este IP e nível
    const today = new Date().toISOString().split('T')[0];
    const { data: existingAlert } = await supabase
      .from('security_alerts_sent')
      .select('*')
      .eq('ip_address', ip_address)
      .eq('alert_type', alertLevel)
      .gte('alert_date', today)
      .single();

    if (existingAlert) {
      console.log('Alert already sent today for this IP and level');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Alert already sent today',
          alert_level: alertLevel,
          failure_count: failureCount
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar informações de bloqueio atual
    const { data: blockInfo } = await supabase.rpc('is_ip_blocked', {
      p_ip_address: ip_address
    });

    const isBlocked = blockInfo?.[0]?.is_blocked || false;
    const blockedUntil = blockInfo?.[0]?.blocked_until;
    const isPermanent = blockInfo?.[0]?.is_permanent || false;

    // Registrar alerta enviado
    const { error: insertError } = await supabase
      .from('security_alerts_sent')
      .insert({
        ip_address,
        alert_type: alertLevel,
        alert_date: today,
        details: {
          failure_count: failureCount,
          user_agent,
          user_identifier,
          is_blocked: isBlocked,
          blocked_until: blockedUntil,
          is_permanent: isPermanent,
          recent_attempts: recentFailures?.slice(0, 5).map(f => ({
            attempted_at: f.attempted_at,
            user_agent: f.user_agent
          }))
        }
      });

    if (insertError) {
      console.error('Error logging security alert:', insertError);
    }

    // Registrar no activity log
    const { error: activityError } = await supabase
      .from('activity_log')
      .insert({
        entity: 'security_alert',
        action: `failed_login_${alertLevel}`,
        metadata: {
          ip_address,
          failure_count: failureCount,
          alert_level: alertLevel,
          is_blocked: isBlocked,
          is_permanent: isPermanent,
          user_agent,
          user_identifier
        }
      });

    if (activityError) {
      console.error('Error logging activity:', activityError);
    }

    console.log(`Security alert sent: ${alertLevel} for IP ${ip_address}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Security alert processed',
        alert_level: alertLevel,
        failure_count: failureCount,
        is_blocked: isBlocked,
        is_permanent: isPermanent
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in alert-failed-login-attempts:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});