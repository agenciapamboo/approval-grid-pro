import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para decodificar JWT manualmente (fallback)
function decodeJWT(token: string): { sub?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('❌ JWT inválido: não possui 3 partes');
      return null;
    }
    
    const payload = parts[1];
    // Decodificar base64url
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(decoded);
    console.log('🔓 JWT decodificado:', { sub: parsed.sub, exp: parsed.exp });
    return parsed;
  } catch (e) {
    console.error('❌ Erro ao decodificar JWT:', e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Generate Caption Function Called ===');
    console.log('Method:', req.method);
    // Não logar headers completos por segurança (contém token JWT)
    const hasAuth = req.headers.get('Authorization') ? 'present' : 'missing';
    console.log('Authorization header:', hasAuth);
    
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

    // Ler body primeiro (antes de criar cliente para não consumir o stream)
    let body;
    try {
      body = await req.json();
      console.log('Body received:', { clientId: body.clientId, contentType: body.contentType });
    } catch (parseError) {
      console.error('Error parsing body:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid request body',
        details: parseError instanceof Error ? parseError.message : 'Failed to parse JSON'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { clientId, contentType, context } = body;

    // Criar cliente Supabase com header Authorization padrão
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Tentar validação padrão primeiro
    let user = null;
    const { data: authData, error: authError } = await supabaseClient.auth.getUser();

    if (authData?.user) {
      user = authData.user;
      console.log('✅ User authenticated via auth.getUser():', user.id);
    } else {
      // FALLBACK: Validação manual de JWT
      console.log('⚠️ auth.getUser() falhou, tentando validação manual de JWT...');
      console.log('Erro original:', authError?.message);
      
      const token = authHeader.replace('Bearer ', '');
      const payload = decodeJWT(token);
      
      if (payload?.sub) {
        console.log('✅ User ID extraído do JWT via fallback:', payload.sub);
        
        // Verificar se token não está expirado
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          console.error('❌ Token JWT expirado');
          return new Response(JSON.stringify({ 
            error: 'Authentication failed', 
            details: 'Token expirado' 
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        user = { id: payload.sub };
      } else {
        console.error('❌ Falha na validação manual de JWT');
        return new Response(JSON.stringify({ 
          error: 'Authentication failed', 
          details: authError?.message || 'Não foi possível validar o token' 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('User authenticated:', user.id);

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
      .single();

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
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
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

    // Verificar se há templateId específico no contexto
    const { templateId } = context || {};
    let selectedTemplate = null;
    
    if (templateId) {
      // Buscar template específico selecionado pelo usuário
      const { data: templateData } = await supabaseClient
        .from('ai_text_templates')
        .select('*')
        .eq('id', templateId)
        .eq('is_active', true)
        .single();
      
      if (templateData) {
        selectedTemplate = templateData;
        console.log('Using selected template:', templateData.template_name);
      }
    }

    // Buscar templates da agência E templates globais (super_admin) para usar como base
    // Templates globais têm agency_id = NULL
    const { data: agencyTemplates } = await supabaseClient
      .from('ai_text_templates')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('template_type', contentType === 'post' || contentType === 'plan_caption' || contentType === 'plan_description' ? 'caption' : 'script')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: globalTemplates } = await supabaseClient
      .from('ai_text_templates')
      .select('*')
      .is('agency_id', null)
      .eq('template_type', contentType === 'post' || contentType === 'plan_caption' || contentType === 'plan_description' ? 'caption' : 'script')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(3);

    // Combinar templates: template selecionado primeiro, depois templates da agência, depois globais
    const templates: any[] = [];
    if (selectedTemplate) {
      templates.push(selectedTemplate);
    }
    if (agencyTemplates) {
      // Evitar duplicatas se o template selecionado já está na lista
      agencyTemplates.forEach(t => {
        if (!selectedTemplate || t.id !== selectedTemplate.id) {
          templates.push(t);
        }
      });
    }
    if (globalTemplates) {
      // Adicionar templates globais, evitando duplicatas
      globalTemplates.forEach(t => {
        if (!templates.find(existing => existing.id === t.id)) {
          templates.push(t);
        }
      });
    }
    
    // Limitar a 5 templates no total
    const finalTemplates = templates.slice(0, 5);

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

    // Incluir templates como exemplos/estruturas base
    if (finalTemplates && finalTemplates.length > 0) {
      if (selectedTemplate) {
        systemPrompt += `\n\nTEMPLATE SELECIONADO (use como base principal):`;
        systemPrompt += `\n\n[Template Selecionado] ${selectedTemplate.template_name}:`;
        if (selectedTemplate.category) systemPrompt += `\nCategoria: ${selectedTemplate.category}`;
        if (selectedTemplate.tone && selectedTemplate.tone.length > 0) {
          systemPrompt += `\nTom: ${selectedTemplate.tone.join(', ')}`;
        }
        systemPrompt += `\n${selectedTemplate.template_content}`;
        
        if (finalTemplates.length > 1) {
          systemPrompt += `\n\nTEMPLATES DE REFERÊNCIA ADICIONAIS:`;
          finalTemplates.slice(1).forEach((t, i) => {
            systemPrompt += `\n\n[Template ${i + 1}] ${t.template_name}:`;
            if (t.category) systemPrompt += `\nCategoria: ${t.category}`;
            if (t.tone && t.tone.length > 0) systemPrompt += `\nTom: ${t.tone.join(', ')}`;
            systemPrompt += `\n${t.template_content}`;
          });
        }
      } else {
        systemPrompt += `\n\nTEMPLATES DE REFERÊNCIA:`;
        finalTemplates.forEach((t, i) => {
          systemPrompt += `\n\n[Template ${i + 1}] ${t.template_name}:`;
          if (t.category) systemPrompt += `\nCategoria: ${t.category}`;
          if (t.tone && t.tone.length > 0) systemPrompt += `\nTom: ${t.tone.join(', ')}`;
          systemPrompt += `\n${t.template_content}`;
        });
      }
      systemPrompt += `\n\nUse esses templates como inspiração/estrutura, mas adapte ao contexto específico fornecido.`;
    }

    systemPrompt += `\n\nSua tarefa é gerar ${contentType === 'post' ? '1 legenda criativa e completa' : '1 roteiro de vídeo completo'} considerando o contexto fornecido.`;

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

    // Verificar se é carrossel e ajustar prompt
    if (contentType === 'carousel') {
      const slideCount = context?.slideCount || 5;
      userPrompt += `\n\nGere 1 legenda principal para o carrossel E ${slideCount} slides estruturados.
Cada slide deve ter:
- headline: Uma frase de impacto curta (máx 8 palavras)
- text: Texto explicativo conciso (máx 2 linhas)

IMPORTANTE: Retorne APENAS um objeto JSON válido, SEM markdown, SEM blocos de código.
Formato exato: 
{
  "caption": "Legenda principal do carrossel com hashtags",
  "slides": [
    {"order": 0, "headline": "Headline do Slide 1", "text": "Texto explicativo do slide 1"},
    {"order": 1, "headline": "Headline do Slide 2", "text": "Texto explicativo do slide 2"}
  ]
}`;
    } else {
      userPrompt += `\n\nGere 1 legenda completa entre 100-300 palavras incluindo:
- Gancho inicial (primeira linha chamativa)
- Corpo do texto (conteúdo principal com storytelling)
- CTA (call-to-action claro e persuasivo)
- Hashtags relevantes (5-10 hashtags estratégicas)

IMPORTANTE: Retorne APENAS um objeto JSON válido, SEM markdown, SEM blocos de código, SEM explicações.
Formato exato: {"suggestions": ["legenda completa aqui"]}`;
    }

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
        max_tokens: aiConfig.max_tokens_caption || 1200,
        response_format: { type: "json_object" }, // ✅ Forçar resposta em JSON puro
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
    let responseContent = openAIData.choices[0].message.content;
    
    // ✅ CORREÇÃO: Remover blocos markdown se existirem (```json ... ```)
    if (responseContent.includes('```json')) {
      responseContent = responseContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    } else if (responseContent.includes('```')) {
      responseContent = responseContent.replace(/```\s*/g, '').trim();
    }
    
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError);
      console.log('Conteúdo recebido:', responseContent);
      // Se falhar o parse, tentar extrair apenas o texto
      parsedResponse = { suggestions: [responseContent] };
    }

    const tokensUsed = openAIData.usage?.total_tokens || 0;
    const costUsd = (tokensUsed / 1000) * 0.0001;

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

    // Salvar no agency_caption_cache para ML e reaproveitamento
    try {
      const cacheInsert: any = {
        agency_id: agencyId,
        client_id: clientId,
        content_type: contentType === 'carousel' ? 'carousel' : (contentType === 'post' ? 'caption' : 'script'),
        title: context?.title || null,
        pillar: context?.contentPillar || null,
        tone: context?.toneOfVoice ? [context.toneOfVoice] : null,
        objective: context?.objective || null,
        template_id: context?.templateId || null,
        created_by: user.id,
      };

      if (contentType === 'carousel' && parsedResponse.slides) {
        // Para carrossel: salvar caption + slides estruturados
        cacheInsert.caption = parsedResponse.caption || '';
        cacheInsert.slides = parsedResponse.slides;
        // Extrair hashtags da caption
        const hashtagMatches = (parsedResponse.caption || '').match(/#\w+/g) || [];
        cacheInsert.hashtags = hashtagMatches;
      } else {
        // Para caption/script normal: salvar suggestions[0]
        cacheInsert.caption = parsedResponse.suggestions?.[0] || '';
        // Extrair hashtags
        const hashtagMatches = (parsedResponse.suggestions?.[0] || '').match(/#\w+/g) || [];
        cacheInsert.hashtags = hashtagMatches;
      }

      await supabaseClient.from('agency_caption_cache').insert(cacheInsert);
      console.log('✅ Caption salva no cache da agência para ML/reaproveitamento');
    } catch (cacheError) {
      console.error('⚠️ Erro ao salvar no agency_caption_cache (não fatal):', cacheError);
      // Não falhar a função se o cache falhar
    }

    // Retornar resposta apropriada baseada no tipo
    if (contentType === 'carousel') {
      return new Response(JSON.stringify({ 
        caption: parsedResponse.caption,
        slides: parsedResponse.slides,
        fromCache: false 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ 
        suggestions: parsedResponse.suggestions,
        fromCache: false 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
