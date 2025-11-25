import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

    // Buscar dados combinados
    const { data: profile } = await supabaseClient
      .from('client_ai_profiles')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ 
        error: 'Perfil não encontrado. Complete o briefing primeiro.' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar configuração de IA
    const { data: aiConfig } = await supabaseClient
      .from('ai_configurations')
      .select('openai_api_key_encrypted')
      .single();

    if (!aiConfig?.openai_api_key_encrypted) {
      return new Response(JSON.stringify({ 
        error: 'Configuração de IA não encontrada' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAIApiKey = aiConfig.openai_api_key_encrypted;

    // Criar prompt para linha editorial base
    const systemPrompt = `Você é um especialista em estratégia de conteúdo digital. 
    Com base no perfil do cliente, gere uma linha editorial completa e estruturada.`;

    const userPrompt = `
PERFIL DO CLIENTE:
- Resumo: ${profile.profile_summary || 'Não informado'}
- Persona: ${JSON.stringify(profile.target_persona) || 'Não informado'}
- Pilares: ${profile.content_pillars?.join(', ') || 'Não informado'}
- Tom de voz: ${profile.tone_of_voice?.join(', ') || 'Não informado'}
- Palavras-chave: ${profile.keywords?.join(', ') || 'Não informado'}

Gere uma linha editorial com:
1. Objetivo de comunicação claro
2. Frequência de postagens sugerida
3. Melhores horários de postagem
4. Mix de conteúdo (tipos e proporções)
5. Temas prioritários
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const editorial = data.choices[0].message.content;

    // Salvar linha editorial gerada
    const { error: updateError } = await supabaseClient
      .from('client_ai_profiles')
      .update({ editorial_line: editorial })
      .eq('client_id', clientId);

    if (updateError) {
      console.error('Error updating editorial line:', updateError);
    }

    // Log de uso
    await supabaseClient.from('ai_usage_logs').insert({
      user_id: user.id,
      client_id: clientId,
      feature: 'generate_editorial_base',
      model_used: 'gpt-4o-mini',
      tokens_used: data.usage?.total_tokens || 0,
      cost_usd: (data.usage?.total_tokens || 0) * 0.00000015,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      editorial,
      tokens: data.usage?.total_tokens 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error generating editorial base:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
