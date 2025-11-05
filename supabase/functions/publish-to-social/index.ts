import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { notifyError, notifyWarning } from '../_shared/internal-notifications.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let contentId: string | undefined;

  try {
    console.log('=== Iniciando publicação ===');
    
    const body = await req.json();
    contentId = body.contentId;
    console.log('Content ID recebido:', contentId);

    if (!contentId) {
      console.error('contentId não fornecido');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'contentId é obrigatório'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // IMPORTANTE: Usar SERVICE_ROLE_KEY para bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('Buscando conteúdo...');
    
    // 1. Buscar conteúdo
    const { data: content, error: contentError } = await supabaseClient
      .from('contents')
      .select('*, content_texts(*), content_media(*)')
      .eq('id', contentId)
      .single();

    if (contentError) {
      console.error('Erro ao buscar conteúdo:', contentError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Erro ao buscar conteúdo: ' + contentError.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!content) {
      console.error('Conteúdo não encontrado');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Conteúdo não encontrado'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log('Conteúdo encontrado:', content.id, 'Status:', content.status);

    // Conteúdo já possui published_at, mas permitimos re-publicação para tentar novamente plataformas que falharam
    if (content.published_at) {
      console.log(`Conteúdo ${contentId} já possui published_at (${content.published_at}) - prosseguindo para re-publicação`);
    }

    // Validação de status removida - conteúdo pode ser publicado em qualquer status


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

    console.log('Buscando contas sociais do cliente:', content.client_id);
    
    // 2. Buscar contas sociais ativas do cliente com tokens descriptografados
    const { data: accounts, error: accountsError } = await supabaseClient
      .from('client_social_accounts_decrypted')
      .select('*')
      .eq('client_id', content.client_id)
      .eq('is_active', true);

    if (accountsError) {
      console.error('Erro ao buscar contas sociais:', accountsError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Erro ao buscar contas sociais: ' + accountsError.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!accounts || accounts.length === 0) {
      console.error('Nenhuma conta social conectada para o cliente');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Nenhuma conta social conectada. Configure as contas sociais antes de publicar.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Contas sociais encontradas:', accounts.length);

    const targetPlatforms = Array.isArray((content as any).channels) && (content as any).channels.length > 0
      ? (content as any).channels.map((ch: string) => String(ch).toLowerCase())
      : [];

    const accountsToPublish = targetPlatforms.length > 0
      ? accounts.filter((acc: any) => targetPlatforms.includes(String(acc.platform).toLowerCase()))
      : accounts;

    console.log('Publicando para plataformas alvo:', targetPlatforms.length > 0 ? targetPlatforms.join(', ') : 'todas ativas');

    const results = [];
    const errors = [];

    // 3. Publicar em cada conta
    for (const account of accountsToPublish) {
      try {
        console.log(`Publicando em ${account.platform} (${account.account_name})...`);
        let postId = null;

        if (account.platform === 'facebook') {
          postId = await publishToFacebook(content, account);
        } else if (account.platform === 'instagram') {
          postId = await publishToInstagram(content, account);
        }

        if (postId) {
          console.log(`Sucesso! Post ID: ${postId}`);
          results.push({
            platform: account.platform,
            account: account.account_name,
            postId,
            success: true,
          });
        }
      } catch (error: any) {
        console.error(`Erro ao publicar no ${account.platform}:`, error.message);
        
        // Notificar erro de publicação
        await notifyError(
          'publish-to-social',
          error,
          {
            content_id: contentId,
            platform: account.platform,
            account: account.account_name,
            content_type: content.type
          }
        );
        
        errors.push({
          platform: account.platform,
          account: account.account_name,
          error: error.message,
        });
      }
    }

    console.log('Resultados:', results.length, 'Erros:', errors.length);

    // 4. Atualizar status do conteúdo
    const hasSuccess = results.length > 0;
    const allSucceeded = (accountsToPublish?.length ?? 0) > 0 && results.length === accountsToPublish.length;
    
    console.log('Atualizando status do conteúdo...');
    const { error: updateError } = await supabaseClient
      .from('contents')
      .update({
        published_at: allSucceeded ? new Date().toISOString() : null,
        publish_error: errors.length > 0 ? JSON.stringify(errors) : null,
      })
      .eq('id', contentId);

    if (updateError) {
      console.error('Erro ao atualizar conteúdo:', updateError);
    }

    console.log('=== Publicação concluída ===');

    return new Response(
      JSON.stringify({ 
        success: hasSuccess,
        results,
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('=== Erro geral na publicação ===');
    console.error('Tipo:', error.constructor.name);
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    
    // Notificar erro crítico
    await notifyError(
      'publish-to-social',
      error,
      {
        content_id: contentId,
        error_type: error.constructor.name
      }
    );
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Erro desconhecido ao publicar'
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
        params.file_url = media.src_url;
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

async function sleep(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }

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

  if (contentType === 'story') {
    throw new Error('Publicação de Stories no Instagram não é suportada pela API');
  }

  // Reels
  else if (contentType === 'reels') {
    containerParams.media_type = 'REELS';
    containerParams.video_url = media.src_url;
    // Suporta thumbnail customizada
    if (media.thumb_url) {
      containerParams.cover_url = media.thumb_url;
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
      // Thumbnail personalizada para vídeos
      if (media.thumb_url) {
        containerParams.cover_url = media.thumb_url;
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

  // Aguardar processamento do container (especialmente para vídeos/Reels)
  let statusCode = 'IN_PROGRESS';
  for (let i = 0; i < 20; i++) {
    const statusResp = await fetch(`https://graph.facebook.com/v18.0/${creationId}?fields=status_code&access_token=${encodeURIComponent(account.access_token)}`);
    const statusJson = await statusResp.json();
    if (statusJson.error) {
      throw new Error(statusJson.error.message || 'Erro ao verificar status da mídia');
    }
    statusCode = statusJson.status_code;
    if (statusCode === 'FINISHED') break;
    if (statusCode === 'ERROR') {
      throw new Error('Falha no processamento do vídeo no Instagram');
    }
    await sleep(3000);
  }

  if (statusCode !== 'FINISHED') {
    throw new Error('Tempo esgotado ao processar a mídia no Instagram');
  }

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
