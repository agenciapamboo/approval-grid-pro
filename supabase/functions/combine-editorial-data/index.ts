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

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { clientId, jwt } = await req.json();
    console.log('[combine-editorial-data] payload', { clientId });

    if (!clientId || !jwt) {
      return new Response(JSON.stringify({ error: 'clientId e jwt são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const safeParseJson = <T>(value: unknown): T | null => {
      if (!value) return null;
      if (typeof value === 'object') return value as T;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value) as T;
        } catch {
          return null;
        }
      }
      return null;
    };

    const normalizeArray = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        return value.filter((item) => typeof item === 'string');
      }
      if (typeof value === 'string') {
        return value.split(',').map((item) => item.trim()).filter(Boolean);
      }
      return [];
    };

    const resolveStringArray = (primary: unknown, secondary: unknown = []): string[] => {
      const normalizedPrimary = normalizeArray(primary);
      if (normalizedPrimary.length > 0) {
        return normalizedPrimary;
      }
      return normalizeArray(secondary);
    };

    const { data: profile, error: profileError } = await supabaseClient
      .from('client_ai_profiles')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle();

    const { data: client, error: clientError } = await supabaseClient
      .from('clients')
      .select('name, monthly_creatives')
      .eq('id', clientId)
      .single();

    const { count: creativesCount, error: countError } = await supabaseClient
      .from('contents')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId);

    if (profileError || clientError || countError) {
      return new Response(JSON.stringify({ 
        error: 'Erro ao buscar dados',
        details: profileError?.message || clientError?.message || countError?.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const editorialLineRaw = profile?.editorial_line;
    const editorialParsed = safeParseJson<{
      editorial_line?: string;
      text?: string;
      post_frequency?: string;
      best_posting_times?: string[];
      content_mix?: Record<string, number>;
    }>(editorialLineRaw);

    const editorialText =
      editorialParsed?.editorial_line ||
      editorialParsed?.text ||
      (typeof editorialLineRaw === 'string' ? editorialLineRaw : null);

    const targetPersona =
      safeParseJson<Record<string, any>>(profile?.target_persona) ||
      (profile?.target_persona as Record<string, any> | null) ||
      (profile?.ai_generated_profile?.target_persona as Record<string, any> | null) ||
      null;

    const contentPillars = resolveStringArray(
      profile?.content_pillars,
      profile?.ai_generated_profile?.content_pillars
    );

    const toneOfVoice = resolveStringArray(
      profile?.tone_of_voice,
      profile?.ai_generated_profile?.tone_of_voice
    );

    const keywords = resolveStringArray(
      profile?.keywords,
      profile?.ai_generated_profile?.keywords
    );

    const bestPostingTimes =
      profile?.best_posting_times ||
      editorialParsed?.best_posting_times ||
      profile?.ai_generated_profile?.content_strategy?.best_times ||
      [];

    const contentMix =
      profile?.content_mix ||
      editorialParsed?.content_mix ||
      profile?.ai_generated_profile?.content_strategy?.content_mix ||
      {};

    const postFrequency =
      profile?.post_frequency ||
      editorialParsed?.post_frequency ||
      profile?.ai_generated_profile?.content_strategy?.post_frequency ||
      null;

    const statsMonthlyLimit =
      client?.monthly_creatives ||
      profile?.ai_generated_profile?.content_strategy?.monthly_limit ||
      0;

    const combinedData = {
      profile: {
        client_name: client?.name ?? null,
        summary: profile?.profile_summary ?? profile?.ai_generated_profile?.summary ?? null,
        target_persona: targetPersona,
        content_pillars: contentPillars,
        tone_of_voice: toneOfVoice,
        keywords,
      },
      editorial: {
        text: editorialText ?? null,
        post_frequency: postFrequency,
        best_posting_times: bestPostingTimes,
        content_mix: contentMix,
      },
      stats: {
        total_count: creativesCount || 0,
        monthly_limit: statsMonthlyLimit,
      }
    };

    console.log('[combine-editorial-data] response', combinedData);

    return new Response(JSON.stringify({ success: true, data: combinedData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error combining editorial data:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
