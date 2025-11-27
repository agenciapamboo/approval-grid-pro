import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, Copy, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface AISuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: string[];
  onInsert: (suggestion: string) => void;
  onGenerateNew: () => void;
  loading?: boolean;
}

export function AISuggestionsDialog({
  open,
  onOpenChange,
  suggestions,
  onInsert,
  onGenerateNew,
  loading = false,
}: AISuggestionsDialogProps) {
  const handleInsert = (suggestion: string) => {
    onInsert(suggestion);
    onOpenChange(false);
  };

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      // Usando toast do sistema
      const event = new CustomEvent('toast', {
        detail: { message: `Sugestão ${index + 1} copiada!`, type: 'success' }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="bg-green-500 rounded p-1.5">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            Sugestões de Legenda Geradas pela IA
            <Badge variant="outline" className="ml-auto">
              {suggestions.length} {suggestions.length === 1 ? 'sugestão' : 'sugestões'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {suggestions.map((suggestion, index) => (
              <Card 
                key={index} 
                className="border border-green-200 hover:border-green-300 transition-all duration-200"
              >
                <CardContent className="p-4">
                  {/* Header do Card */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs">
                        {index + 1}
                      </div>
                      <span className="font-medium text-sm">Sugestão {index + 1}</span>
                    </div>
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      {suggestion.length} caracteres
                    </Badge>
                  </div>

                  <Separator className="mb-3" />

                  {/* Conteúdo da Legenda */}
                  <div className="bg-muted/30 rounded-lg p-3 mb-3">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {suggestion}
                    </p>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleInsert(suggestion)}
                      className="bg-green-500 hover:bg-green-600 flex-1"
                      size="sm"
                    >
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      Usar Esta Legenda
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleCopy(suggestion, index)}
                      size="sm"
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Copiar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        {/* Footer dentro do modal */}
        <DialogFooter className="flex gap-2 pt-4 border-t mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            size="sm"
          >
            <X className="mr-1.5 h-3.5 w-3.5" />
            Fechar
          </Button>
          <Button
            onClick={onGenerateNew}
            disabled={loading}
            variant="outline"
            size="sm"
            className="hover:bg-green-50 hover:text-green-700 hover:border-green-300"
          >
            {loading ? (
              <>
                <Sparkles className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Gerar Nova Sugestão
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

