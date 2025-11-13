import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCORS, errorResponse, successResponse } from "../_shared/cors.ts";

console.log("approval-media-urls function started");

serve(async (req) => {
  // Handle CORS
  const corsCheck = handleCORS(req);
  if (corsCheck) return corsCheck;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return errorResponse("Configuração do servidor incompleta", 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, contentId } = await req.json();

    if (!token || !contentId) {
      return errorResponse("Token e contentId são obrigatórios", 400);
    }

    console.log("[approval-media-urls] Validating token for contentId:", contentId);

    // Validar token via RPC
    const { data: tokenData, error: tokenError } = await supabase.rpc(
      "validate_approval_token",
      { p_token: token }
    );

    if (tokenError || !tokenData || tokenData.length === 0) {
      console.error("[approval-media-urls] Token validation failed:", tokenError);
      return errorResponse("Token inválido ou expirado", 401);
    }

    const { client_id, month } = tokenData[0];

    // Calcular intervalo do mês
    const monthStart = new Date(`${month}-01T00:00:00Z`);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setSeconds(monthEnd.getSeconds() - 1);

    console.log("[approval-media-urls] Checking content ownership:", {
      contentId,
      clientId: client_id,
      month,
    });

    // Verificar se o conteúdo pertence ao cliente do token
    const { data: content, error: contentError } = await supabase
      .from("contents")
      .select("id, client_id, status, date")
      .eq("id", contentId)
      .eq("client_id", client_id)
      .in("status", ["draft", "in_review"])
      .gte("date", monthStart.toISOString())
      .lte("date", monthEnd.toISOString())
      .single();

    if (contentError || !content) {
      console.error("[approval-media-urls] Content not found or unauthorized:", contentError);
      return errorResponse("Conteúdo não encontrado ou sem permissão", 403);
    }

    console.log("[approval-media-urls] Content verified, fetching media");

    // Buscar todas as mídias do conteúdo
    const { data: mediaData, error: mediaError } = await supabase
      .from("content_media")
      .select("id, src_url, thumb_url, kind, order_index")
      .eq("content_id", contentId)
      .order("order_index");

    if (mediaError) {
      console.error("[approval-media-urls] Error fetching media:", mediaError);
      return errorResponse("Erro ao buscar mídias", 500);
    }

    if (!mediaData || mediaData.length === 0) {
      console.log("[approval-media-urls] No media found for content");
      return successResponse({ media: [] });
    }

    console.log("[approval-media-urls] Generating signed URLs for", mediaData.length, "media items");

    // Gerar URLs assinadas para cada mídia
    const signedMedia = await Promise.all(
      mediaData.map(async (item) => {
        try {
          // Verificar se já é uma URL externa
          if (item.src_url.startsWith("http://") || item.src_url.startsWith("https://")) {
            return {
              id: item.id,
              kind: item.kind,
              order_index: item.order_index,
              srcUrl: item.src_url,
              thumbUrl: item.thumb_url || item.src_url,
            };
          }

          // Gerar URL assinada para src_url
          const { data: srcData, error: srcError } = await supabase.storage
            .from("content-media")
            .createSignedUrl(item.src_url, 3600); // 1 hora

          if (srcError) {
            console.error("[approval-media-urls] Error signing src_url:", srcError);
            throw srcError;
          }

          // Gerar URL assinada para thumb_url se existir
          let thumbUrl = srcData.signedUrl;
          if (item.thumb_url && item.thumb_url !== item.src_url) {
            const { data: thumbData, error: thumbError } = await supabase.storage
              .from("content-media")
              .createSignedUrl(item.thumb_url, 3600);

            if (!thumbError && thumbData) {
              thumbUrl = thumbData.signedUrl;
            }
          }

          return {
            id: item.id,
            kind: item.kind,
            order_index: item.order_index,
            srcUrl: srcData.signedUrl,
            thumbUrl: thumbUrl,
          };
        } catch (error) {
          console.error("[approval-media-urls] Error processing media item:", error);
          return null;
        }
      })
    );

    // Filtrar itens nulos (erros)
    const validMedia = signedMedia.filter((m) => m !== null);

    console.log("[approval-media-urls] Successfully signed", validMedia.length, "media items");

    return successResponse({ media: validMedia });
  } catch (error: any) {
    console.error("[approval-media-urls] Unexpected error:", error);
    return errorResponse(error.message || "Erro interno do servidor", 500);
  }
});
