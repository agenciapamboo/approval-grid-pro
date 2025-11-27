import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CaptionContextDialog } from "./CaptionContextDialog";
import { AISuggestionsDialog } from "./AISuggestionsDialog";
import { useAILegendAssistant } from "@/hooks/useAILegendAssistant";
import { toast } from "sonner";

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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { suggestions, loading, generateSuggestions, clearSuggestions } = useAILegendAssistant({ 
    clientId, 
    contentType: contentType === 'plan_description' || contentType === 'plan_caption' ? 'post' : contentType,
    context 
  });

  // Abrir dialog de sugestões automaticamente quando suggestions chegarem
  useEffect(() => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  }, [suggestions]);

  const handleGenerate = async (captionContext: any) => {
    await generateSuggestions(captionContext);
    setShowDialog(false);
  };

  const handleInsert = (suggestion: string) => {
    onInsert(suggestion);
    clearSuggestions();
    setShowSuggestions(false);
    toast.success("Legenda inserida com sucesso!");
  };

  const handleGenerateNew = () => {
    setShowSuggestions(false);
    clearSuggestions();
    setShowDialog(true);
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
      
      <AISuggestionsDialog
        open={showSuggestions}
        onOpenChange={setShowSuggestions}
        suggestions={suggestions}
        onInsert={handleInsert}
        onGenerateNew={handleGenerateNew}
        loading={loading}
      />
    </>
  );
}
