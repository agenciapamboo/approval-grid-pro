import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, FileText, Image as ImageIcon, MessageSquare } from "lucide-react";

interface CreativeRequest {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientWhatsapp?: string;
  title: string;
  type: string;
  text?: string;
  caption?: string;
  observations?: string;
  referenceFiles?: string[];
  createdAt: string;
  status?: string;
}

interface AdjustmentRequest {
  id: string;
  contentTitle: string;
  clientName: string;
  reason: string;
  details: string;
  createdAt: string;
  version: number;
}

interface RequestDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: {
    type: 'creative_request' | 'adjustment_request';
    data: CreativeRequest | AdjustmentRequest;
  } | null;
}

export function RequestDetailsDialog({ open, onOpenChange, request }: RequestDetailsDialogProps) {
  if (!request) return null;

  const renderCreativeRequest = (data: CreativeRequest) => {
    const statusVariants: Record<string, { variant: "default" | "pending" | "destructive" | "success" | "warning", label: string }> = {
      pending: { variant: "warning", label: "Pendente" },
      reviewing: { variant: "pending", label: "Em Revisão" },
      in_production: { variant: "default", label: "Em Produção" },
      completed: { variant: "success", label: "Finalizado" },
    };
    const statusConfig = statusVariants[data.status || "pending"] || statusVariants.pending;

    return (
      <ScrollArea className="max-h-[60vh]">
        <div className="space-y-4 pr-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Solicitação de Criativo</h3>
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Cliente
            </h4>
            <p className="text-sm">{data.clientName}</p>
            {data.clientEmail && <p className="text-sm text-muted-foreground">{data.clientEmail}</p>}
            {data.clientWhatsapp && <p className="text-sm text-muted-foreground">{data.clientWhatsapp}</p>}
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold text-sm mb-2">Título</h4>
            <p className="text-sm">{data.title}</p>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Tipo</h4>
            <p className="text-sm">{data.type}</p>
          </div>

          {data.text && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Texto
              </h4>
              <p className="text-sm whitespace-pre-wrap">{data.text}</p>
            </div>
          )}

          {data.caption && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Legenda</h4>
              <p className="text-sm whitespace-pre-wrap">{data.caption}</p>
            </div>
          )}

          {data.observations && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Observações</h4>
              <p className="text-sm whitespace-pre-wrap">{data.observations}</p>
            </div>
          )}

          {data.referenceFiles && data.referenceFiles.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Arquivos de Referência ({data.referenceFiles.length})
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {data.referenceFiles.map((file, index) => (
                  <div key={index} className="border rounded-lg p-2 bg-muted/50">
                    {file.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img src={file} alt={`Referência ${index + 1}`} className="w-full h-32 object-cover rounded" />
                    ) : (
                      <a href={file} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Ver arquivo {index + 1}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data da Solicitação
            </h4>
            <p className="text-sm">{format(new Date(data.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </div>
        </div>
      </ScrollArea>
    );
  };

  const renderAdjustmentRequest = (data: AdjustmentRequest) => {
    return (
      <ScrollArea className="max-h-[60vh]">
        <div className="space-y-4 pr-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Solicitação de Ajuste</h3>
            <Badge variant="destructive">Ajuste Necessário</Badge>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Cliente
            </h4>
            <p className="text-sm">{data.clientName}</p>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold text-sm mb-2">Conteúdo</h4>
            <p className="text-sm">{data.contentTitle}</p>
            <p className="text-xs text-muted-foreground mt-1">Versão: {data.version}</p>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Motivo do Ajuste</h4>
            <p className="text-sm whitespace-pre-wrap">{data.reason}</p>
          </div>

          {data.details && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Detalhes</h4>
              <p className="text-sm whitespace-pre-wrap">{data.details}</p>
            </div>
          )}

          <Separator />

          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data da Solicitação
            </h4>
            <p className="text-sm">{format(new Date(data.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </div>
        </div>
      </ScrollArea>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes da Solicitação</DialogTitle>
          <DialogDescription>
            {request.type === 'creative_request' 
              ? 'Informações completas do briefing solicitado pelo cliente'
              : 'Detalhes do ajuste solicitado pelo cliente'
            }
          </DialogDescription>
        </DialogHeader>
        {request.type === 'creative_request' 
          ? renderCreativeRequest(request.data as CreativeRequest)
          : renderAdjustmentRequest(request.data as AdjustmentRequest)
        }
      </DialogContent>
    </Dialog>
  );
}
