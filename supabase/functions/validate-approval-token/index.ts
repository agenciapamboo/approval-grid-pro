import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { notifySecurity } from "../_shared/internal-notifications.ts";
import { handleCORS, errorResponse, successResponse } from "../_shared/cors.ts";

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

    if (!token || typeof token !== 'string') {
      return errorResponse('Token é obrigatório', 400);
    }

    // Obter IP do cliente
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    const userAgent = req.headers.get('user-agent') || 'unknown';

    console.log('Token validation request:', { token: token.substring(0, 10) + '...', ip: clientIP });

    // Verificar se o IP está bloqueado
    const { data: blockCheck, error: blockError } = await supabase
      .rpc('is_ip_blocked', { p_ip_address: clientIP })
      .single();

    if (blockError) {
      console.error('Error checking IP block:', blockError);
    }

    const rateLimitData = blockCheck as RateLimitResponse;

    if (rateLimitData?.is_blocked) {
      console.log('IP blocked:', { ip: clientIP, until: rateLimitData.blocked_until, permanent: rateLimitData.is_permanent });
      
      // Registrar tentativa bloqueada
      await supabase.rpc('log_validation_attempt', {
        p_ip_address: clientIP,
        p_token_attempted: token.substring(0, 10) + '...',
        p_success: false,
        p_user_agent: userAgent
      });

      // Notificar segurança sobre bloqueio
      await notifySecurity(
        '🚨 IP Bloqueado por Tentativas Falhas',
        `IP ${clientIP} foi bloqueado ${rateLimitData.is_permanent ? 'permanentemente' : 'temporariamente'}`,
        {
          ip_address: clientIP,
          blocked_until: rateLimitData.blocked_until,
          failed_attempts: rateLimitData.failed_attempts,
          is_permanent: rateLimitData.is_permanent,
          user_agent: userAgent,
          block_type: rateLimitData.is_permanent ? 'permanent' : 'temporary'
        },
        supabase
      );

      if (rateLimitData.is_permanent) {
        return errorResponse('Seu IP foi bloqueado permanentemente. Entre em contato com o suporte.', 429);
      } else {
        return errorResponse('Bloqueado temporariamente por 15 minutos. Tente novamente mais tarde.', 429);
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
      console.log('Rate limit exceeded:', { ip: clientIP, attempts: recentAttempts.length });
      
      await supabase.rpc('log_validation_attempt', {
        p_ip_address: clientIP,
        p_token_attempted: token.substring(0, 10) + '...',
        p_success: false,
        p_user_agent: userAgent
      });

      return errorResponse('Limite de tentativas excedido. Aguarde 1 minuto antes de tentar novamente.', 429);
    }

    // Validar token
    const { data: validationData, error: validationError } = await supabase
      .rpc('validate_approval_token', { p_token: token })
      .single();

    const isValid = !validationError && validationData;
    const validation = validationData as ValidationResponse;

    // Log de validação
    await supabase.rpc('log_validation_attempt', {
      p_ip_address: clientIP,
      p_token_attempted: token.substring(0, 10) + '...',
      p_success: isValid,
      p_user_agent: userAgent
    });

    // Auditoria
    if (isValid) {
      await supabase.from('approval_tokens_audit').insert({
        token_id: null,
        token_value: token.substring(0, 10) + '...',
        action: 'validated',
        ip_address: clientIP,
        user_agent: userAgent,
        metadata: {
          client_slug: validation.client_slug,
          month: validation.month
        }
      });
    }

    if (!isValid) {
      console.log('Invalid token:', { ip: clientIP });
      
      // Contar tentativas falhas na última hora
      const { data: failedCount } = await supabase
        .from('token_validation_attempts')
        .select('id')
        .eq('ip_address', clientIP)
        .eq('success', false)
        .gte('attempted_at', new Date(Date.now() - 3600000).toISOString());

      const failedAttempts = failedCount?.length || 0;
      const remainingAttempts = Math.max(0, 10 - failedAttempts);

      let message = 'Token inválido ou expirado.';
      
      if (failedAttempts >= 3 && failedAttempts < 5) {
        message = 'Token inválido. Atenção: múltiplas tentativas podem resultar em bloqueio.';
      } else if (failedAttempts >= 5 && failedAttempts < 10) {
        message = `Token inválido. Próximas tentativas resultarão em bloqueio temporário. Restam ${remainingAttempts} tentativas.`;
      } else if (failedAttempts >= 10) {
        message = 'Token inválido. Limite de tentativas atingido.';
      }

      return errorResponse(message, 401);
    }

    console.log('Token validated successfully:', { client: validation.client_slug, month: validation.month });

    return successResponse({
      client_id: validation.client_id,
      client_slug: validation.client_slug,
      client_name: validation.client_name,
      month: validation.month
    });

  } catch (error: any) {
    console.error('Unexpected error in validate-approval-token:', error);
    return errorResponse('Erro interno ao validar token', 500);
  }
});
