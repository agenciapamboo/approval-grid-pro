import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, Authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  client_id: string;
  month: string; // formato YYYY-MM
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Autenticação
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present?', !!authHeader);
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verificar autenticação usando o JWT explícito do header
    const jwt = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : (authHeader || '');

    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      console.log('Auth check failed', { hasError: !!authError, message: authError?.message });
      throw new Error('Unauthorized');
    }
    console.log('Authenticated user', user.id);

    // Ler corpo JSON com tratamento de erro
    let body: RequestBody | null = null;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { client_id, month } = (body || {}) as RequestBody;

    // Validar inputs
    if (!client_id || !month) {
      return new Response(
        JSON.stringify({ error: 'client_id and month are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar formato do mês
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return new Response(
        JSON.stringify({ error: 'Invalid month format. Use YYYY-MM' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating approval token for:', { client_id, month });

    // Gerar token usando a função do banco
    const { data: tokenData, error: tokenError } = await supabase
      .rpc('generate_approval_token', {
        p_client_id: client_id,
        p_month: month
      });

    if (tokenError) {
      console.error('Error generating token:', tokenError);
      throw new Error('Failed to generate approval token');
    }

    const token = tokenData;

    // Buscar dados do cliente para construir o link
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('slug, agency_id')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      console.error('Error fetching client:', clientError);
      throw new Error('Client not found');
    }

    // Buscar dados da agência
    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .select('slug')
      .eq('id', client.agency_id)
      .single();

    if (agencyError || !agency) {
      console.error('Error fetching agency:', agencyError);
      throw new Error('Agency not found');
    }

    // Construir URL de aprovação
    const approvalUrl = `https://aprovacriativos.com.br/${agency.slug}/${client.slug}?token=${token}&month=${month}`;

    console.log('Approval link generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        token,
        approval_url: approvalUrl,
        expires_in_days: 7,
        client_slug: client.slug,
        month
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in generate-approval-link:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error'
      }),
      {
        status: error.message === 'Unauthorized' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
