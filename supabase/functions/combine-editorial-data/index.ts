import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, jwt } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Buscar perfil do cliente
    const { data: profile, error: profileError } = await supabaseClient
      .from('client_ai_profiles')
      .select('*')
      .eq('client_id', clientId)
      .single();

    // 2. Buscar dados do cliente
    const { data: client, error: clientError } = await supabaseClient
      .from('clients')
      .select('name, monthly_creatives')
      .eq('id', clientId)
      .single();

    // 3. Contar criativos totais do cliente
    const { count: creativesCount, error: countError } = await supabaseClient
      .from('contents')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId);

    if (profileError || clientError || countError) {
      return new Response(JSON.stringify({ 
        error: 'Erro ao buscar dados',
        details: profileError?.message || clientError?.message || countError?.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Combinar dados na ordem: linha editorial, perfil, criativos
    const combinedData = {
      editorial: {
        editorial_line: profile?.editorial_line,
        communication_objective: profile?.communication_objective,
        post_frequency: profile?.post_frequency,
        best_posting_times: profile?.best_posting_times,
        content_mix: profile?.content_mix,
        priority_themes: profile?.priority_themes,
      },
      profile: {
        client_name: client?.name,
        profile_summary: profile?.profile_summary,
        target_persona: profile?.target_persona,
        content_pillars: profile?.content_pillars,
        tone_of_voice: profile?.tone_of_voice,
        keywords: profile?.keywords,
      },
      creatives: {
        total_count: creativesCount || 0,
        monthly_limit: client?.monthly_creatives || 0,
      }
    };

    return new Response(JSON.stringify({ success: true, data: combinedData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error combining editorial data:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
