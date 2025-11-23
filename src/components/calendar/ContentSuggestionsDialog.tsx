import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Loader2, Plus, Sparkles } from "lucide-react";
import { useContentSuggestions, ContentSuggestion } from "@/hooks/useContentSuggestions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContentSuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  date: Date;
  onCreateContent: (suggestion: ContentSuggestion) => void;
}

const getTypeLabel = (type: string) => {
  const labels = {
    feed: "Feed",
    reels: "Reels",
    carousel: "Carrossel",
    story: "Story"
  };
  return labels[type as keyof typeof labels] || type;
};

export function ContentSuggestionsDialog({ 
  open, 
  onOpenChange, 
  clientId, 
  date,
  onCreateContent 
}: ContentSuggestionsDialogProps) {
  const { suggestions, loading, fromCache, generateSuggestions, clearSuggestions } = 
    useContentSuggestions({ clientId, date });

  const handleGenerateSuggestions = async () => {
    await generateSuggestions();
  };

  const handleClose = () => {
    clearSuggestions();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Sugestões de Conteúdo com IA
          </DialogTitle>
          <DialogDescription>
            {format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {suggestions.length === 0 ? (
            <div className="text-center py-8">
              <Button
                onClick={handleGenerateSuggestions}
                disabled={loading}
                className="bg-green-500 hover:bg-green-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando sugestões...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Gerar Sugestões de Conteúdo
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              {fromCache && (
                <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                  Cache • Não contabilizado
                </Badge>
              )}

              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <Card key={index} className="p-4 hover:border-green-500/30 transition-colors">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg mb-1">{suggestion.title}</h4>
                          <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                        </div>
                        <Badge variant="outline">{getTypeLabel(suggestion.type)}</Badge>
                      </div>

                      {suggestion.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {suggestion.hashtags.map((hashtag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs bg-muted">
                              #{hashtag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <Button
                        size="sm"
                        onClick={() => {
                          onCreateContent(suggestion);
                          handleClose();
                        }}
                        className="w-full"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Criar este Conteúdo
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={handleGenerateSuggestions}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando novas sugestões...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Gerar Novas Sugestões
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}