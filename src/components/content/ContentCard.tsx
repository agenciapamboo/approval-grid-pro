import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ContentMedia } from "./ContentMedia";
import { ContentCaption } from "./ContentCaption";
import { ContentComments } from "./ContentComments";
import { RequestAdjustmentDialog } from "./RequestAdjustmentDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ContentCardProps {
  content: {
    id: string;
    title: string;
    date: string;
    deadline?: string;
    type: string;
    status: string;
    version: number;
  };
  isResponsible: boolean;
  onUpdate: () => void;
}

export function ContentCard({ content, isResponsible, onUpdate }: ContentCardProps) {
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      draft: { variant: "secondary", label: "Rascunho" },
      in_review: { variant: "default", label: "Em Revisão" },
      changes_requested: { variant: "destructive", label: "Ajustes Solicitados" },
      approved: { variant: "outline", label: "Aprovado" },
    };
    
    const config = variants[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      image: "Imagem",
      carousel: "Carrossel",
      reels: "Reels",
    };
    return labels[type] || type;
  };

  const handleApprove = async () => {
    if (!isResponsible) {
      toast({
        title: "Ação não permitida",
        description: "Apenas o responsável do cliente pode aprovar conteúdos",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("contents")
        .update({ status: "approved" })
        .eq("id", content.id);

      if (error) throw error;

      toast({
        title: "Conteúdo aprovado",
        description: "O conteúdo foi aprovado com sucesso",
      });

      onUpdate();
    } catch (error) {
      console.error("Erro ao aprovar:", error);
      toast({
        title: "Erro",
        description: "Erro ao aprovar o conteúdo",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardContent className="p-0">
          {/* Linha 1: Data e Tipo */}
          <div className="p-4 border-b bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">
                  {format(new Date(content.date), "dd/MM/yyyy", { locale: ptBR })}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{getTypeLabel(content.type)}</span>
              </div>
              {getStatusBadge(content.status)}
            </div>
            {content.deadline && (
              <div className="text-xs text-muted-foreground mt-1">
                Prazo: {format(new Date(content.deadline), "dd/MM/yyyy", { locale: ptBR })}
              </div>
            )}
          </div>

          {/* Linha 2: Criativo */}
          <ContentMedia contentId={content.id} type={content.type} />

          {/* Linha 3: Legenda */}
          <ContentCaption contentId={content.id} version={content.version} />

          {/* Ações */}
          <div className="p-4 border-t flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowComments(!showComments)}
              className="flex-1"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Comentários
            </Button>
            
            {content.status !== "approved" && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAdjustment(true)}
                  className="flex-1"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Solicitar Ajuste
                </Button>
                
                {isResponsible && (
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={handleApprove}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aprovar
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Comentários expandidos */}
          {showComments && (
            <div className="border-t">
              <ContentComments contentId={content.id} onUpdate={onUpdate} />
            </div>
          )}
        </CardContent>
      </Card>

      <RequestAdjustmentDialog
        open={showAdjustment}
        onOpenChange={setShowAdjustment}
        contentId={content.id}
        onSuccess={onUpdate}
      />
    </>
  );
}
