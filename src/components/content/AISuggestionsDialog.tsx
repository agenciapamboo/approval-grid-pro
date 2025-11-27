import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, Copy } from "lucide-react";
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
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="bg-green-500 rounded p-1.5">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            Sugestões de Legenda Geradas pela IA
            <Badge variant="secondary" className="ml-auto">
              {suggestions.length} sugestões
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(85vh-120px)] pr-4">
          <div className="space-y-4">
            {suggestions.map((suggestion, index) => (
              <Card 
                key={index} 
                className="border-2 border-green-100 hover:border-green-300 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <CardContent className="p-6">
                  {/* Header do Card */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <span className="font-semibold text-lg">Sugestão {index + 1}</span>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                      {suggestion.length} caracteres
                    </Badge>
                  </div>

                  <Separator className="mb-4" />

                  {/* Conteúdo da Legenda */}
                  <div className="bg-muted/30 rounded-lg p-4 mb-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap font-normal">
                      {suggestion}
                    </p>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={() => handleInsert(suggestion)}
                      className="bg-green-500 hover:bg-green-600 flex-1 min-w-[180px]"
                      size="lg"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Usar Esta Legenda
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleCopy(suggestion, index)}
                      size="lg"
                      className="hover:bg-muted"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        {/* Footer com Botão de Gerar Novamente */}
        <div className="flex gap-2 justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            size="lg"
          >
            Fechar
          </Button>
          <Button
            onClick={onGenerateNew}
            disabled={loading}
            variant="outline"
            size="lg"
            className="hover:bg-green-50 hover:text-green-700 hover:border-green-300"
          >
            {loading ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar Novas Sugestões
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

