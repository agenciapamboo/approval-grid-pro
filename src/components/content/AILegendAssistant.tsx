import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Copy, Loader2 } from "lucide-react";
import { useAILegendAssistant } from "@/hooks/useAILegendAssistant";
import { toast } from "sonner";

interface AILegendAssistantProps {
  clientId: string;
  contentType: 'post' | 'reels' | 'stories';
  context?: {
    title?: string;
    category?: string;
    description?: string;
  };
  onSelectSuggestion: (suggestion: string) => void;
}

export function AILegendAssistant({ 
  clientId, 
  contentType, 
  context,
  onSelectSuggestion 
}: AILegendAssistantProps) {
  const { suggestions, loading, fromCache, generateSuggestions, clearSuggestions } = 
    useAILegendAssistant({ clientId, contentType, context });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para área de transferência");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-green-500 rounded p-1.5">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-medium">Assistente de IA</h3>
        </div>
        
        {suggestions.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSuggestions}
          >
            Limpar
          </Button>
        )}
      </div>

      {suggestions.length === 0 ? (
        <Button
          onClick={generateSuggestions}
          disabled={loading}
          variant="outline"
          className="w-full border-green-500/20 hover:bg-green-500/10"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando sugestões...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar {contentType === 'post' ? 'Legendas' : 'Roteiros'}
            </>
          )}
        </Button>
      ) : (
        <div className="space-y-2">
          {fromCache && (
            <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
              Cache • Não contabilizado
            </Badge>
          )}
          
          {suggestions.map((suggestion, index) => (
            <Card key={index} className="p-3 space-y-2 hover:border-green-500/30 transition-colors">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {suggestion}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSelectSuggestion(suggestion)}
                  className="flex-1"
                >
                  Usar esta
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCopy(suggestion)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
          
          <Button
            onClick={generateSuggestions}
            disabled={loading}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando novas...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar Novas Sugestões
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
