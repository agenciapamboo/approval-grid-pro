import { useState, useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, CheckCircle2, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { createNotification } from "@/lib/notifications";
import { ContentMedia } from "./ContentMedia";
import { ContentCaption } from "./ContentCaption";

interface Content {
  id: string;
  title: string;
  date: string;
  status: string;
  media_path?: string | null;
  caption?: string | null;
  created_at: string;
  type: string;
  channels?: string[];
  client_id: string;
}

interface StoriesViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategory: 'pending' | 'approved' | 'published';
  contents: Content[];
  onUpdate: () => void;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
};

export function StoriesViewer({
  open,
  onOpenChange,
  initialCategory,
  contents,
  onUpdate
}: StoriesViewerProps) {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isPaused, setIsPaused] = useState(false);

  const categories: ('pending' | 'approved' | 'published')[] = ['pending', 'approved', 'published'];

  const getStoriesByCategory = (category: 'pending' | 'approved' | 'published') => {
    switch(category) {
      case 'pending':
        return contents.filter(c => c.status === 'draft' || c.status === 'in_review');
      case 'approved':
        return contents.filter(c => c.status === 'approved');
      case 'published':
        return contents.filter(c => c.status === 'published');
      default:
        return [];
    }
  };

  const currentStories = getStoriesByCategory(activeCategory);
  const currentStory = currentStories[currentIndex];

  const switchCategory = (dir: 'next' | 'prev') => {
    const currentIdx = categories.indexOf(activeCategory);
    
    if (dir === 'next' && currentIdx < categories.length - 1) {
      setActiveCategory(categories[currentIdx + 1]);
      setCurrentIndex(0);
      setDirection(1);
    } else if (dir === 'prev' && currentIdx > 0) {
      setActiveCategory(categories[currentIdx - 1]);
      setCurrentIndex(0);
      setDirection(-1);
    } else {
      onOpenChange(false);
    }
  };

  const goNext = () => {
    if (currentIndex < currentStories.length - 1) {
      setDirection(1);
      setCurrentIndex(prev => prev + 1);
    } else {
      switchCategory('next');
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(prev => prev - 1);
    } else {
      switchCategory('prev');
    }
  };

  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const swipeThreshold = 50;
    
    if (Math.abs(info.offset.x) > Math.abs(info.offset.y)) {
      if (info.offset.x > swipeThreshold) {
        switchCategory('prev');
      } else if (info.offset.x < -swipeThreshold) {
        switchCategory('next');
      }
    }
    
    if (info.offset.y > swipeThreshold) {
      onOpenChange(false);
    }
  };

  const handleApprove = async () => {
    if (!currentStory) return;
    
    try {
      const { error } = await supabase
        .from('contents')
        .update({ status: 'approved' })
        .eq('id', currentStory.id);
      
      if (error) throw error;
      
      await createNotification('content.approved', currentStory.id, {
        title: currentStory.title,
      });
      
      toast({
        title: "Aprovado!",
        description: "Story aprovado com sucesso",
      });
      
      onUpdate();
      goNext();
      
    } catch (error) {
      console.error('Erro ao aprovar:', error);
      toast({
        title: "Erro",
        description: "Falha ao aprovar story",
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    if (!currentStory || !rejectReason.trim()) return;
    
    try {
      const { error } = await supabase
        .from('contents')
        .update({ status: 'changes_requested' })
        .eq('id', currentStory.id);
      
      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('comments').insert({
        content_id: currentStory.id,
        body: `Reprovado: ${rejectReason}`,
        is_adjustment_request: true,
        author_user_id: user?.id,
        version: 1,
      });
      
      await createNotification('content.rejected', currentStory.id, {
        title: currentStory.title,
        comment: rejectReason,
      });
      
      toast({
        title: "Reprovado",
        description: "Story reprovado, ajustes solicitados",
      });
      
      setShowRejectDialog(false);
      setRejectReason("");
      onUpdate();
      goNext();
      
    } catch (error) {
      console.error('Erro ao reprovar:', error);
      toast({
        title: "Erro",
        description: "Falha ao reprovar story",
        variant: "destructive",
      });
    }
  };

  // Auto-avanço
  useEffect(() => {
    if (!open || isPaused || !currentStory) return;
    
    const timer = setTimeout(() => {
      goNext();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [currentIndex, open, isPaused, activeCategory]);

  // Reset ao trocar categoria
  useEffect(() => {
    setCurrentIndex(0);
  }, [activeCategory]);

  const categoryConfig = {
    pending: { label: 'Pendentes', gradient: 'from-orange-400 to-orange-600' },
    approved: { label: 'Aprovados', gradient: 'from-green-400 to-green-600' },
    published: { label: 'Publicados', gradient: 'from-blue-400 to-blue-600' },
  };

  const isPendingStatus = currentStory?.status === 'draft' || currentStory?.status === 'in_review';

  if (!currentStory) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full h-full p-0 gap-0 bg-black border-0 rounded-none">
        {/* Barras de Progresso */}
        <div className="absolute top-0 left-0 right-0 z-50 flex gap-1 p-4">
          {currentStories.map((_, idx) => (
            <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white"
                initial={{ width: idx < currentIndex ? '100%' : '0%' }}
                animate={{ 
                  width: idx === currentIndex ? '100%' : idx < currentIndex ? '100%' : '0%' 
                }}
                transition={{ 
                  duration: idx === currentIndex && !isPaused ? 5 : 0,
                  ease: "linear" 
                }}
              />
            </div>
          ))}
        </div>

        {/* Indicador de Categoria */}
        <div className="absolute top-16 left-4 z-50">
          <div className={`px-3 py-1.5 rounded-full bg-gradient-to-r ${categoryConfig[activeCategory].gradient} text-white text-sm font-medium shadow-lg`}>
            {categoryConfig[activeCategory].label}
          </div>
        </div>

        {/* Botão Fechar */}
        <DialogClose className="absolute top-4 right-4 z-50 text-white opacity-90 hover:opacity-100 bg-black/30 rounded-full p-2">
          <X className="h-5 w-5" />
        </DialogClose>

        {/* Conteúdo com Animação */}
        <div className="relative w-full h-full overflow-hidden">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={currentStory.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDragEnd={handleDragEnd}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black p-4"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              {/* Conteúdo do Story */}
              <div className="w-full max-w-md flex flex-col gap-4">
                {currentStory.media_path && (
                  <div className="relative w-full aspect-[9/16] rounded-lg overflow-hidden">
                    <img 
                      src={currentStory.media_path}
                      alt={currentStory.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                
                {currentStory.caption && (
                  <div className="bg-black/50 p-4 rounded-lg">
                    <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                      {currentStory.caption}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Áreas de Tap para Navegação */}
          <div 
            className="absolute left-0 top-0 bottom-0 w-1/3 z-40 cursor-pointer"
            onClick={goPrev}
          />
          <div 
            className="absolute right-0 top-0 bottom-0 w-1/3 z-40 cursor-pointer"
            onClick={goNext}
          />
        </div>

        {/* Botões de Aprovação (apenas para pendentes) */}
        {isPendingStatus && (
          <div className="absolute bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black/80 via-black/50 to-transparent pb-8">
            <div className="flex gap-3 max-w-md mx-auto">
              <Button
                size="lg"
                variant="destructive"
                onClick={() => setShowRejectDialog(true)}
                className="flex-1"
              >
                <XCircle className="mr-2 h-5 w-5" />
                Reprovar
              </Button>
              
              <Button
                size="lg"
                onClick={handleApprove}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Aprovar
              </Button>
            </div>
          </div>
        )}

        {/* Dialog de Rejeição */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent className="sm:max-w-md">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Motivo da Reprovação</h3>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Descreva o motivo da reprovação..."
                className="min-h-24"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                  Cancelar
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleReject}
                  disabled={!rejectReason.trim()}
                >
                  Confirmar Reprovação
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
