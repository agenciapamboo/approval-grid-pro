import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contentId } = await req.json();
    if (!contentId) {
      return new Response(JSON.stringify({ error: 'contentId é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Admin client (bypassa RLS)
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Authed client (para obter usuário a partir do token)
    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });

    const { data: userRes, error: userErr } = await authed.auth.getUser();
    if (userErr || !userRes?.user) {
      console.error('Falha ao obter usuário:', userErr);
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userRes.user.id;

    // Buscar conteúdo + agência do cliente
    const { data: content, error: contentErr } = await admin
      .from('contents')
      .select('id, client_id, owner_user_id, clients(agency_id)')
      .eq('id', contentId)
      .maybeSingle();

    if (contentErr || !content) {
      console.error('Conteúdo não encontrado:', contentErr);
      return new Response(JSON.stringify({ error: 'Conteúdo não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar perfil do usuário
    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('id, role, agency_id, client_id')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr || !profile) {
      console.error('Perfil não encontrado:', profileErr);
      return new Response(JSON.stringify({ error: 'Perfil não encontrado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const agencyId = (content as any).clients?.agency_id as string | null;
    const isOwner = content.owner_user_id === userId;
    const isSuper = profile.role === 'super_admin';
    const isAgencyAdminSameAgency = profile.role === 'agency_admin' && agencyId && profile.agency_id === agencyId;
    const isClientUserSameClient = profile.client_id && profile.client_id === content.client_id;

    const allowed = isOwner || isSuper || isAgencyAdminSameAgency || isClientUserSameClient;
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Sem permissão para remover este conteúdo' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Remoção de arquivos do storage será feita via trigger no banco (delete_content_media_files)
    // Portanto, não removemos arquivos diretamente aqui para evitar duplicidade/erros.


    // Remover registros dependentes e o conteúdo
    await admin.from('comments').delete().eq('content_id', contentId);
    await admin.from('content_texts').delete().eq('content_id', contentId);
    await admin.from('content_media').delete().eq('content_id', contentId);

    const { error: delErr } = await admin.from('contents').delete().eq('id', contentId);
    if (delErr) {
      console.error('Erro ao deletar conteúdo:', delErr);
      return new Response(JSON.stringify({ error: 'Erro ao deletar conteúdo' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log de atividade (best-effort)
    await admin.from('activity_log').insert({
      entity: 'content',
      entity_id: contentId,
      action: 'deleted',
      actor_user_id: userId,
      metadata: { reason: 'user_request' },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Erro inesperado ao deletar conteúdo:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Erro inesperado' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});