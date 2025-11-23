import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { clientId, contentType, context } = await req.json();

    if (!clientId || !contentType) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check usage limit
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('agency_id, client_id')
      .eq('id', user.id)
      .single();

    if (!profile?.agency_id) {
      return new Response(JSON.stringify({ error: 'Agency not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: agency } = await supabaseClient
      .from('agencies')
      .select('plan')
      .eq('id', profile.agency_id)
      .single();

    const { data: entitlements } = await supabaseClient
      .from('plan_entitlements')
      .select('ai_uses_limit')
      .eq('plan', agency?.plan || 'creator')
      .single();

    const limit = entitlements?.ai_uses_limit || 10;

    // Count current month usage (non-cached only)
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

    if (limit !== null && (currentUsage || 0) >= limit) {
      return new Response(JSON.stringify({ 
        error: 'Limite de uso de IA atingido',
        limitReached: true 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build prompt hash for cache lookup
    const promptData = {
      type: 'caption',
      clientId,
      contentType,
      context: context || {}
    };
    const promptString = JSON.stringify(promptData);
    const encoder = new TextEncoder();
    const data = encoder.encode(promptString);
    const hashBuffer = await crypto.subtle.digest('MD5', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const promptHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Check cache
    const { data: cachedResponse } = await supabaseClient
      .from('ai_response_cache')
      .select('ai_response, id')
      .eq('prompt_hash', promptHash)
      .eq('prompt_type', 'caption')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cachedResponse) {
      // Update hit count
      await supabaseClient
        .from('ai_response_cache')
        .update({ 
          hit_count: supabaseClient.rpc('increment', { row_id: cachedResponse.id }),
          last_hit_at: new Date().toISOString()
        })
        .eq('id', cachedResponse.id);

      // Log cache hit (doesn't count against limit)
      await supabaseClient.from('ai_usage_logs').insert({
        user_id: user.id,
        agency_id: profile.agency_id,
        client_id: clientId,
        feature: 'caption_generation',
        model_used: 'cached',
        from_cache: true,
        tokens_used: 0,
        cost_usd: 0,
      });

      return new Response(JSON.stringify({ 
        suggestions: cachedResponse.ai_response.suggestions,
        fromCache: true 
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

    // Decrypt API key
    const { data: decryptedKey } = await supabaseClient.rpc('decrypt_api_key', {
      encrypted_key: aiConfig.openai_api_key_encrypted
    });

    if (!decryptedKey) {
      return new Response(JSON.stringify({ error: 'Failed to decrypt API key' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get client AI profile
    const { data: clientProfile } = await supabaseClient
      .from('client_ai_profiles')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Build system prompt
    let systemPrompt = aiConfig.prompt_skills || 'Você é um assistente especializado em criação de conteúdo para redes sociais.';
    
    if (aiConfig.prompt_behavior) {
      systemPrompt += '\n\n' + aiConfig.prompt_behavior;
    }

    if (clientProfile) {
      systemPrompt += `\n\nPerfil do Cliente:\n${JSON.stringify(clientProfile.profile_data, null, 2)}`;
    }

    // Build user prompt
    let userPrompt = `Gere 3 sugestões de ${contentType === 'post' ? 'legendas' : 'roteiros'} criativas e envolventes.`;
    
    if (context?.title) {
      userPrompt += `\n\nTítulo/Tema: ${context.title}`;
    }
    if (context?.category) {
      userPrompt += `\nCategoria: ${context.category}`;
    }
    if (context?.description) {
      userPrompt += `\nDescrição adicional: ${context.description}`;
    }

    userPrompt += `\n\nRetorne as sugestões em formato JSON: { "suggestions": ["sugestão 1", "sugestão 2", "sugestão 3"] }`;

    // Call OpenAI
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
        max_tokens: aiConfig.max_tokens_caption || 500,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      return new Response(JSON.stringify({ error: 'OpenAI API error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAIData = await openAIResponse.json();
    const responseContent = openAIData.choices[0].message.content;
    
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch {
      parsedResponse = { suggestions: [responseContent] };
    }

    const tokensUsed = openAIData.usage?.total_tokens || 0;
    const costUsd = (tokensUsed / 1000) * 0.0001; // Approximate cost

    // Cache the response (30 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await supabaseClient.from('ai_response_cache').insert({
      prompt_hash: promptHash,
      prompt_type: 'caption',
      prompt_input: promptData,
      ai_response: parsedResponse,
      model_used: aiConfig.default_model || 'gpt-4o-mini',
      tokens_used: tokensUsed,
      cost_usd: costUsd,
      expires_at: expiresAt.toISOString(),
    });

    // Log usage (counts against limit)
    await supabaseClient.from('ai_usage_logs').insert({
      user_id: user.id,
      agency_id: profile.agency_id,
      client_id: clientId,
      feature: 'caption_generation',
      model_used: aiConfig.default_model || 'gpt-4o-mini',
      from_cache: false,
      tokens_used: tokensUsed,
      cost_usd: costUsd,
      request_payload: promptData,
    });

    return new Response(JSON.stringify({ 
      suggestions: parsedResponse.suggestions,
      fromCache: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-caption function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
