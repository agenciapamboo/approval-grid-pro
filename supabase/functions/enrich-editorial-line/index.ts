import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { clientId, monthContext, jwt } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    // Tentar validação padrão primeiro
    let user = null;
    const { data: authData, error: authError } = await supabaseClient.auth.getUser(jwt);

    if (authData?.user) {
      user = authData.user;
      console.log('✅ User authenticated via auth.getUser():', user.id);
    } else {
      // FALLBACK: Validação manual de JWT
      console.log('⚠️ auth.getUser() falhou, tentando validação manual de JWT...');
      console.log('Erro original:', authError?.message);
      
      const payload = decodeJWT(jwt);
      
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar perfil e linha editorial base
    const { data: profile } = await supabaseClient
      .from('client_ai_profiles')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (!profile?.editorial_line) {
      return new Response(JSON.stringify({ 
        error: 'Linha editorial base não encontrada. Gere a linha editorial primeiro.' 
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

    // Descriptografar API key usando a função RPC
    const { data: decryptedKey, error: decryptError } = await supabaseClient.rpc('decrypt_api_key', {
      encrypted_key: aiConfig.openai_api_key_encrypted
    });

    if (decryptError || !decryptedKey) {
      console.error('❌ Erro ao descriptografar API key:', decryptError?.message);
      return new Response(JSON.stringify({ 
        error: 'Failed to decrypt API key' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAIApiKey = decryptedKey;

    // Criar prompt para enriquecer linha editorial
    const systemPrompt = `Você é um especialista em estratégia de conteúdo digital. 
    Enriqueça a linha editorial existente com informações específicas do mês informado pelo usuário.`;

    const userPrompt = `
LINHA EDITORIAL BASE:
${profile.editorial_line}

CONTEXTO DO MÊS:
${monthContext}

PILARES DO CLIENTE:
${profile.content_pillars?.join(', ') || 'Não informado'}

Enriqueça a linha editorial considerando:
1. Eventos e datas importantes do mês
2. Tendências de redes sociais do período
3. Oportunidades de conteúdo sazonal
4. Alinhamento com os pilares do cliente
5. Sugestões de temas específicos

Retorne uma linha editorial enriquecida em formato de texto estruturado.
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
    const enrichedEditorial = data.choices[0].message.content;

    // Atualizar linha editorial enriquecida
    const { error: updateError } = await supabaseClient
      .from('client_ai_profiles')
      .update({ editorial_line: enrichedEditorial })
      .eq('client_id', clientId);

    if (updateError) {
      console.error('Error updating enriched editorial:', updateError);
    }

    // Buscar agency_id do cliente para o log
    const { data: clientData } = await supabaseClient
      .from('clients')
      .select('agency_id')
      .eq('id', clientId)
      .single();

    // Log de uso
    await supabaseClient.from('ai_usage_logs').insert({
      user_id: user.id,
      agency_id: clientData?.agency_id,
      client_id: clientId,
      feature: 'enrich_editorial_line',
      model_used: 'gpt-4o-mini',
      tokens_used: data.usage?.total_tokens || 0,
      cost_usd: (data.usage?.total_tokens || 0) * 0.00000015,
      from_cache: false,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      enrichedEditorial,
      tokens: data.usage?.total_tokens 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error enriching editorial line:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
