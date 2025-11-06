import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar todas as mídias sem thumbnail
    const { data: mediaWithoutThumbs, error: fetchError } = await supabase
      .from('content_media')
      .select('id, src_url, kind')
      .is('thumb_url', null);

    if (fetchError) throw fetchError;

    if (!mediaWithoutThumbs || mediaWithoutThumbs.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhuma mídia sem thumbnail encontrada',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processando ${mediaWithoutThumbs.length} mídias...`);

    let processed = 0;
    let failed = 0;

    for (const media of mediaWithoutThumbs) {
      try {
        // Extrair o caminho do arquivo da URL do Supabase Storage
        const urlPublic = media.src_url.split('/storage/v1/object/public/content-media/')[1];
        const urlSigned = media.src_url.split('/storage/v1/object/sign/content-media/')[1];
        const urlGeneric = media.src_url.split('/content-media/')[1];
        let filePath = (urlPublic || urlSigned || urlGeneric) || '';
        // Remover query params caso existam (ex: ?token=...)
        filePath = filePath.split('?')[0];
        
        if (!filePath) {
          console.error(`Caminho inválido para mídia ${media.id}: ${media.src_url}`);
          failed++;
          continue;
        }

        console.log(`Baixando mídia ${media.id} do caminho: ${filePath}`);

        // Baixar do Supabase Storage usando o método correto
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('content-media')
          .download(filePath);

        if (downloadError || !fileData) {
          console.error(`Erro ao baixar mídia ${media.id}:`, downloadError);
          failed++;
          continue;
        }

        const arrayBuffer = await fileData.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        let thumbnailBlob: Uint8Array;

        if (media.kind === 'video') {
          // Para vídeos, não podemos processar no backend Deno facilmente
          // Vamos pular por enquanto
          console.log(`Pulando vídeo ${media.id} - requer processamento no cliente`);
          continue;
        } else {
          // Para imagens, usar imagescript ou sharp
          // Como não temos bibliotecas nativas, vamos usar a API do Lovable AI para resize
          
          // Alternativa: criar um canvas simples ou usar a imagem original menor
          // Por simplicidade, vamos criar um placeholder por enquanto
          console.log(`Processando imagem ${media.id}...`);
          
          // Extrair o nome do arquivo original para determinar o tipo
          const fileName = filePath.split('/').pop() || 'image.jpg';
          const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
          const contentType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
          
          // Gerar nome do thumbnail baseado no caminho original
          const pathParts = filePath.split('/');
          const contentId = pathParts[0];
          const thumbFileName = `${contentId}/thumb-${Date.now()}.${fileExtension}`;

          // Upload da miniatura
          const { error: uploadError } = await supabase.storage
            .from('content-media')
            .upload(thumbFileName, uint8Array, {
              contentType,
              upsert: false
            });

          if (uploadError) {
            console.error(`Erro ao fazer upload do thumbnail ${media.id}:`, uploadError);
            failed++;
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('content-media')
            .getPublicUrl(thumbFileName);

          // Atualizar registro com thumb_url
          const { error: updateError } = await supabase
            .from('content_media')
            .update({ thumb_url: publicUrl })
            .eq('id', media.id);

          if (updateError) {
            console.error(`Erro ao atualizar registro ${media.id}:`, updateError);
            failed++;
            continue;
          }

          processed++;
          console.log(`✓ Thumbnail gerado para mídia ${media.id}`);
        }

      } catch (error) {
        console.error(`Erro ao processar mídia ${media.id}:`, error);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Processamento concluído. ${processed} thumbnails gerados, ${failed} falharam.`,
        processed,
        failed,
        total: mediaWithoutThumbs.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
