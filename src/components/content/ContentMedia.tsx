import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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

// Hook para buscar signed URL via edge function
function useSignedUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }

    // Se já é URL externa, usar diretamente
    if (path.startsWith('http://') || path.startsWith('https://')) {
      setUrl(path);
      return;
    }

    setLoading(true);
    
    // Chamar edge function via invoke (não fetch)
    supabase.functions
      .invoke('get-media-url', {
        body: { path },
      })
      .then(({ data, error }) => {
        if (error) {
          console.error('Erro ao buscar signed URL:', error);
          setUrl(null);
        } else if (data?.url) {
          setUrl(data.url);
        }
      })
      .catch((err) => {
        console.error('Erro na requisição:', err);
        setUrl(null);
      })
      .finally(() => setLoading(false));
  }, [path]);

  return { url, loading };
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
    console.log('🔍 ContentMedia: Loading media', { contentId, approvalToken });
    
    try {
      if (approvalToken) {
        console.log('🔐 Using approval token flow');
        const { data, error } = await supabase.functions.invoke('approval-media-urls', {
          body: { token: approvalToken, contentId }
        });

        console.log('📦 Edge function response:', { data, error });
        
        if (error) {
          console.error('❌ Erro ao carregar mídias via token:', error);
          setMedia([]);
        } else {
          const mappedMedia = (data?.media || []).map((m: any) => ({
            id: m.id,
            kind: m.kind,
            order_index: m.order_index,
            src_url: m.srcUrl,
            thumb_url: m.thumbUrl
          }));
          console.log('✅ Media loaded via token:', mappedMedia);
          setMedia(mappedMedia);
        }
      } else {
        console.log('🔓 Using authenticated flow');
        const { data, error } = await supabase
          .from("content_media")
          .select("*")
          .eq("content_id", contentId)
          .order("order_index");

        console.log('📦 Supabase response:', { data, error });

        if (error) {
          console.error("❌ Erro ao carregar mídias:", error);
          setMedia([]);
        } else {
          console.log('✅ Media loaded:', data);
          setMedia(data || []);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const currentMedia = media[currentIndex];
  const { url: srcUrl, loading: srcLoading } = useSignedUrl(currentMedia?.src_url);
  const { url: thumbUrl, loading: thumbLoading } = useSignedUrl(currentMedia?.thumb_url);

  if (loading || srcLoading || thumbLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-muted rounded-md">
        <p className="text-sm text-muted-foreground">Carregando mídia...</p>
      </div>
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
        <div className="relative overflow-hidden rounded-lg bg-muted">
          {displayUrl ? (
            currentMedia.kind === "video" ? (
              <video
                src={displayUrl}
                controls
                className="w-full h-auto max-h-96 object-contain"
              />
            ) : (
              <img
                src={displayUrl}
                alt={`Mídia ${currentIndex + 1}`}
                className="w-full h-auto max-h-96 object-contain cursor-pointer"
                onClick={() => setShowModal(true)}
              />
            )
          ) : (
            <div className="w-full h-64 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Erro ao carregar mídia</p>
            </div>
          )}

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
