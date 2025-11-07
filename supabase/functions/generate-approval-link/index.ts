import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { handleCORS, errorResponse, successResponse, corsHeaders } from "../_shared/cors.ts";

interface GenerateTokenRequest {
  client_id: string;
  month: string; // formato YYYY-MM
}

interface TokenResponse {
  success: true;
  token: string;
  approval_url: string;
  expires_at: string;
  expires_in_days: number;
  client_slug: string;
  month: string;
}

serve(async (req) => {
  const corsCheck = handleCORS(req);
  if (corsCheck) return corsCheck;

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Token de autenticação necessário', 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validar JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return errorResponse('Não autorizado', 401);
    }

    // Parse e validação do corpo da requisição
    const body = await req.json().catch(() => null) as GenerateTokenRequest | null;
    
    if (!body?.client_id || !body?.month) {
      return errorResponse('client_id e month são obrigatórios', 400);
    }

    const { client_id, month } = body;

    // Validar formato do mês (YYYY-MM)
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return errorResponse('Formato de mês inválido. Use YYYY-MM', 400);
    }

    console.log('Token generation request:', { user_id: user.id, client_id, month });

    // Verificar permissões: buscar cliente e perfil do usuário
    const [clientResult, profileResult] = await Promise.all([
      adminSupabase
        .from('clients')
        .select('id, slug, agency_id, name')
        .eq('id', client_id)
        .single(),
      adminSupabase
        .from('profiles')
        .select('id, agency_id, role')
        .eq('id', user.id)
        .single()
    ]);

    if (clientResult.error || !clientResult.data) {
      console.error('Client not found:', clientResult.error);
      return errorResponse('Cliente não encontrado', 404);
    }

    if (profileResult.error || !profileResult.data) {
      console.error('Profile not found:', profileResult.error);
      return errorResponse('Perfil de usuário não encontrado', 403);
    }

    const client = clientResult.data;
    const profile = profileResult.data;

    // Verificar se é agency_admin da agência correta
    if (profile.role !== 'agency_admin' || profile.agency_id !== client.agency_id) {
      console.warn('Permission denied:', { 
        user_role: profile.role, 
        user_agency: profile.agency_id, 
        client_agency: client.agency_id 
      });
      return errorResponse('Apenas administradores da agência podem gerar links de aprovação', 403);
    }

    // Buscar slug da agência
    const { data: agency, error: agencyError } = await adminSupabase
      .from('agencies')
      .select('slug')
      .eq('id', client.agency_id)
      .single();

    if (agencyError || !agency) {
      console.error('Agency not found:', agencyError);
      return errorResponse('Agência não encontrada', 404);
    }

    // Gerar token via RPC (registra created_by automaticamente)
    const { data: token, error: tokenError } = await supabase
      .rpc('generate_approval_token', {
        p_client_id: client_id,
        p_month: month
      });

    if (tokenError || !token) {
      console.error('Token generation failed:', tokenError);
      return errorResponse('Falha ao gerar token de aprovação', 500);
    }

    // Calcular data de expiração
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Construir URL pública de aprovação
    const approvalUrl = `https://aprovacriativos.com.br/${agency.slug}/${client.slug}?token=${token}&month=${month}`;

    console.log('Approval link generated successfully:', { token: token.substring(0, 10) + '...', client: client.slug });

    const response: TokenResponse = {
      success: true,
      token,
      approval_url: approvalUrl,
      expires_at: expiresAt.toISOString(),
      expires_in_days: 7,
      client_slug: client.slug,
      month
    };

    return successResponse(response);

  } catch (error: any) {
    console.error('Unexpected error in generate-approval-link:', error);
    return errorResponse(error?.message || 'Erro interno do servidor', 500);
  }
});
