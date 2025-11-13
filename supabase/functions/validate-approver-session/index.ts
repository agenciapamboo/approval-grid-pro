import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, whatsapp } = await req.json();

    if (!email && !whatsapp) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email ou WhatsApp obrigatório' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Normalizar WhatsApp (remover caracteres não numéricos)
    const normalizedWhatsapp = whatsapp ? whatsapp.replace(/\D/g, '') : null;

    // Buscar aprovador por email ou WhatsApp
    let query = supabase
      .from('client_approvers')
      .select('id, name, email, whatsapp, client_id, agency_id')
      .eq('is_active', true);

    if (email) {
      query = query.eq('email', email.toLowerCase().trim());
    } else if (normalizedWhatsapp) {
      query = query.eq('whatsapp', normalizedWhatsapp);
    }

    const { data: approver, error: approverError } = await query.single();

    if (approverError || !approver) {
      console.error('Approver not found:', approverError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Aprovador não encontrado' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Retornar dados do aprovador
    return new Response(
      JSON.stringify({
        success: true,
        approver: {
          id: approver.id,
          name: approver.name,
          email: approver.email,
          clientId: approver.client_id,
          agencyId: approver.agency_id,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error validating approver session:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
