import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { notifySecurity } from "../_shared/internal-notifications.ts";
import { handleCORS, errorResponse, successResponse, corsHeaders } from "../_shared/cors.ts";

interface RequestBody {
  token: string;
}

interface RateLimitResponse {
  is_blocked: boolean;
  blocked_until: string | null;
  failed_attempts: number;
  is_permanent: boolean;
}

interface ValidationResponse {
  client_id: string;
  client_slug: string;
  client_name: string;
  month: string;
}

serve(async (req) => {
  const corsCheck = handleCORS(req);
  if (corsCheck) return corsCheck;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { token }: RequestBody = await req.json();

    if (!token) {
      return errorResponse('Token é obrigatório', 400);
    }

    // Obter IP do cliente
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    const userAgent = req.headers.get('user-agent') || 'unknown';

    console.log('Token validation attempt from IP:', clientIP);

    // Verificar se o IP está bloqueado
    const { data: blockCheck, error: blockError } = await supabase
      .rpc('is_ip_blocked', { p_ip_address: clientIP })
      .single();

    if (blockError) {
      console.error('Error checking IP block:', blockError);
    }

    const rateLimitData = blockCheck as RateLimitResponse;

    if (rateLimitData?.is_blocked) {
      console.log('IP blocked:', clientIP, 'until:', rateLimitData.blocked_until, 'permanent:', rateLimitData.is_permanent);
      
      // Registrar tentativa bloqueada
      await supabase.rpc('log_validation_attempt', {
        p_ip_address: clientIP,
        p_token_attempted: token.substring(0, 10) + '...',
        p_success: false,
        p_user_agent: userAgent
      });

      // Enviar notificação de segurança sobre bloqueio de IP
      await notifySecurity(
        '🚨 IP Bloqueado por Tentativas Falhas',
        `IP ${clientIP} foi bloqueado ${rateLimitData.is_permanent ? 'permanentemente' : 'temporariamente'}`,
        {
          ip_address: clientIP,
          blocked_until: rateLimitData.blocked_until,
          failed_attempts: rateLimitData.failed_attempts,
          is_permanent: rateLimitData.is_permanent,
          user_agent: userAgent,
          token_prefix: token.substring(0, 10) + '...',
          block_type: rateLimitData.is_permanent ? 'permanent' : 'temporary',
          block_duration_minutes: rateLimitData.is_permanent ? null : 15
        },
        supabase
      );

      if (rateLimitData.is_permanent) {
        // Bloqueio permanente (10+ tentativas)
        return new Response(
          JSON.stringify({
            error: 'IP_BLOCKED_PERMANENT',
            message: 'Seu IP foi bloqueado permanentemente devido a múltiplas tentativas falhas. Entre em contato com o suporte informando seu IP para desbloqueio.',
            ip_address: clientIP,
            blocked_until: rateLimitData.blocked_until,
            failed_attempts: rateLimitData.failed_attempts,
            contact_support: true,
            is_permanent: true
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Bloqueio temporário (5 tentativas)
        return new Response(
          JSON.stringify({
            error: 'IP_BLOCKED_TEMPORARY',
            message: 'Seu usuário foi bloqueado por 15 minutos por excesso de falhas no login. Volte a tentar mais tarde ou faça a recuperação da senha.',
            ip_address: clientIP,
            blocked_until: rateLimitData.blocked_until,
            failed_attempts: rateLimitData.failed_attempts,
            contact_support: false,
            block_duration_minutes: 15
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Verificar limite de tentativas (10 por minuto)
    const { data: recentAttempts, error: attemptsError } = await supabase
      .from('token_validation_attempts')
      .select('id')
      .eq('ip_address', clientIP)
      .gte('attempted_at', new Date(Date.now() - 60000).toISOString());

    if (attemptsError) {
      console.error('Error checking recent attempts:', attemptsError);
    }

    if (recentAttempts && recentAttempts.length >= 10) {
      console.log('Rate limit exceeded for IP:', clientIP);
      
      await supabase.rpc('log_validation_attempt', {
        p_ip_address: clientIP,
        p_token_attempted: token.substring(0, 10) + '...',
        p_success: false,
        p_user_agent: userAgent
      });

      return new Response(
        JSON.stringify({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Limite de tentativas excedido. Aguarde 1 minuto.',
          ip_address: clientIP,
          retry_after: 60,
          attempts_remaining: 0
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar o token
    const { data: validationData, error: validationError } = await supabase
      .rpc('validate_approval_token', { p_token: token })
      .single();

    const isValid = !validationError && validationData;
    const validation = validationData as ValidationResponse;

    // Registrar tentativa
    const { error: logError } = await supabase.rpc('log_validation_attempt', {
      p_ip_address: clientIP,
      p_token_attempted: token.substring(0, 10) + '...',
      p_success: isValid,
      p_user_agent: userAgent
    });

    if (logError) {
      console.error('Error logging attempt:', logError);
    }

    if (!isValid) {
      console.log('Invalid token attempt from IP:', clientIP);
      
      // Contar tentativas falhas após este registro
      const { data: failedCount } = await supabase
        .from('token_validation_attempts')
        .select('id')
        .eq('ip_address', clientIP)
        .eq('success', false)
        .gte('attempted_at', new Date(Date.now() - 3600000).toISOString());

      const failedAttempts = failedCount?.length || 0;
      const remainingAttempts = Math.max(0, 10 - failedAttempts);

      let message = 'Token inválido ou expirado.';
      let show_warning = false;
      let show_temporary_block_warning = false;
      let show_permanent_block_warning = false;
      
      // Regra 1: Aviso após 3 tentativas
      if (failedAttempts >= 3 && failedAttempts < 5) {
        message = 'Seu usuário pode ser bloqueado. Revise seu usuário e senha e tente novamente.';
        show_warning = true;
      }
      // Regra 2: Aviso de bloqueio temporário após 5 tentativas
      else if (failedAttempts >= 5 && failedAttempts < 10) {
        message = 'Token inválido. Próximas tentativas resultarão em bloqueio temporário de 15 minutos.';
        show_temporary_block_warning = true;
      }
      // Regra 3: Aviso de bloqueio permanente próximo
      else if (failedAttempts >= 10) {
        message = 'Token inválido. Atenção: você atingiu o limite máximo de tentativas.';
        show_permanent_block_warning = true;
      }

      return new Response(
        JSON.stringify({
          error: 'INVALID_TOKEN',
          message,
          failed_attempts: failedAttempts,
          attempts_remaining: remainingAttempts,
          show_warning,
          show_temporary_block_warning,
          show_permanent_block_warning
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Token validated successfully for client:', validation.client_slug);

    return new Response(
      JSON.stringify({
        success: true,
        client_id: validation.client_id,
        client_slug: validation.client_slug,
        client_name: validation.client_name,
        month: validation.month
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in validate-approval-token:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'INTERNAL_ERROR',
        message: 'Erro interno ao validar token.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
