// Padrão de CORS para todas as edge functions públicas
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handler padrão para OPTIONS (preflight)
export function handleCORS(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

// Wrapper para adicionar CORS em responses
export function withCORS(body: any, status = 200): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

// Helper para erros com CORS
export function errorResponse(message: string, status = 500): Response {
  console.error(`Error response (${status}):`, message);
  return withCORS({ error: message }, status);
}

// Helper para sucesso com CORS
export function successResponse(data: any, status = 200): Response {
  return withCORS({ success: true, ...data }, status);
}
