import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { handleCORS, errorResponse, successResponse } from "../_shared/cors.ts";

const TIMEOUT_MS = 10000;
const BASE_URL = Deno.env.get('APPROVAL_BASE_URL') ?? 'https://aprovacriativos.com.br';

// Allow all Lovable preview URLs and production domain
const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return false;
  
  const allowed = [
    'https://aprovacriativos.com.br',
    'http://localhost:5173',
    'http://localhost:8080'
  ];
  
  // Allow all Lovable preview URLs (both patterns)
  if (origin.includes('lovable.app') || origin.includes('lovableproject.com')) {
    return true;
  }
  
  return allowed.includes(origin);
};

interface GenerateTokenRequest {
  client_id: string;
  month: string;
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
    // CSRF Protection
    const origin = req.headers.get('origin');
    if (origin && !isAllowedOrigin(origin)) {
      console.error('[Security] Origin not allowed:', origin);
      return errorResponse('Origin não permitida', 403);
    }

    // Verificar Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Auth] Missing Authorization header');
      return errorResponse('Autenticação necessária', 401);
    }

    // Timeout Promise
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), TIMEOUT_MS)
    );

    // Criar clientes Supabase
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

    // Validar usuário autenticado com timeout (usando service role para validar JWT corretamente)
    const jwt = authHeader.replace('Bearer ', '').trim();
    const userResult = await Promise.race([
      adminSupabase.auth.getUser(jwt),
      timeoutPromise
    ]) as { data: { user: any }, error: any };

    if (userResult?.error || !userResult?.data?.user) {
      console.error('[Auth] User validation failed');
      return errorResponse('Não autorizado', 401);
    }

    const user = userResult.data.user;
    console.log('[Auth] Authenticated:', user.id);

    // Parse do body
    const body = await req.json().catch(() => null) as GenerateTokenRequest | null;
    
    if (!body?.client_id || !body?.month) {
      return errorResponse('client_id e month são obrigatórios', 400);
    }

    const { client_id, month } = body;

    // Validação de formato YYYY-MM
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return errorResponse('Formato inválido. Use YYYY-MM', 400);
    }

    // Validar UUID do cliente
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(client_id)) {
      return errorResponse('client_id inválido', 400);
    }

    // Buscar dados com timeout
    const [clientResult, profileResult] = await Promise.race([
      Promise.all([
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
      ]),
      timeoutPromise
    ]) as any[];

    if (clientResult.error || !clientResult.data) {
      console.error('[DB] Client not found');
      return errorResponse('Cliente não encontrado', 404);
    }

    if (profileResult.error || !profileResult.data) {
      console.error('[DB] Profile not found');
      return errorResponse('Perfil não encontrado', 403);
    }

    const client = clientResult.data;
    const profile = profileResult.data;

    // Verificação de permissões
    if (profile.role !== 'agency_admin') {
      console.error('[Auth] Not admin:', profile.role);
      return errorResponse('Apenas administradores podem gerar links', 403);
    }

    if (profile.agency_id !== client.agency_id) {
      console.error('[Auth] Agency mismatch');
      return errorResponse('Sem acesso a este cliente', 403);
    }

    // Buscar agency com timeout
    const agencyResult = await Promise.race([
      adminSupabase
        .from('agencies')
        .select('slug')
        .eq('id', client.agency_id)
        .single(),
      timeoutPromise
    ]) as any;

    if (agencyResult.error || !agencyResult.data) {
      console.error('[DB] Agency not found');
      return errorResponse('Agência não encontrada', 404);
    }

    const agency = agencyResult.data;

    // Gerar token com timeout
    const tokenResult = await Promise.race([
      supabase.rpc('generate_approval_token', {
        p_client_id: client_id,
        p_month: month
      }),
      timeoutPromise
    ]) as any;

    if (tokenResult.error) {
      console.error('[RPC] generate_approval_token error details:', {
        message: tokenResult.error.message,
        details: tokenResult.error.details,
        hint: tokenResult.error.hint,
        code: tokenResult.error.code
      });
      return errorResponse('Falha ao gerar token', 500);
    }

    if (!tokenResult.data) {
      console.error('[RPC] Token generation returned no data');
      return errorResponse('Falha ao gerar token', 500);
    }

    const token = tokenResult.data;

    // Calcular expiração (7 dias)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Construir URL de aprovação
    const approvalUrl = `${BASE_URL}/${agency.slug}/${client.slug}?token=${token}&month=${month}`;

    // Log de auditoria
    await adminSupabase.from('approval_tokens_audit').insert({
      token_id: null,
      token_value: token.substring(0, 10) + '...',
      action: 'created',
      ip_address: req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
      metadata: {
        client_id,
        client_name: client.name,
        month,
        created_by: user.id
      }
    });

    console.log('[Success] Token created:', { client: client.slug, month });

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
    console.error('[Error]', error.message);
    
    if (error.message === 'Request timeout') {
      return errorResponse('Timeout', 504);
    }
    
    return errorResponse('Erro interno', 500);
  }
});
