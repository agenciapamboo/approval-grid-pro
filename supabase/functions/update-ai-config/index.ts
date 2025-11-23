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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Service role para criptografia
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verificar autenticação
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se é admin (super_admin ou agency_admin)
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['super_admin', 'agency_admin']);

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const {
      openai_api_key,
      selected_models,
      default_model,
      whisper_model,
      vision_model,
      max_tokens_caption,
      max_tokens_briefing,
      temperature,
      prompt_skills,
      prompt_behavior,
    } = body;

    // Se há chave OpenAI, validar e criptografar
    let encrypted_key = null;
    if (openai_api_key && openai_api_key.startsWith('sk-')) {
      // Validar chave OpenAI (ping simples)
      try {
        const testResponse = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${openai_api_key}`,
          },
        });

        if (!testResponse.ok) {
          return new Response(JSON.stringify({ 
            error: 'Chave OpenAI inválida. Verifique e tente novamente.' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Criptografar chave usando pgcrypto via RPC
        const encryptionKey = Deno.env.get('OPENAI_KEY_ENCRYPTION_PASSPHRASE') || 'default-key-change-in-production';
        const { data: encryptedData, error: encryptError } = await supabaseClient
          .rpc('pgp_sym_encrypt', {
            data: openai_api_key,
            key: encryptionKey,
          });

        if (encryptError) {
          console.error('Encryption error:', encryptError);
          encrypted_key = openai_api_key; // Fallback: salvar em texto plano (não recomendado)
        } else {
          encrypted_key = encryptedData;
        }
      } catch (error) {
        console.error('Error validating OpenAI key:', error);
        return new Response(JSON.stringify({ 
          error: 'Erro ao validar chave OpenAI. Verifique sua conexão.' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Verificar se já existe config
    const { data: existingConfig } = await supabaseClient
      .from('ai_configurations')
      .select('id')
      .limit(1)
      .single();

    const configData = {
      ...(encrypted_key && { openai_api_key_encrypted: encrypted_key }),
      selected_models: selected_models || ['gpt-4o-mini', 'gpt-4o'],
      default_model: default_model || 'gpt-4o-mini',
      whisper_model: whisper_model || 'whisper-1',
      vision_model: vision_model || 'gpt-4o',
      max_tokens_caption: max_tokens_caption || 500,
      max_tokens_briefing: max_tokens_briefing || 2000,
      temperature: temperature || 0.7,
      prompt_skills: prompt_skills || 'Você é um assistente especializado em marketing digital e criação de conteúdo.',
      prompt_behavior: prompt_behavior || 'Seja criativo, objetivo e sempre mantenha a consistência com a identidade da marca.',
    };

    let result;
    if (existingConfig) {
      // Update
      const { data, error } = await supabaseClient
        .from('ai_configurations')
        .update(configData)
        .eq('id', existingConfig.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert
      const { data, error } = await supabaseClient
        .from('ai_configurations')
        .insert(configData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return new Response(JSON.stringify({ 
      success: true,
      config: {
        ...result,
        openai_api_key_encrypted: result.openai_api_key_encrypted 
          ? `sk-...${result.openai_api_key_encrypted.slice(-8)}`
          : null,
        hasApiKey: !!result.openai_api_key_encrypted,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in update-ai-config:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
