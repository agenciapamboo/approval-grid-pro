import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, User, Mail, Phone, FileText, Clock, Image as ImageIcon, ArrowRight, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface CreativeRequestDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: {
    id: string;
    title: string;
    clientName: string;
    clientEmail?: string;
    clientWhatsapp?: string;
    type?: string;
    text?: string;
    observations?: string;
    deadline?: string;
    status?: string;
    referenceFiles?: string[];
    createdAt: string;
  };
  onConvertToDraft?: (requestId: string) => void;
  onDelete?: (requestId: string) => void;
}

export function CreativeRequestDetailsDialog({
  open,
  onOpenChange,
  request,
  onConvertToDraft,
  onDelete,
}: CreativeRequestDetailsDialogProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const getTypeLabel = (type?: string) => {
    const typeLabels: Record<string, string> = {
      'post_feed': 'Post Feed',
      'stories': 'Stories',
      'reels': 'Reels',
      'carousel': 'Carrossel',
      'video': 'Vídeo',
    };
    return typeLabels[type || ''] || 'Criativo';
  };

  const getStatusBadge = (status?: string) => {
    const statusConfig: Record<string, { variant: "default" | "destructive" | "outline" | "pending" | "success" | "warning", label: string }> = {
      pending: { variant: "outline", label: "Pendente" },
      reviewing: { variant: "pending", label: "Em Análise" },
      in_production: { variant: "default", label: "Em Produção" },
      completed: { variant: "success", label: "Finalizado" },
    };
    const config = statusConfig[status || "pending"] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-2xl">{request.title}</DialogTitle>
                <DialogDescription className="mt-2">
                  Detalhes completos da solicitação de criativo
                </DialogDescription>
              </div>
              {getStatusBadge(request.status)}
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Informações do Cliente */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                Informações do Cliente
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{request.clientName}</span>
                </div>
                {request.clientEmail && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{request.clientEmail}</span>
                  </div>
                )}
                {request.clientWhatsapp && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{request.clientWhatsapp}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Detalhes da Solicitação */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Detalhes da Solicitação
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {request.type && (
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <p className="font-medium">{getTypeLabel(request.type)}</p>
                  </div>
                )}
                {request.deadline && (
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Prazo:
                    </span>
                    <p className="font-medium">
                      {format(new Date(request.deadline), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                )}
                <div className="md:col-span-2">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Data de Criação:
                  </span>
                  <p className="font-medium">
                    {format(new Date(request.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>

            {request.text && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold">Texto/Descrição</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {request.text}
                  </p>
                </div>
              </>
            )}

            {request.observations && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold">Observações</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {request.observations}
                  </p>
                </div>
              </>
            )}

            {request.referenceFiles && request.referenceFiles.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Arquivos de Referência ({request.referenceFiles.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {request.referenceFiles.map((file, index) => (
                      <div
                        key={index}
                        className="relative group cursor-pointer rounded-lg overflow-hidden border border-border"
                        onClick={() => setSelectedImage(file)}
                      >
                        <AspectRatio ratio={1}>
                          <img
                            src={file}
                            alt={`Referência ${index + 1}`}
                            className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                          />
                        </AspectRatio>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onDelete(request.id);
                    onOpenChange(false);
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              )}
              {onConvertToDraft && request.status === 'pending' && (
                <Button
                  size="sm"
                  onClick={() => {
                    onConvertToDraft(request.id);
                    onOpenChange(false);
                  }}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Converter em Rascunho
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de visualização de imagem */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Arquivo de Referência</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="relative w-full">
              <img
                src={selectedImage}
                alt="Visualização"
                className="w-full h-auto rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
