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
    console.log('=== Generate Caption Function Called ===');
    console.log('Method:', req.method);
    
    // Verificar se há Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No Authorization header found');
      return new Response(JSON.stringify({ 
        error: 'Authentication failed', 
        details: 'Authorization header missing' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extrair JWT do header
    const jwt = authHeader.replace('Bearer ', '');

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Validar autenticação passando o JWT explicitamente
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);
    
    if (authError || !user) {
      console.error('Auth error:', authError?.message || 'No user found');
      return new Response(JSON.stringify({ 
        error: 'Authentication failed', 
        details: authError?.message || 'Auth session missing!' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User authenticated:', user.id);

    // Ler body após autenticação
    const { clientId, contentType, context } = await req.json();

    if (!clientId || !contentType) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar perfil do usuário
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('agency_id, client_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Erro ao buscar profile:', profileError);
      return new Response(JSON.stringify({ 
        error: 'Profile error', 
        details: profileError.message || 'Erro ao buscar perfil do usuário' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!profile) {
      console.error('Profile not found for user:', user.id);
      return new Response(JSON.stringify({ 
        error: 'Profile not found',
        details: 'Seu perfil ainda não foi criado. Por favor, complete seu cadastro ou entre em contato com o suporte.' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Profile found:', { agency_id: profile.agency_id, client_id: profile.client_id });

    // Buscar agency_id: pode estar no profile ou através do client_id
    let agencyId = profile.agency_id;
    
    if (!agencyId && clientId) {
      // Se não tem agency_id no profile, buscar através do client_id
      console.log('Buscando agency_id através do client_id:', clientId);
      const { data: client, error: clientError } = await supabaseClient
        .from('clients')
        .select('agency_id')
        .eq('id', clientId)
        .single();

      if (clientError) {
        console.error('Erro ao buscar cliente:', clientError);
        return new Response(JSON.stringify({ 
          error: 'Client not found', 
          details: clientError.message || 'Cliente não encontrado' 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (client?.agency_id) {
        agencyId = client.agency_id;
        console.log('Agency_id encontrado através do cliente:', agencyId);
      }
    }

    if (!agencyId) {
      console.error('Agency not found. Profile agency_id:', profile.agency_id, 'Client ID:', clientId);
      return new Response(JSON.stringify({ 
        error: 'Agency not found', 
        details: 'Não foi possível identificar a agência associada ao cliente. Verifique se o cliente está vinculado a uma agência.' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('Using agency_id:', agencyId);

    // Buscar dados da agência para verificar o plano
    const { data: agency } = await supabaseClient
      .from('agencies')
      .select('plan')
      .eq('id', agencyId)
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

    // Build prompt hash for cache lookup (incluir agency_id para evitar conflito entre agências)
    const promptData = {
      type: 'caption',
      clientId,
      agencyId: agencyId,
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
      console.log('Cache hit found for prompt hash:', promptHash);
      
      // Update hit count (usar update simples em vez de RPC)
      const { error: updateError } = await supabaseClient
        .from('ai_response_cache')
        .update({ 
          last_hit_at: new Date().toISOString()
        })
        .eq('id', cachedResponse.id);
      
      if (updateError) {
        console.error('Error updating cache hit:', updateError);
        // Não falhar se não conseguir atualizar o cache
      }

      // Log cache hit (doesn't count against limit)
      await supabaseClient.from('ai_usage_logs').insert({
        user_id: user.id,
        agency_id: agencyId,
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

    // Get client AI profile and client data
    const { data: client } = await supabaseClient
      .from('clients')
      .select('agency_id')
      .eq('id', clientId)
      .single();

    const { data: clientProfile } = await supabaseClient
      .from('client_ai_profiles')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const clientProfileData = clientProfile || null;

    // Buscar templates da agência para usar como base
    const { data: templates } = await supabaseClient
      .from('ai_text_templates')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('template_type', contentType === 'post' || contentType === 'plan_caption' || contentType === 'plan_description' ? 'caption' : 'script')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5);

    // Build system prompt
    let systemPrompt = 'Você é um especialista em copywriting para redes sociais.';
    
    if (clientProfileData) {
      systemPrompt += `\n\nPERFIL DO CLIENTE:`;
      if (clientProfileData.profile_summary) {
        systemPrompt += `\n- Negócio: ${clientProfileData.profile_summary}`;
      }
      if (clientProfileData.tone_of_voice?.length > 0) {
        systemPrompt += `\n- Tom de Voz da Marca: ${clientProfileData.tone_of_voice.join(', ')}`;
      }
      if (clientProfileData.content_pillars?.length > 0) {
        systemPrompt += `\n- Pilares de Conteúdo: ${clientProfileData.content_pillars.join(', ')}`;
      }
      if (clientProfileData.keywords?.length > 0) {
        systemPrompt += `\n- Palavras-chave: ${clientProfileData.keywords.join(', ')}`;
      }
    }

    // Incluir templates da agência como exemplos/estruturas base
    if (templates && templates.length > 0) {
      systemPrompt += `\n\nTEMPLATES DE REFERÊNCIA DA AGÊNCIA:`;
      templates.forEach((t, i) => {
        systemPrompt += `\n\n[Template ${i + 1}] ${t.template_name}:`;
        if (t.category) systemPrompt += `\nCategoria: ${t.category}`;
        if (t.tone && t.tone.length > 0) systemPrompt += `\nTom: ${t.tone.join(', ')}`;
        systemPrompt += `\n${t.template_content}`;
      });
      systemPrompt += `\n\nUse esses templates como inspiração/estrutura, mas adapte ao contexto específico fornecido.`;
    }

    systemPrompt += `\n\nSua tarefa é gerar ${contentType === 'post' ? '3 legendas criativas' : '3 roteiros de vídeo'} considerando o contexto fornecido.`;

    // Build user prompt with enriched context
    const { title, objective, toneOfVoice, expectedAction, category, description } = context || {};

    let userPrompt = `Contexto da Peça:\n`;

    if (title) {
      userPrompt += `- Título: ${title}\n`;
    }

    if (objective) {
      const objectiveLabels: Record<string, string> = {
        engagement: "Aumentar engajamento (curtidas, comentários)",
        awareness: "Reconhecimento de marca",
        traffic: "Gerar tráfego para site/loja",
        conversion: "Conversão/Vendas",
        education: "Educar o público",
        entertainment: "Entretenimento",
        community: "Fortalecer comunidade",
      };
      userPrompt += `- Objetivo: ${objectiveLabels[objective] || objective}\n`;
    }

    if (toneOfVoice) {
      if (toneOfVoice === 'brand' && clientProfileData?.tone_of_voice) {
        userPrompt += `- Tom de Voz: Use o tom da marca (${clientProfileData.tone_of_voice.join(', ')})\n`;
      } else {
        const toneLabels: Record<string, string> = {
          friendly: "Amigável",
          professional: "Profissional/Séria",
          institutional: "Institucional",
        };
        userPrompt += `- Tom de Voz: ${toneLabels[toneOfVoice] || toneOfVoice}\n`;
      }
    }

    if (expectedAction) {
      userPrompt += `- Ação Esperada: ${expectedAction}\n`;
    }

    if (category) {
      userPrompt += `- Categoria: ${category}\n`;
    }

    if (description) {
      userPrompt += `- Descrição Adicional: ${description}\n`;
    }

    userPrompt += `\nGere as sugestões em JSON: {"suggestions": ["...", "...", "..."]}`;

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
      agency_id: agencyId,
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
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error details:', errorDetails);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: errorDetails
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
