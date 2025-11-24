import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CaptionContextDialog } from "./CaptionContextDialog";
import { useAILegendAssistant } from "@/hooks/useAILegendAssistant";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AIAssistantIconProps {
  clientId: string;
  contentType: 'post' | 'reels' | 'stories' | 'plan_description' | 'plan_caption';
  context?: {
    title?: string;
    category?: string;
    description?: string;
  };
  onInsert: (text: string) => void;
}

export function AIAssistantIcon({ 
  clientId, 
  contentType, 
  context, 
  onInsert 
}: AIAssistantIconProps) {
  const [showDialog, setShowDialog] = useState(false);
  const { suggestions, loading, generateSuggestions, clearSuggestions } = useAILegendAssistant({ 
    clientId, 
    contentType: contentType === 'plan_description' || contentType === 'plan_caption' ? 'post' : contentType,
    context 
  });

  const handleGenerate = async (captionContext: any) => {
    await generateSuggestions(captionContext);
    setShowDialog(false);
  };

  const handleInsert = (suggestion: string) => {
    onInsert(suggestion);
    clearSuggestions();
    toast.success("Texto inserido!");
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={() => setShowDialog(true)}
              className="inline-flex items-center justify-center w-8 h-8 rounded bg-green-500 hover:bg-green-600 transition-colors flex-shrink-0"
              type="button"
            >
              <Sparkles className="h-4 w-4 text-white" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Assistente de IA</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <CaptionContextDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        clientId={clientId}
        contentType={contentType === 'plan_description' || contentType === 'plan_caption' ? 'post' : contentType}
        initialTitle={context?.title}
        onGenerate={handleGenerate}
        loading={loading}
      />
      
      {/* Lista de sugestões com botão "Inserir" */}
      {suggestions.length > 0 && (
        <div className="space-y-2 mt-2">
          {suggestions.map((suggestion, i) => (
            <Card key={i} className="p-3 bg-green-50 border-green-200">
              <p className="text-sm whitespace-pre-wrap">{suggestion}</p>
              <Button
                size="sm"
                onClick={() => handleInsert(suggestion)}
                className="mt-2 bg-green-500 hover:bg-green-600"
              >
                Inserir
              </Button>
            </Card>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDialog(true)}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Gerando...
              </>
            ) : (
              "Gerar novamente"
            )}
          </Button>
        </div>
      )}
    </>
  );
}
