import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Calendar, FileImage, MessageSquare, Download } from "lucide-react";

interface CreativeRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: any;
}

export function CreativeRequestDialog({ open, onOpenChange, request }: CreativeRequestDialogProps) {
  if (!request?.payload) return null;

  const { title, type, text, caption, observations, reference_files } = request.payload;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-primary" />
            Solicitação de Criativo
          </DialogTitle>
          <DialogDescription>
            Detalhes da solicitação enviada pelo cliente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Título</label>
            <p className="text-sm text-muted-foreground glass p-3 rounded-lg">{title}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <FileImage className="h-4 w-4" />
              Tipo
            </label>
            <Badge variant="outline" className="text-sm">
              {type}
            </Badge>
          </div>

          {text && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Texto na arte</label>
              <p className="text-sm text-muted-foreground glass p-3 rounded-lg whitespace-pre-wrap">{text}</p>
            </div>
          )}

          {caption && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Informações para a legenda
              </label>
              <p className="text-sm text-muted-foreground glass p-3 rounded-lg whitespace-pre-wrap">{caption}</p>
            </div>
          )}

          {observations && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Outras observações</label>
              <p className="text-sm text-muted-foreground glass p-3 rounded-lg whitespace-pre-wrap">{observations}</p>
            </div>
          )}

          {reference_files && reference_files.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Download className="h-4 w-4" />
                Arquivos de referência
              </label>
              <div className="grid grid-cols-2 gap-3">
                {reference_files.map((url: string, index: number) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass p-3 rounded-lg hover:bg-accent/10 transition-colors"
                  >
                    <img
                      src={url}
                      alt={`Referência ${index + 1}`}
                      className="w-full h-32 object-cover rounded-md mb-2"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Arquivo {index + 1}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 pt-4 border-t border-border/50">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data da solicitação
            </label>
            <p className="text-sm text-muted-foreground">
              {new Date(request.created_at).toLocaleDateString('pt-BR')} às {new Date(request.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
