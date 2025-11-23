import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Copy, Loader2 } from "lucide-react";
import { useImageAnalysis } from "@/hooks/useImageAnalysis";
import { toast } from "sonner";

interface MediaAccessibilityProps {
  clientId: string;
  imageUrl: string;
  onDescriptionSelect?: (description: string) => void;
  onHashtagsSelect?: (hashtags: string[]) => void;
}

export function MediaAccessibility({ 
  clientId, 
  imageUrl,
  onDescriptionSelect,
  onHashtagsSelect
}: MediaAccessibilityProps) {
  const { description, hashtags, loading, fromCache, analyzeImage, clearAnalysis } = 
    useImageAnalysis({ clientId, imageUrl });

  const handleCopyDescription = () => {
    navigator.clipboard.writeText(description);
    toast.success("Descrição copiada");
  };

  const handleCopyHashtag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    toast.success(`${tag} copiado`);
  };

  const handleCopyAllHashtags = () => {
    const allTags = hashtags.join(' ');
    navigator.clipboard.writeText(allTags);
    toast.success("Todas as hashtags copiadas");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-green-500 rounded p-1.5">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-medium">Análise de Imagem IA</h3>
        </div>
        
        {(description || hashtags.length > 0) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAnalysis}
          >
            Limpar
          </Button>
        )}
      </div>

      {!description && !hashtags.length ? (
        <Button
          onClick={analyzeImage}
          disabled={loading}
          variant="outline"
          className="w-full border-green-500/20 hover:bg-green-500/10"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analisando imagem...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar #pracegover e Hashtags
            </>
          )}
        </Button>
      ) : (
        <div className="space-y-3">
          {fromCache && (
            <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
              Cache • Não contabilizado
            </Badge>
          )}

          {/* Descrição #pracegover */}
          {description && (
            <Card className="p-3 space-y-2 hover:border-green-500/30 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">#pracegover</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyDescription}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {description}
              </p>
              {onDescriptionSelect && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDescriptionSelect(description)}
                  className="w-full"
                >
                  Usar como descrição
                </Button>
              )}
            </Card>
          )}

          {/* Hashtags */}
          {hashtags.length > 0 && (
            <Card className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Hashtags ({hashtags.length})
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyAllHashtags}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar todas
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {hashtags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="cursor-pointer hover:bg-green-500/10 transition-colors"
                    onClick={() => handleCopyHashtag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
              {onHashtagsSelect && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onHashtagsSelect(hashtags)}
                  className="w-full"
                >
                  Adicionar todas ao conteúdo
                </Button>
              )}
            </Card>
          )}

          <Button
            onClick={analyzeImage}
            disabled={loading}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando nova análise...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar Nova Análise
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
