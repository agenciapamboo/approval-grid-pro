import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStorageUrl } from "@/hooks/useStorageUrl";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Media {
  id: string;
  src_url: string;
  thumb_url?: string;
  kind: string;
  order_index: number;
}

interface ContentMediaProps {
  contentId: string;
  type: string;
  approvalToken?: string;
}

// Hook auxiliar para uma mídia individual
function useMediaUrl(media: Media | undefined) {
  // Sempre chamar hooks na mesma ordem
  const srcFilePath = media?.src_url?.includes('/content-media/')
    ? media.src_url.split('/content-media/')[1]
    : media?.src_url;
  const thumbFilePath = media?.thumb_url?.includes('/content-media/')
    ? media.thumb_url.split('/content-media/')[1]
    : media?.thumb_url;

  const { url: srcUrl } = useStorageUrl({ bucket: 'content-media', filePath: srcFilePath });
  const { url: thumbUrl } = useStorageUrl({ bucket: 'content-media', filePath: thumbFilePath });

  // Se já é URL assinada (começa com http), usar diretamente
  if (media?.src_url?.startsWith('http://') || media?.src_url?.startsWith('https://')) {
    return {
      srcUrl: media.src_url,
      thumbUrl: media.thumb_url || media.src_url
    };
  }

  return { srcUrl, thumbUrl };
}

export function ContentMedia({ contentId, type, approvalToken }: ContentMediaProps) {
  const [media, setMedia] = useState<Media[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    loadMedia();
  }, [contentId, approvalToken]);

  // Proteger currentIndex quando media.length mudar
  useEffect(() => {
    if (media.length === 0) {
      setCurrentIndex(0);
    } else {
      setCurrentIndex((i) => Math.min(i, media.length - 1));
    }
  }, [media.length]);

  const loadMedia = async () => {
    setLoading(true);
    try {
      if (approvalToken) {
        // Usar edge function para obter URLs assinadas via token
        const { data, error } = await supabase.functions.invoke('approval-media-urls', {
          body: { token: approvalToken, contentId }
        });

        if (error) {
          console.error('Erro ao carregar mídias via token:', error);
          setMedia([]);
        } else {
          // Mapear para formato esperado (srcUrl -> src_url)
          setMedia((data?.media || []).map((m: any) => ({
            id: m.id,
            kind: m.kind,
            order_index: m.order_index,
            src_url: m.srcUrl,
            thumb_url: m.thumbUrl
          })));
        }
      } else {
        // Fluxo normal autenticado
        const { data, error } = await supabase
          .from("content_media")
          .select("*")
          .eq("content_id", contentId)
          .order("order_index");

        if (error) {
          console.error("Erro ao carregar mídias:", error);
          setMedia([]);
        } else {
          setMedia(data || []);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Calcular currentMedia de forma segura e chamar hook ANTES dos returns condicionais
  const currentMedia = media.length > 0 ? media[Math.min(currentIndex, media.length - 1)] : undefined;
  const { srcUrl, thumbUrl } = useMediaUrl(currentMedia);

  if (loading) {
    return (
      <div className="aspect-[4/5] bg-muted animate-pulse" />
    );
  }

  if (media.length === 0) {
    return (
      <div className="aspect-[4/5] bg-muted flex items-center justify-center text-muted-foreground">
        Sem mídia
      </div>
    );
  }

  // Distância mínima de swipe (em px)
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    // Apenas carrossel permite navegação (story não)
    if (isLeftSwipe && type === "carousel" && media.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % media.length);
    }
    if (isRightSwipe && type === "carousel" && media.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
    }
  };

  return (
    <>
      <div 
        className="relative aspect-[4/5] bg-muted overflow-hidden group"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Imagem ou vídeo */}
        <div className="w-full h-full">
          {currentMedia.kind === "video" ? (
            <video
              src={srcUrl || ''}
              poster={thumbUrl}
              controls
              className="w-full h-full object-cover"
            >
              <source src={srcUrl || ''} type="video/mp4" />
              <source src={srcUrl || ''} type="video/webm" />
              <source src={srcUrl || ''} type="video/quicktime" />
              Seu navegador não suporta vídeos.
            </video>
          ) : (
            <img
              src={thumbUrl || srcUrl || ''}
              alt={`Mídia ${currentIndex + 1}`}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setShowModal(true)}
              onError={(e) => {
                if (srcUrl) e.currentTarget.src = srcUrl;
              }}
            />
          )}
        </div>

        {/* Botão para expandir */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setShowModal(true)}
        >
          <Maximize2 className="h-5 w-5" />
        </Button>

        {/* Navegação apenas do carrossel (story não tem navegação) */}
        {type === "carousel" && media.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setCurrentIndex((prev) => (prev - 1 + media.length) % media.length)}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setCurrentIndex((prev) => (prev + 1) % media.length)}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>

            {/* Indicadores */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {media.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentIndex ? "bg-white w-4" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Contador */}
        {media.length > 1 && (
          <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {media.length}
          </div>
        )}
      </div>

      {/* Modal para visualização em tamanho maior */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-none w-auto p-0 bg-transparent border-0 shadow-none">
          <button
            onClick={() => setShowModal(false)}
            className="absolute -top-14 right-0 h-12 w-12 rounded-full border-2 border-white bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 hover:scale-110 transition-all z-50"
          >
            <X className="h-6 w-6" />
          </button>
          <div 
            className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {currentMedia.kind === "video" ? (
              <video
                src={srcUrl || ''}
                poster={thumbUrl}
                controls
                className="max-w-full max-h-[90vh] rounded-lg"
              >
                <source src={srcUrl || ''} type="video/mp4" />
                <source src={srcUrl || ''} type="video/webm" />
                <source src={srcUrl || ''} type="video/quicktime" />
                Seu navegador não suporta vídeos.
              </video>
            ) : (
              <img
                src={srcUrl || ''}
                alt={`Mídia ${currentIndex + 1}`}
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
            )}

            {/* Navegação no modal apenas para carrossel */}
            {type === "carousel" && media.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                  onClick={() => setCurrentIndex((prev) => (prev - 1 + media.length) % media.length)}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                  onClick={() => setCurrentIndex((prev) => (prev + 1) % media.length)}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
