import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Media {
  id: string;
  src_url: string;
  thumb_url?: string | null;
  kind: string;
  order_index: number;
}

interface ContentMediaProps {
  contentId: string;
  type: string;
  approvalToken?: string;
  mediaPath?: string | null;
}

const STORAGE_PREFIX = 'content-media/';

const isExternalUrl = (value?: string | null) => {
  if (!value) return false;
  return /^https?:\/\//i.test(value);
};

const normalizeStoragePath = (value?: string | null) => {
  if (!value) return null;
  let trimmed = value.trim();
  if (!trimmed) return null;

  if (isExternalUrl(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith(STORAGE_PREFIX)) {
    trimmed = trimmed.slice(STORAGE_PREFIX.length);
  }

  while (trimmed.startsWith('/')) {
    trimmed = trimmed.slice(1);
  }

  return trimmed;
};

// Hook para buscar signed URL via edge function
function useSignedUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const normalizedPath = normalizeStoragePath(path);

    if (!normalizedPath) {
      setUrl(null);
      setLoading(false);
      return;
    }

    if (isExternalUrl(normalizedPath)) {
      setUrl(normalizedPath);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchSignedUrl = async () => {
      try {
        // Primeiro tenta via rota de API (se existir no ambiente)
        try {
          const response = await fetch('/api/media-url', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ path: normalizedPath })
          });

          if (response.ok) {
            const result = await response.json();
            if (result?.url && isMounted) {
              setUrl(result.url);
              return;
            }
          }
        } catch (error) {
          console.warn('Falha ao buscar signed URL via rota /api/media-url:', error);
        }

        const { data, error } = await supabase.functions.invoke('get-media-url', {
          body: { path: normalizedPath }
        });

        if (error) {
          console.error('Erro ao buscar signed URL:', error);
          if (isMounted) setUrl(null);
          return;
        }

        const signedUrl = data?.url || data?.signedUrl;
        if (signedUrl && isMounted) {
          setUrl(signedUrl);
        } else if (isMounted) {
          setUrl(null);
        }
      } catch (err) {
        console.error('Erro na requisição:', err);
        if (isMounted) setUrl(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSignedUrl();

    return () => {
      isMounted = false;
    };
  }, [path]);

  return { url, loading };
}

export function ContentMedia({ contentId, type, approvalToken, mediaPath }: ContentMediaProps) {
  const [media, setMedia] = useState<Media[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    const normalizedPath = normalizeStoragePath(mediaPath);

    if (normalizedPath) {
      setMedia([
        {
          id: `${contentId}-primary`,
          kind: type === "video" ? "video" : "image",
          order_index: 0,
          src_url: normalizedPath,
          thumb_url: null
        }
      ]);
      setLoading(false);
      return;
    }

    loadMedia();
  }, [contentId, approvalToken, mediaPath]);

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
        const { data, error } = await supabase.functions.invoke('approval-media-urls', {
          body: { token: approvalToken, contentId }
        });

        if (error) {
          console.error('Erro ao carregar mídias via token:', error);
          setMedia([]);
        } else {
          const mappedMedia = (data?.media || []).map((m: any) => ({
            id: m.id,
            kind: m.kind,
            order_index: m.order_index,
            src_url: normalizeStoragePath(m.srcUrl) || '',
            thumb_url: normalizeStoragePath(m.thumbUrl)
          })).filter((item) => !!item.src_url) as Media[];
          setMedia(mappedMedia);
        }
      } else {
        const { data, error } = await supabase
          .from("content_media")
          .select("*")
          .eq("content_id", contentId)
          .order("order_index");

        if (error) {
          console.error("Erro ao carregar mídias:", error);
          setMedia([]);
        } else {
          const sanitizedMedia = (data || [])
            .map((item) => ({
              ...item,
              src_url: normalizeStoragePath(item.src_url) || '',
              thumb_url: normalizeStoragePath(item.thumb_url)
            }))
            .filter((item) => !!item.src_url) as Media[];
          setMedia(sanitizedMedia);
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
      <div className="w-full h-64 flex items-center justify-center bg-muted rounded-md">
        <p className="text-sm text-muted-foreground">Sem mídia</p>
      </div>
    );
  }

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

    if (isLeftSwipe && currentIndex < media.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < media.length - 1 ? prev + 1 : prev));
  };

  const displayUrl = thumbUrl || srcUrl;

  return (
    <>
      <div 
        className="relative w-full"
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

          {type === "carousel" && media.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                onClick={goToPrevious}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                onClick={goToNext}
                disabled={currentIndex === media.length - 1}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>

              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 bg-background/80 rounded-full px-2 py-1">
                {media.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentIndex ? "bg-primary" : "bg-muted-foreground/50"
                    }`}
                    aria-label={`Ir para mídia ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}

          {currentMedia.kind === "image" && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-background/80 hover:bg-background"
              onClick={() => setShowModal(true)}
            >
              <Maximize2 className="h-5 w-5" />
            </Button>
          )}
        </div>

        {type === "carousel" && media.length > 1 && (
          <p className="text-center text-sm text-muted-foreground mt-2">
            {currentIndex + 1} / {media.length}
          </p>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-screen-lg w-full h-[90vh] p-0">
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 bg-background/80 hover:bg-background"
              onClick={() => setShowModal(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            {srcUrl && (
              <img
                src={srcUrl}
                alt={`Mídia ${currentIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />
            )}

            {media.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                  onClick={goToPrevious}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                  onClick={goToNext}
                  disabled={currentIndex === media.length - 1}
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
