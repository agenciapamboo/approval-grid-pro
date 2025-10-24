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
      throw new Error('contentId é obrigatório');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 1. Buscar conteúdo
    const { data: content, error: contentError } = await supabaseClient
      .from('contents')
      .select('*, content_texts(*), content_media(*)')
      .eq('id', contentId)
      .single();

    if (contentError || !content) {
      throw new Error('Conteúdo não encontrado');
    }

    // Verificar se o conteúdo já foi publicado
    if (content.published_at) {
      console.log(`Conteúdo ${contentId} já foi publicado em ${content.published_at}`);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Conteúdo já foi publicado anteriormente',
          published_at: content.published_at
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Verificar se o conteúdo está aprovado
    if (content.status !== 'approved') {
      console.log(`Conteúdo ${contentId} não está aprovado. Status atual: ${content.status}`);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Conteúdo não pode ser publicado. Status: ${content.status}`,
          status: content.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Verificar se há ajustes pendentes
    const { data: pendingAdjustments, error: adjustmentsError } = await supabaseClient
      .from('comments')
      .select('id')
      .eq('content_id', contentId)
      .eq('is_adjustment_request', true)
      .limit(1);

    if (adjustmentsError) {
      console.error('Erro ao verificar ajustes pendentes:', adjustmentsError);
    }

    if (pendingAdjustments && pendingAdjustments.length > 0) {
      console.log(`Conteúdo ${contentId} possui ajustes pendentes`);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Conteúdo possui ajustes pendentes',
          pending_adjustments: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 2. Buscar contas sociais ativas do cliente
    const { data: accounts, error: accountsError } = await supabaseClient
      .from('client_social_accounts')
      .select('*')
      .eq('client_id', content.client_id)
      .eq('is_active', true);

    if (accountsError) {
      throw new Error('Erro ao buscar contas sociais');
    }

    if (!accounts || accounts.length === 0) {
      throw new Error('Nenhuma conta social conectada');
    }

    const results = [];
    const errors = [];

    // 3. Publicar em cada conta
    for (const account of accounts) {
      try {
        let postId = null;

        if (account.platform === 'facebook') {
          postId = await publishToFacebook(content, account);
        } else if (account.platform === 'instagram') {
          postId = await publishToInstagram(content, account);
        }

        if (postId) {
          results.push({
            platform: account.platform,
            account: account.account_name,
            postId,
            success: true,
          });
        }
      } catch (error: any) {
        console.error(`Erro ao publicar no ${account.platform}:`, error);
        errors.push({
          platform: account.platform,
          account: account.account_name,
          error: error.message,
        });
      }
    }

    // 4. Atualizar status do conteúdo
    const hasSuccess = results.length > 0;
    await supabaseClient
      .from('contents')
      .update({
        published_at: hasSuccess ? new Date().toISOString() : null,
        publish_error: errors.length > 0 ? JSON.stringify(errors) : null,
      })
      .eq('id', contentId);

    return new Response(
      JSON.stringify({ 
        success: hasSuccess,
        results,
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function publishToFacebook(content: any, account: any): Promise<string> {
  const caption = content.content_texts?.[0]?.caption || '';
  const media = content.content_media?.[0];
  const contentType = content.type; // 'image', 'carousel', 'reels', 'story', 'feed'

  let url = `https://graph.facebook.com/v18.0/${account.page_id}/feed`;
  const params: any = {
    access_token: account.access_token,
  };

  // Story
  if (contentType === 'story') {
    if (!media || !media.src_url) {
      throw new Error('Story requer mídia');
    }
    
    url = `https://graph.facebook.com/v18.0/${account.page_id}/photo_stories`;
    if (media.kind === 'image') {
      params.photo_url = media.src_url;
    } else if (media.kind === 'video') {
      url = `https://graph.facebook.com/v18.0/${account.page_id}/video_stories`;
      params.video_url = media.src_url;
    }
  }
  // Carrossel
  else if (contentType === 'carousel') {
    // Para carrossel, precisaria criar um álbum ou usar múltiplas imagens
    // Por simplicidade, vamos postar como imagem única
    if (media && media.src_url && media.kind === 'image') {
      url = `https://graph.facebook.com/v18.0/${account.page_id}/photos`;
      params.url = media.src_url;
      params.caption = caption;
    } else {
      params.message = caption;
    }
  }
  // Reels/Video
  else if (contentType === 'reels' || (media && media.kind === 'video')) {
    url = `https://graph.facebook.com/v18.0/${account.page_id}/videos`;
    params.file_url = media.src_url;
    params.description = caption;
  }
  // Imagem
  else if (media && media.src_url && media.kind === 'image') {
    url = `https://graph.facebook.com/v18.0/${account.page_id}/photos`;
    params.url = media.src_url;
    params.caption = caption;
  }
  // Texto puro
  else {
    params.message = caption;
  }

  const formBody = Object.keys(params)
    .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(params[key]))
    .join('&');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody,
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'Erro ao publicar no Facebook');
  }

  return data.id || data.post_id;
}

async function publishToInstagram(content: any, account: any): Promise<string> {
  const caption = content.content_texts?.[0]?.caption || '';
  const media = content.content_media?.[0];
  const contentType = content.type; // 'image', 'carousel', 'reels', 'story', 'feed'

  if (!media || !media.src_url) {
    throw new Error('Instagram requer mídia (imagem ou vídeo)');
  }

  const igAccountId = account.instagram_business_account_id;
  if (!igAccountId) {
    throw new Error('ID da conta Instagram não encontrado');
  }

  // 1. Criar container de mídia
  let containerUrl = `https://graph.facebook.com/v18.0/${igAccountId}/media`;
  const containerParams: any = {
    caption,
    access_token: account.access_token,
  };

  // Story
  if (contentType === 'story') {
    containerParams.media_type = 'STORIES';
    if (media.kind === 'image') {
      containerParams.image_url = media.src_url;
    } else if (media.kind === 'video') {
      containerParams.video_url = media.src_url;
    }
  }
  // Reels
  else if (contentType === 'reels') {
    containerParams.media_type = 'REELS';
    containerParams.video_url = media.src_url;
    // Suporta thumbnail customizada
    if (media.thumb_url) {
      containerParams.thumb_offset = '0'; // ou usar thumb_url se suportado
    }
  }
  // Carrossel
  else if (contentType === 'carousel') {
    // Para carrossel, precisaria criar múltiplos containers
    // Por simplicidade, vamos postar como imagem única
    if (media.kind === 'image') {
      containerParams.image_url = media.src_url;
    } else if (media.kind === 'video') {
      containerParams.media_type = 'VIDEO';
      containerParams.video_url = media.src_url;
    }
  }
  // Feed normal (imagem ou vídeo)
  else {
    if (media.kind === 'image') {
      containerParams.image_url = media.src_url;
    } else if (media.kind === 'video') {
      containerParams.media_type = 'VIDEO';
      containerParams.video_url = media.src_url;
      // Suporta thumbnail customizada para vídeos
      if (media.thumb_url) {
        containerParams.thumb_offset = '0';
      }
    } else {
      throw new Error('Tipo de mídia não suportado pelo Instagram');
    }
  }

  const containerFormBody = Object.keys(containerParams)
    .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(containerParams[key]))
    .join('&');

  const containerResponse = await fetch(containerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: containerFormBody,
  });

  const containerData = await containerResponse.json();

  if (containerData.error) {
    throw new Error(containerData.error.message || 'Erro ao criar container de mídia');
  }

  const creationId = containerData.id;

  // 2. Publicar container
  const publishUrl = `https://graph.facebook.com/v18.0/${igAccountId}/media_publish`;
  const publishParams: Record<string, string> = {
    creation_id: creationId,
    access_token: account.access_token,
  };

  const publishFormBody = Object.keys(publishParams)
    .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(publishParams[key]))
    .join('&');

  const publishResponse = await fetch(publishUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: publishFormBody,
  });

  const publishData = await publishResponse.json();

  if (publishData.error) {
    throw new Error(publishData.error.message || 'Erro ao publicar no Instagram');
  }

  return publishData.id;
}
