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

    const { briefingResponses, templateId, clientId, briefingType = 'client_profile' } = await req.json();

    if (!briefingResponses || !templateId || !clientId) {
      throw new Error('Missing required parameters');
    }

    // Buscar template e system prompt
    const { data: template, error: templateError } = await supabaseClient
      .from('briefing_templates')
      .select('system_prompt, name, template_type')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      throw new Error('Template not found');
    }

    // Buscar configuração de IA
    const { data: aiConfig, error: configError } = await supabaseClient
      .from('ai_configurations')
      .select('openai_api_key_encrypted, default_model, prompt_behavior, prompt_skills, temperature, max_tokens_briefing')
      .single();

    if (configError || !aiConfig?.openai_api_key_encrypted) {
      throw new Error('OpenAI API key not configured');
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

    // Determinar se é linha editorial
    const isEditorialLine = briefingType === 'editorial_line' || template.template_type === 'editorial_line';
    
    // Buscar informações do cliente e perfil (se for linha editorial)
    let clientInfo = null;
    let clientProfile = null;
    
    if (isEditorialLine) {
      // Buscar informações do cliente (monthly_creatives)
      const { data: clientData } = await supabaseClient
        .from('clients')
        .select('monthly_creatives, name')
        .eq('id', clientId)
        .single();
      
      clientInfo = clientData;
      
      // Buscar perfil do cliente existente para complementar informações
      const { data: existingProfile } = await supabaseClient
        .from('client_ai_profiles')
        .select('content_pillars, tone_of_voice, keywords, ai_generated_profile')
        .eq('client_id', clientId)
        .maybeSingle();
      
      clientProfile = existingProfile;
    }
    
    // Gerar hash do prompt para cache (incluir tipo de briefing e informações do cliente para diferenciar)
    const promptInput = {
      template: template.system_prompt,
      responses: briefingResponses,
      behavior: aiConfig.prompt_behavior,
      skills: aiConfig.prompt_skills,
      briefingType: briefingType || template.template_type,
      monthlyCreatives: clientInfo?.monthly_creatives,
      contentPillars: clientProfile?.content_pillars || clientProfile?.ai_generated_profile?.content_pillars
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
      const monthlyCreatives = clientInfo?.monthly_creatives || 8;
      const contentPillars = clientProfile?.content_pillars || clientProfile?.ai_generated_profile?.content_pillars || [];
      const toneOfVoice = clientProfile?.tone_of_voice || clientProfile?.ai_generated_profile?.tone_of_voice || [];
      
      // Calcular posts por semana (distribuição aproximada)
      const postsPerWeek = Math.ceil(monthlyCreatives / 4);
      
      const systemPrompt = isEditorialLine
        ? `${template.system_prompt}

Comportamento: ${aiConfig.prompt_behavior || 'Profissional e objetivo'}
Habilidades: ${aiConfig.prompt_skills || 'Análise de mercado, estratégia de conteúdo'}

INSTRUÇÕES ESPECIAIS PARA LINHA EDITORIAL:
Você deve criar um gabarito/esqueleto base para planejamento mensal de conteúdos, dividido em semanas.
Use PREFERENCIALMENTE as informações do formulário de briefing e COMPLEMENTE com informações do perfil do cliente quando disponíveis.

Total de criativos mensais: ${monthlyCreatives}
Posts por semana (aproximado): ${postsPerWeek}
${contentPillars.length > 0 ? `Pilares de conteúdo do cliente: ${JSON.stringify(contentPillars)}` : ''}
${toneOfVoice.length > 0 ? `Tom de voz do cliente: ${JSON.stringify(toneOfVoice)}` : ''}

TIPOS DE CONTEÚDO DISPONÍVEIS (use conforme as proporções indicadas no formulário):
- Institucional
- Carrossel História
- Venda direta
- Curiosidade
- Educacional
- Entretenimento
- Promocional
- Engajamento

Retorne um JSON válido com a seguinte estrutura:
{
  "editorial_line": "Descrição geral da linha editorial e diretrizes",
  "monthly_structure": {
    "total_creatives": ${monthlyCreatives},
    "weeks": [
      {
        "week_number": 1,
        "posts": [
          {
            "type": "Institucional",
            "description": "Breve descrição do conteúdo sugerido"
          },
          {
            "type": "Carrossel História",
            "description": "Breve descrição do conteúdo sugerido"
          }
        ]
      },
      {
        "week_number": 2,
        "posts": [
          {
            "type": "Venda direta",
            "description": "Breve descrição do conteúdo sugerido"
          },
          {
            "type": "Curiosidade",
            "description": "Breve descrição do conteúdo sugerido"
          }
        ]
      },
      {
        "week_number": 3,
        "posts": [
          {
            "type": "Venda direta",
            "description": "Breve descrição do conteúdo sugerido"
          },
          {
            "type": "Educacional",
            "description": "Breve descrição do conteúdo sugerido"
          }
        ]
      },
      {
        "week_number": 4,
        "posts": [
          {
            "type": "Curiosidade",
            "description": "Breve descrição do conteúdo sugerido"
          },
          {
            "type": "Educacional",
            "description": "Breve descrição do conteúdo sugerido"
          }
        ]
      }
    ]
  }
}

IMPORTANTE:
- Distribua os ${monthlyCreatives} criativos entre as 4 semanas de forma equilibrada
- Use as proporções de tipos de conteúdo indicadas no formulário
- Cada post deve ter um tipo e uma descrição breve do conteúdo sugerido
- Se houver pilares de conteúdo do cliente, use-os para orientar os temas
- Se houver tom de voz definido, respeite-o nas descrições`
        : `${template.system_prompt}

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

      // Construir mensagem do usuário com informações complementares
      let userMessage = `Respostas do briefing:\n${JSON.stringify(briefingResponses, null, 2)}`;
      
      if (isEditorialLine && clientProfile) {
        userMessage += `\n\nInformações complementares do perfil do cliente:\n`;
        if (contentPillars.length > 0) {
          userMessage += `- Pilares de conteúdo: ${JSON.stringify(contentPillars)}\n`;
        }
        if (toneOfVoice.length > 0) {
          userMessage += `- Tom de voz: ${JSON.stringify(toneOfVoice)}\n`;
        }
        if (clientProfile.ai_generated_profile?.target_persona) {
          userMessage += `- Persona: ${JSON.stringify(clientProfile.ai_generated_profile.target_persona)}\n`;
        }
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${aiConfig.openai_api_key_encrypted}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: aiConfig.default_model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          response_format: { type: "json_object" },
          temperature: aiConfig.temperature || 0.7,
          max_tokens: aiConfig.max_tokens_briefing || 3000 // Aumentado para linha editorial estruturada
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

    // Salvar perfil gerado ou atualizar apenas linha editorial
    if (isEditorialLine) {
      // Para linha editorial, salvar a estrutura completa (editorial_line + monthly_structure)
      // Se profile tiver monthly_structure, salvar como JSON stringificado
      const editorialLineToSave = profile.monthly_structure 
        ? JSON.stringify(profile) // Salvar estrutura completa como JSON
        : (profile.editorial_line || JSON.stringify(profile)); // Fallback para texto simples ou JSON
      
      const { data: existingProfile } = await supabaseClient
        .from('client_ai_profiles')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (existingProfile) {
        // Atualizar apenas a linha editorial e o template usado
        const { error: updateError } = await supabaseClient
          .from('client_ai_profiles')
          .update({
            editorial_line: editorialLineToSave,
            briefing_template_id: templateId, // Salvar o template de linha editorial usado
            updated_at: new Date().toISOString()
          })
          .eq('client_id', clientId);

        if (updateError) {
          console.error('Error updating editorial line:', updateError);
          throw updateError;
        }
      } else {
        // Criar registro mínimo se não existir perfil
        const { error: insertError } = await supabaseClient
          .from('client_ai_profiles')
          .insert({
            client_id: clientId,
            briefing_template_id: templateId,
            briefing_responses: briefingResponses,
            editorial_line: editorialLineToSave,
            ai_generated_profile: profile.monthly_structure ? profile : { editorial_line: profile.editorial_line }
          });

        if (insertError) {
          console.error('Error inserting editorial line:', insertError);
          throw insertError;
        }
      }
    } else {
      // Para perfil completo, fazer upsert normal
      const { error: upsertError } = await supabaseClient
        .from('client_ai_profiles')
        .upsert({
          client_id: clientId,
          briefing_template_id: templateId,
          briefing_responses: briefingResponses,
          ai_generated_profile: profile,
          editorial_line: profile.editorial_line,
          keywords: profile.keywords,
          tone_of_voice: profile.tone_of_voice,
          content_pillars: profile.content_pillars
        }, {
          onConflict: 'client_id'
        });

      if (upsertError) {
        console.error('Error saving profile:', upsertError);
        throw upsertError;
      }
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
