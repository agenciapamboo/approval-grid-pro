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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { clientId, date } = await req.json();

    if (!clientId || !date) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user profile and agency
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('agency_id, client_id')
      .eq('id', user.id)
      .single();

    if (!profile?.agency_id) {
      return new Response(JSON.stringify({ error: 'User not linked to agency' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get agency plan and AI limits
    const { data: agency } = await supabaseClient
      .from('agencies')
      .select('plan')
      .eq('id', profile.agency_id)
      .single();

    if (!agency) {
      return new Response(JSON.stringify({ error: 'Agency not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: entitlements } = await supabaseClient
      .from('plan_entitlements')
      .select('ai_uses_limit')
      .eq('plan', agency.plan)
      .single();

    const limit = entitlements?.ai_uses_limit;
    const isUnlimited = limit === null;

    // Check current month usage
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const { count: currentUsage } = await supabaseClient
      .from('ai_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('from_cache', false)
      .gte('created_at', firstDay.toISOString())
      .lte('created_at', lastDay.toISOString());

    if (!isUnlimited && currentUsage !== null && currentUsage >= limit) {
      return new Response(JSON.stringify({ limitReached: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate cache hash
    const dateOnly = new Date(date).toISOString().split('T')[0];
    const promptData = { clientId, date: dateOnly };
    const promptHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(JSON.stringify(promptData))
    ).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));

    // Check cache
    const { data: cachedResponse } = await supabaseClient
      .from('ai_response_cache')
      .select('*')
      .eq('prompt_hash', promptHash)
      .eq('prompt_type', 'content_suggestions')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cachedResponse) {
      await supabaseClient
        .from('ai_response_cache')
        .update({ 
          hit_count: (cachedResponse.hit_count || 0) + 1,
          last_hit_at: new Date().toISOString()
        })
        .eq('id', cachedResponse.id);

      await supabaseClient.from('ai_usage_logs').insert({
        user_id: user.id,
        agency_id: profile.agency_id,
        client_id: clientId,
        feature: 'content_suggestions',
        model_used: cachedResponse.model_used,
        from_cache: true,
        tokens_used: 0,
        cost_usd: 0,
      });

      return new Response(JSON.stringify({
        suggestions: cachedResponse.ai_response.suggestions,
        fromCache: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get AI configuration
    const { data: aiConfig } = await supabaseClient
      .from('ai_configurations')
      .select('*')
      .single();

    if (!aiConfig?.openai_api_key_encrypted) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: decryptedKey } = await supabaseClient.rpc('decrypt_secret', {
      secret: aiConfig.openai_api_key_encrypted
    });

    // Get client AI profile
    const { data: clientProfile } = await supabaseClient
      .from('client_ai_profiles')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get historical events for the date
    const dateObj = new Date(date);
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();

    // Simple historical events check (você pode expandir isso)
    const historicalContext = `Data: ${day}/${month}`;

    const systemPrompt = `Você é um assistente de criação de conteúdo para redes sociais. 
Seu objetivo é gerar sugestões de conteúdo criativas e relevantes baseadas no perfil do cliente e eventos da data.`;

    const userPrompt = clientProfile 
      ? `Cliente: ${JSON.stringify(clientProfile.profile_data)}
${historicalContext}

Gere 3-5 sugestões de conteúdo para redes sociais. Para cada sugestão, forneça:
- title: Título criativo
- description: Descrição do conteúdo (100-150 caracteres)
- type: Tipo (feed, reels, carousel, ou story)
- hashtags: Array de 5-10 hashtags relevantes (sem #)

Retorne APENAS um JSON válido com array "suggestions".`
      : `${historicalContext}

Gere 3-5 sugestões genéricas de conteúdo para redes sociais. Para cada sugestão, forneça:
- title: Título criativo
- description: Descrição do conteúdo (100-150 caracteres)
- type: Tipo (feed, reels, carousel, ou story)
- hashtags: Array de 5-10 hashtags relevantes (sem #)

Retorne APENAS um JSON válido com array "suggestions".`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${decryptedKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiConfig.default_model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: aiConfig.temperature || 0.7,
        max_tokens: aiConfig.max_tokens_caption || 800,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices[0].message.content;

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch {
      parsedResponse = { suggestions: [] };
    }

    const tokensUsed = openaiData.usage?.total_tokens || 0;
    const costUsd = (tokensUsed / 1000) * 0.0015;

    // Cache response for 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await supabaseClient.from('ai_response_cache').insert({
      prompt_type: 'content_suggestions',
      prompt_hash: promptHash,
      prompt_input: promptData,
      ai_response: parsedResponse,
      model_used: aiConfig.default_model || 'gpt-4o-mini',
      tokens_used: tokensUsed,
      cost_usd: costUsd,
      expires_at: expiresAt.toISOString(),
    });

    await supabaseClient.from('ai_usage_logs').insert({
      user_id: user.id,
      agency_id: profile.agency_id,
      client_id: clientId,
      feature: 'content_suggestions',
      model_used: aiConfig.default_model || 'gpt-4o-mini',
      from_cache: false,
      tokens_used: tokensUsed,
      cost_usd: costUsd,
    });

    return new Response(JSON.stringify({
      suggestions: parsedResponse.suggestions || [],
      fromCache: false,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-content-suggestions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});