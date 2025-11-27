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
    console.log('=== Generate Monthly Plan Function Called ===');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header missing' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { clientId, period, startDate } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
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
        const userId = payload.sub;
        console.log('✅ User ID extraído do JWT:', userId);
        
        // Verificar se o token está expirado
        if (payload.exp && payload.exp < Date.now() / 1000) {
          console.error('❌ Token JWT expirado');
          return new Response(JSON.stringify({ error: 'Token expirado' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Buscar dados do usuário manualmente
        const { data: userData, error: userError } = await supabaseClient
          .from('profiles')
          .select('id, name, email, role, agency_id')
          .eq('id', userId)
          .single();
        
        if (userError || !userData) {
          console.error('❌ Erro ao buscar perfil do usuário:', userError?.message);
          return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Criar objeto de usuário compatível
        user = {
          id: userData.id,
          email: userData.email || '',
          user_metadata: { name: userData.name }
        };
        console.log('✅ Usuário autenticado via fallback JWT:', user.id);
      } else {
        console.error('❌ Não foi possível extrair user ID do token');
        return new Response(JSON.stringify({ error: 'Authentication failed' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar dados do cliente
    const { data: client } = await supabaseClient
      .from('clients')
      .select('name, monthly_creatives, agency_id')
      .eq('id', clientId)
      .single();

    if (!client) {
      return new Response(JSON.stringify({ error: 'Cliente não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar perfil AI do cliente
    const { data: clientProfile } = await supabaseClient
      .from('client_ai_profiles')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Buscar templates ativos da agência
    const { data: templates } = await supabaseClient
      .from('ai_text_templates')
      .select('*')
      .eq('agency_id', client.agency_id)
      .eq('is_active', true)
      .limit(5);

    // Buscar configuração de IA
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

    // Descriptografar API key
    const { data: decryptedKey } = await supabaseClient.rpc('decrypt_api_key', {
      encrypted_key: aiConfig.openai_api_key_encrypted
    });

    if (!decryptedKey) {
      return new Response(JSON.stringify({ error: 'Failed to decrypt API key' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calcular número de posts baseado no período
    let postsCount = client.monthly_creatives || 12;
    if (period === 'week') postsCount = Math.ceil(postsCount / 4);
    if (period === 'fortnight') postsCount = Math.ceil(postsCount / 2);

    // Construir prompt do sistema
    let systemPrompt = `Você é um planejador estratégico de conteúdo para redes sociais.

PERFIL DO CLIENTE:`;
    
    if (clientProfile) {
      if (clientProfile.profile_summary) {
        systemPrompt += `\n- Negócio: ${clientProfile.profile_summary}`;
      }
      if (clientProfile.tone_of_voice?.length > 0) {
        systemPrompt += `\n- Tom de Voz: ${clientProfile.tone_of_voice.join(', ')}`;
      }
      if (clientProfile.content_pillars?.length > 0) {
        systemPrompt += `\n- Pilares de Conteúdo: ${clientProfile.content_pillars.join(', ')}`;
      }
      if (clientProfile.editorial_line) {
        systemPrompt += `\n\nLINHA EDITORIAL:\n${clientProfile.editorial_line}`;
      }
      if (clientProfile.post_frequency) {
        systemPrompt += `\n\nFrequência de Posts: ${clientProfile.post_frequency}`;
      }
      if (clientProfile.content_mix) {
        systemPrompt += `\n\nMix de Conteúdo: ${JSON.stringify(clientProfile.content_mix)}`;
      }
    }

    if (templates && templates.length > 0) {
      systemPrompt += `\n\nTEMPLATES DE REFERÊNCIA:`;
      templates.forEach((t, i) => {
        systemPrompt += `\n\n[Template ${i + 1}] ${t.template_name}:`;
        if (t.category) systemPrompt += `\nCategoria: ${t.category}`;
        systemPrompt += `\n${t.template_content}`;
      });
    }

    systemPrompt += `\n\nGere um planejamento de ${postsCount} posts para ${period === 'week' ? 'uma semana' : period === 'fortnight' ? 'uma quinzena' : 'um mês'}.`;

    const userPrompt = `Gere ${postsCount} posts completos para o cliente ${client.name}, começando em ${startDate}.

Para cada post, forneça:
- title: Título do post (máx 100 caracteres)
- date: Data sugerida (YYYY-MM-DD)
- type: Tipo (feed, reels, story ou carousel)
- category: Categoria do conteúdo
- caption: Legenda completa (100-300 palavras com gancho, corpo, CTA e hashtags)
- hashtags: Array com 5-10 hashtags relevantes
- media_suggestion: Descrição da mídia sugerida

Retorne em JSON: {"posts": [{...}, {...}, ...]}`;

    // Chamar OpenAI
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
        temperature: 0.8,
        max_tokens: 4000,
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
      parsedResponse = { posts: [] };
    }

    const tokensUsed = openAIData.usage?.total_tokens || 0;
    const costUsd = (tokensUsed / 1000) * 0.0001;

    // Registrar uso de IA
    await supabaseClient.from('ai_usage_logs').insert({
      user_id: user.id,
      agency_id: client.agency_id,
      client_id: clientId,
      feature: 'monthly_plan_generation',
      model_used: aiConfig.default_model || 'gpt-4o-mini',
      from_cache: false,
      tokens_used: tokensUsed,
      cost_usd: costUsd,
    });

    return new Response(JSON.stringify({ 
      posts: parsedResponse.posts || [],
      tokensUsed,
      costUsd
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-monthly-plan function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
