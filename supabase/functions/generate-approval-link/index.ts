import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { handleCORS, errorResponse, successResponse } from "../_shared/cors.ts";

const TIMEOUT_MS = 10000;
const BASE_URL = Deno.env.get('APPROVAL_BASE_URL') ?? 'https://aprovacriativos.com.br';

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
    // Verificar Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Auth] Missing or invalid Authorization header');
      return errorResponse('Autenticação necessária', 401);
    }

    // Criar cliente Supabase com timeout
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { Authorization: authHeader }
        } 
      }
    );

    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validar usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[Auth] User validation failed:', authError?.message || 'No user');
      return errorResponse('Não autorizado', 401);
    }

    console.log('[Auth] User authenticated:', user.id);

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

    // Buscar dados em paralelo
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

    // Validações
    if (clientResult.error || !clientResult.data) {
      console.error('[DB] Client not found:', client_id);
      return errorResponse('Cliente não encontrado', 404);
    }

    if (profileResult.error || !profileResult.data) {
      console.error('[DB] Profile not found:', user.id);
      return errorResponse('Perfil não encontrado', 403);
    }

    const client = clientResult.data;
    const profile = profileResult.data;

    // Verificar permissões
    if (profile.role !== 'agency_admin') {
      console.error('[Auth] User is not agency_admin:', profile.role);
      return errorResponse('Apenas administradores podem gerar links', 403);
    }

    if (profile.agency_id !== client.agency_id) {
      console.error('[Auth] Agency mismatch:', profile.agency_id, 'vs', client.agency_id);
      return errorResponse('Você não tem acesso a este cliente', 403);
    }

    // Buscar slug da agência
    const { data: agency, error: agencyError } = await adminSupabase
      .from('agencies')
      .select('slug')
      .eq('id', client.agency_id)
      .single();

    if (agencyError || !agency) {
      console.error('[DB] Agency not found:', client.agency_id);
      return errorResponse('Agência não encontrada', 404);
    }

    // Gerar token via RPC
    const { data: token, error: tokenError } = await supabase.rpc(
      'generate_approval_token',
      {
        p_client_id: client_id,
        p_month: month
      }
    );

    if (tokenError || !token) {
      console.error('[RPC] Token generation failed:', tokenError?.message);
      return errorResponse('Falha ao gerar token', 500);
    }

    // Calcular data de expiração
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Montar URL
    const approvalUrl = `${BASE_URL}/${agency.slug}/${client.slug}?token=${token}&month=${month}`;

    console.log('[Success] Token generated for client:', client.slug);

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
    console.error('[Error] Unexpected error:', error.message);
    
    // Não expor detalhes em produção
    if (error.message === 'Request timeout') {
      return errorResponse('Tempo limite excedido', 504);
    }
    
    return errorResponse('Erro interno do servidor', 500);
  }
});
