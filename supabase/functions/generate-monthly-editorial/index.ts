import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, period } = await req.json();

    if (!clientId || !period) {
      return new Response(
        JSON.stringify({ error: 'clientId e period são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar perfil de IA do cliente
    const { data: profile } = await supabase
      .from('client_ai_profiles')
      .select('profile_summary, target_persona, content_strategy')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Cliente não possui perfil de IA. Crie um briefing primeiro.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Calcular datas do período
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let periodName: string;

    switch (period) {
      case 'next_week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() + ((7 - startDate.getDay()) % 7 || 7));
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        periodName = 'Próxima Semana';
        break;
      case 'next_fortnight':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() + ((7 - startDate.getDay()) % 7 || 7));
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 13);
        periodName = 'Próxima Quinzena';
        break;
      case 'current_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        periodName = 'Mês Atual';
        break;
      case 'next_month':
        startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
        periodName = 'Próximo Mês';
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Período inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // 3. Buscar eventos históricos (opcional)
    const events = []; // Simplificado - pode integrar com historical_events.json

    // 4. Gerar hash para cache
    const encoder = new TextEncoder();
    const hashData = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(`monthly_editorial_${clientId}_${period}_${startDate.getMonth()}_${startDate.getFullYear()}`)
    );
    const hashArray = Array.from(new Uint8Array(hashData));
    const promptHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // 5. Verificar cache
    const { data: cached } = await supabase
      .from('ai_response_cache')
      .select('ai_response, created_at')
      .eq('prompt_hash', promptHash)
      .eq('prompt_type', 'monthly_editorial')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cached) {
      // Incrementar hit count
      await supabase
        .from('ai_response_cache')
        .update({ 
          hit_count: supabase.from('ai_response_cache').select('hit_count').eq('prompt_hash', promptHash),
          last_hit_at: new Date().toISOString()
        })
        .eq('prompt_hash', promptHash);

      // Log uso (cache)
      await supabase
        .from('ai_usage_logs')
        .insert({
          client_id: clientId,
          feature: 'monthly_editorial',
          model_used: 'gpt-4o-mini',
          from_cache: true,
          tokens_used: 0,
          cost_usd: 0
        });

      return new Response(
        JSON.stringify({
          editorialLine: cached.ai_response,
          fromCache: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Verificar limite de uso
    const { data: client } = await supabase
      .from('clients')
      .select('agency_id')
      .eq('id', clientId)
      .single();

    const { data: agency } = await supabase
      .from('agencies')
      .select('plan')
      .eq('id', client!.agency_id)
      .single();

    const { data: entitlements } = await supabase
      .from('plan_entitlements')
      .select('ai_uses_limit')
      .eq('plan', agency!.plan)
      .single();

    if (entitlements?.ai_uses_limit !== null) {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const { count } = await supabase
        .from('ai_usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('from_cache', false)
        .gte('created_at', firstDay.toISOString())
        .lte('created_at', lastDay.toISOString());

      if (count && entitlements && count >= entitlements.ai_uses_limit) {
        return new Response(
          JSON.stringify({ limitReached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 7. Buscar OpenAI API Key
    const openaiApiKey = Deno.env.get('aprova_openai');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured in secrets');
    }

    // 8. Gerar linha editorial com OpenAI
    const systemPrompt = `Você é um estrategista de conteúdo para redes sociais.

PERFIL DO CLIENTE:
${profile.profile_summary}
Persona-alvo: ${profile.target_persona}
Estratégia: ${profile.content_strategy}

PERÍODO: ${periodName} (${startDate.toLocaleDateString()} a ${endDate.toLocaleDateString()})

Crie uma linha editorial estruturada para este período em formato JSON:
{
  "content_pillars": ["Pilar 1", "Pilar 2", "Pilar 3"],
  "weekly_themes": [
    { "week": 1, "theme": "Tema", "description": "Descrição detalhada" }
  ],
  "post_frequency": "3x por semana",
  "recommended_times": ["9h", "14h", "19h"],
  "content_mix": {
    "educational": 40,
    "promotional": 30,
    "entertainment": 20,
    "user_generated": 10
  }
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Crie a linha editorial para ${periodName}` }
        ],
        max_tokens: 1500,
        temperature: 0.7
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON da resposta
    const editorialLine = JSON.parse(content.trim());

    const tokensUsed = data.usage?.total_tokens || 0;
    const costUsd = (tokensUsed / 1000) * 0.0001; // Custo aproximado para gpt-4o-mini

    // 9. Cachear resposta
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await supabase
      .from('ai_response_cache')
      .insert({
        prompt_hash: promptHash,
        prompt_type: 'monthly_editorial',
        prompt_input: { clientId, period },
        ai_response: editorialLine,
        model_used: 'gpt-4o-mini',
        tokens_used: tokensUsed,
        cost_usd: costUsd,
        expires_at: expiresAt.toISOString(),
        hit_count: 0
      });

    // 10. Log uso
    await supabase
      .from('ai_usage_logs')
      .insert({
        client_id: clientId,
        agency_id: client!.agency_id,
        feature: 'monthly_editorial',
        model_used: 'gpt-4o-mini',
        from_cache: false,
        tokens_used: tokensUsed,
        cost_usd: costUsd
      });

    return new Response(
      JSON.stringify({
        editorialLine,
        fromCache: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-monthly-editorial:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
