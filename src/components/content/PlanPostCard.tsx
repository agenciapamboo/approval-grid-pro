import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Edit, Trash2, Sparkles, Calendar, Hash, Image, Images } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CarouselSlide {
  order: number;
  text: string;
}

interface PlanPost {
  id?: string;
  title: string;
  date: string;
  type: 'feed' | 'reels' | 'story' | 'carousel';
  category: string;
  caption: string;
  hashtags: string[];
  media_suggestion: string;
  slides?: CarouselSlide[];
  slideCount?: number;
}

interface PlanPostCardProps {
  post: PlanPost;
  clientId: string;
  onUpdate: (updates: Partial<PlanPost>) => void;
  onDelete: () => void;
  onGenerateVariation: (clientId: string, caption: string, prompt: string) => Promise<string[]>;
}

export function PlanPostCard({
  post,
  clientId,
  onUpdate,
  onDelete,
  onGenerateVariation,
}: PlanPostCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPost, setEditedPost] = useState(post);
  const [showVariationDialog, setShowVariationDialog] = useState(false);
  const [variationPrompt, setVariationPrompt] = useState('');
  const [variations, setVariations] = useState<string[]>([]);
  const [loadingVariations, setLoadingVariations] = useState(false);

  // Atualizar editedPost quando post mudar
  useEffect(() => {
    setEditedPost(post);
  }, [post]);

  const typeLabels = {
    feed: 'Feed',
    reels: 'Reels',
    story: 'Story',
    carousel: 'Carrossel',
  };

  const handleSave = () => {
    onUpdate(editedPost);
    setIsEditing(false);
  };

  const handleGenerateVariations = async () => {
    if (!variationPrompt.trim()) return;
    
    setLoadingVariations(true);
    const newVariations = await onGenerateVariation(
      clientId,
      post.caption,
      variationPrompt
    );
    setVariations(newVariations);
    setLoadingVariations(false);
  };

  const handleSelectVariation = (variation: string) => {
    setEditedPost({ ...editedPost, caption: variation });
    onUpdate({ caption: variation });
    setShowVariationDialog(false);
    setVariations([]);
    setVariationPrompt('');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {isEditing ? (
              <Input
                value={editedPost.title}
                onChange={(e) => setEditedPost({ ...editedPost, title: e.target.value })}
                className="font-medium"
              />
            ) : (
              <CardTitle className="text-base">{post.title}</CardTitle>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {format(new Date(post.date), "dd 'de' MMMM", { locale: ptBR })}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {typeLabels[post.type]}
              </Badge>
              {post.category && (
                <Badge variant="outline" className="text-xs">
                  {post.category}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Dialog open={showVariationDialog} onOpenChange={setShowVariationDialog}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <Sparkles className="h-4 w-4 text-green-500" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Gerar Variações de Legenda</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Instrução Personalizada</label>
                    <Textarea
                      placeholder="Ex: Tornar mais informal e usar emojis..."
                      value={variationPrompt}
                      onChange={(e) => setVariationPrompt(e.target.value)}
                      rows={3}
                    />
                    <Button
                      onClick={handleGenerateVariations}
                      disabled={loadingVariations || !variationPrompt.trim()}
                      className="w-full"
                    >
                      {loadingVariations ? 'Gerando...' : 'Gerar Variações'}
                    </Button>
                  </div>

                  {variations.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Variações Geradas</label>
                      {variations.map((variation, index) => (
                        <Card key={index} className="p-3">
                          <p className="text-sm whitespace-pre-wrap">{variation}</p>
                          <Button
                            size="sm"
                            onClick={() => handleSelectVariation(variation)}
                            className="mt-2 w-full"
                          >
                            Usar Esta Legenda
                          </Button>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Legenda</label>
          {isEditing ? (
            <Textarea
              value={editedPost.caption}
              onChange={(e) => setEditedPost({ ...editedPost, caption: e.target.value })}
              rows={4}
              className="text-sm"
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap line-clamp-4">{post.caption}</p>
          )}
        </div>

        {post.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <Hash className="h-3 w-3 text-muted-foreground mt-0.5" />
            {post.hashtags.slice(0, 5).map((tag, index) => (
              <span key={index} className="text-xs text-muted-foreground">
                {tag}
                {index < Math.min(4, post.hashtags.length - 1) && ','}
              </span>
            ))}
            {post.hashtags.length > 5 && (
              <span className="text-xs text-muted-foreground">+{post.hashtags.length - 5}</span>
            )}
          </div>
        )}

        {post.media_suggestion && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Image className="h-3 w-3" />
              Sugestão de Mídia
            </label>
            <p className="text-xs text-muted-foreground">{post.media_suggestion}</p>
          </div>
        )}

        {/* Slides do Carrossel */}
        {post.type === 'carousel' && post.slides && post.slides.length > 0 && (
          <div className="space-y-2 border-t pt-3 mt-3">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Images className="h-3 w-3" />
              Slides do Carrossel ({post.slides.length} slides)
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {post.slides.map((slide, index) => (
                <div key={slide.order} className="bg-muted/50 rounded p-2 border">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Slide {slide.order + 1}
                    </span>
                  </div>
                  {isEditing ? (
                    <Textarea
                      value={slide.text}
                      onChange={(e) => {
                        const updatedSlides = [...(post.slides || [])];
                        updatedSlides[index] = { ...slide, text: e.target.value };
                        setEditedPost({ ...editedPost, slides: updatedSlides });
                      }}
                      rows={2}
                      className="text-xs"
                    />
                  ) : (
                    <p className="text-xs whitespace-pre-wrap">{slide.text}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
