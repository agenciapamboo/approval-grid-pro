import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { briefingResponses, templateId, clientId } = await req.json();

    if (!briefingResponses || !templateId || !clientId) {
      throw new Error('Missing required parameters');
    }

    // Buscar template e system prompt
    const { data: template, error: templateError } = await supabaseClient
      .from('briefing_templates')
      .select('system_prompt, name')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      throw new Error('Template not found');
    }

    // Buscar configuração de IA
    const { data: aiConfig, error: configError } = await supabaseClient
      .from('ai_configurations')
      .select('default_model, prompt_behavior, prompt_skills, temperature, max_tokens_briefing')
      .single();

    if (configError) {
      throw new Error('Failed to fetch AI configuration');
    }

    // Buscar chave do ambiente (Supabase Secret)
    const openaiApiKey = Deno.env.get('aprova_openai');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured in secrets');
    }

    // Verificar limite de uso
    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData.user?.id;

    if (userId) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('client_id, agency_id')
        .eq('id', userId)
        .single();

      if (profile) {
        const { data: client } = await supabaseClient
          .from('clients')
          .select('agency_id')
          .eq('id', profile.client_id || clientId)
          .single();

        if (client) {
          const { data: agency } = await supabaseClient
            .from('agencies')
            .select('plan')
            .eq('id', client.agency_id)
            .single();

          if (agency) {
            const { data: entitlements } = await supabaseClient
              .from('plan_entitlements')
              .select('ai_uses_limit')
              .eq('plan', agency.plan)
              .single();

            const limit = entitlements?.ai_uses_limit;
            if (limit !== null) {
              const now = new Date();
              const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
              const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

              const { count } = await supabaseClient
                .from('ai_usage_logs')
                .select('*', { count: 'exact', head: true })
                .eq('client_id', profile.client_id || clientId)
                .eq('from_cache', false)
                .gte('created_at', firstDay.toISOString())
                .lte('created_at', lastDay.toISOString());

              if ((count || 0) >= limit) {
                return new Response(
                  JSON.stringify({ error: 'Monthly AI usage limit reached. Please upgrade your plan.' }),
                  { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
            }
          }
        }
      }
    }

    // Gerar hash do prompt para cache
    const promptInput = {
      template: template.system_prompt,
      responses: briefingResponses,
      behavior: aiConfig.prompt_behavior,
      skills: aiConfig.prompt_skills
    };
    
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(promptInput));
    const hashBuffer = await crypto.subtle.digest('MD5', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const promptHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Verificar cache
    const { data: cachedResponse } = await supabaseClient
      .from('ai_response_cache')
      .select('ai_response, id')
      .eq('prompt_hash', promptHash)
      .eq('prompt_type', 'briefing')
      .gt('expires_at', new Date().toISOString())
      .single();

    let profile;
    let fromCache = false;
    let tokensUsed = 0;
    let costUsd = 0;

    if (cachedResponse) {
      // Usar resposta do cache
      profile = cachedResponse.ai_response;
      fromCache = true;

      // Atualizar hit count
      await supabaseClient
        .from('ai_response_cache')
        .update({ 
          hit_count: supabaseClient.rpc('increment', { row_id: cachedResponse.id }),
          last_hit_at: new Date().toISOString()
        })
        .eq('id', cachedResponse.id);

    } else {
      // Chamar OpenAI
      const systemPrompt = `${template.system_prompt}

Comportamento: ${aiConfig.prompt_behavior || 'Profissional e objetivo'}
Habilidades: ${aiConfig.prompt_skills || 'Análise de mercado, estratégia de conteúdo'}

Retorne um JSON válido com a seguinte estrutura:
{
  "summary": "Resumo do perfil do cliente",
  "target_persona": {
    "age_range": "Faixa etária",
    "interests": ["interesse1", "interesse2"],
    "pain_points": ["dor1", "dor2"]
  },
  "content_strategy": {
    "post_frequency": "Frequência sugerida",
    "best_times": ["horário1", "horário2"],
    "content_mix": {
      "educacional": 40,
      "entretenimento": 30,
      "promocional": 20,
      "engajamento": 10
    }
  },
  "editorial_line": "Linha editorial sugerida",
  "content_pillars": ["pilar1", "pilar2", "pilar3"],
  "tone_of_voice": ["tom1", "tom2"],
  "keywords": ["palavra1", "palavra2"]
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: aiConfig.default_model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Respostas do briefing:\n${JSON.stringify(briefingResponses, null, 2)}` }
          ],
          response_format: { type: "json_object" },
          temperature: aiConfig.temperature || 0.7,
          max_tokens: aiConfig.max_tokens_briefing || 2000
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const completion = await response.json();
      profile = JSON.parse(completion.choices[0].message.content);
      tokensUsed = completion.usage?.total_tokens || 0;

      // Estimar custo (gpt-4o-mini: $0.15/1M input + $0.60/1M output)
      const inputTokens = completion.usage?.prompt_tokens || 0;
      const outputTokens = completion.usage?.completion_tokens || 0;
      costUsd = (inputTokens * 0.15 / 1000000) + (outputTokens * 0.60 / 1000000);

      // Salvar no cache (expira em 30 dias)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await supabaseClient
        .from('ai_response_cache')
        .insert({
          prompt_hash: promptHash,
          prompt_type: 'briefing',
          prompt_input: promptInput,
          ai_response: profile,
          model_used: aiConfig.default_model || 'gpt-4o-mini',
          tokens_used: tokensUsed,
          cost_usd: costUsd,
          expires_at: expiresAt.toISOString()
        });
    }

    // Salvar perfil gerado
    const { error: upsertError } = await supabaseClient
      .from('client_ai_profiles')
      .upsert({
        client_id: clientId,
        briefing_template_id: templateId,
        briefing_responses: briefingResponses,
        profile_summary: profile.summary,
        target_persona: profile.target_persona,
        content_pillars: profile.content_pillars,
        tone_of_voice: profile.tone_of_voice,
        keywords: profile.keywords,
        communication_objective: profile.content_strategy?.objective,
        post_frequency: profile.content_strategy?.post_frequency,
        best_posting_times: profile.content_strategy?.best_times,
        content_mix: profile.content_strategy?.content_mix,
        priority_themes: profile.content_pillars
      }, {
        onConflict: 'client_id'
      });

    if (upsertError) {
      console.error('Error saving profile:', upsertError);
      throw upsertError;
    }

    // Log de uso
    if (userData.user) {
      const { data: userProfile } = await supabaseClient
        .from('profiles')
        .select('agency_id, client_id')
        .eq('id', userData.user.id)
        .single();

      await supabaseClient
        .from('ai_usage_logs')
        .insert({
          user_id: userData.user.id,
          agency_id: userProfile?.agency_id,
          client_id: clientId,
          feature: 'briefing',
          model_used: aiConfig.default_model || 'gpt-4o-mini',
          tokens_used: tokensUsed,
          cost_usd: costUsd,
          from_cache: fromCache,
          request_payload: { template_id: templateId }
        });
    }

    return new Response(
      JSON.stringify({ 
        profile,
        fromCache,
        tokensUsed,
        costUsd
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-client-profile:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
