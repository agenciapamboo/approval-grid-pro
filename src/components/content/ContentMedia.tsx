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
}

export function ContentMedia({ contentId, type }: ContentMediaProps) {
  const [media, setMedia] = useState<Media[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    loadMedia();
  }, [contentId]);

  const loadMedia = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("content_media")
      .select("*")
      .eq("content_id", contentId)
      .order("order_index");

    if (!error && data) {
      setMedia(data);
    }
    setLoading(false);
  };

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

  const currentMedia = media[currentIndex];

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
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Imagem ou vídeo */}
        <div className="w-full h-full">
          {currentMedia.kind === "video" ? (
            <video
              src={currentMedia.src_url}
              poster={currentMedia.thumb_url || undefined}
              controls
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={currentMedia.thumb_url || currentMedia.src_url}
              alt={`Mídia ${currentIndex + 1}`}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setShowModal(true)}
              onError={(e) => {
                // Fallback para imagem original se thumb falhar
                e.currentTarget.src = currentMedia.src_url;
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

            {/* Miniaturas */}
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {media.map((m, idx) => (
                <button
                  key={m.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                    idx === currentIndex ? "border-white" : "border-transparent opacity-60"
                  }`}
                >
                  <img
                    src={m.thumb_url || m.src_url}
                    alt={`Miniatura ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
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
                src={currentMedia.src_url}
                poster={currentMedia.thumb_url}
                controls
                className="max-w-full max-h-[90vh] rounded-lg"
              />
            ) : (
              <img
                src={currentMedia.src_url}
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
