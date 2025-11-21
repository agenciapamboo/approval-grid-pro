import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Content {
  id: string;
  title: string;
  date: string;
  status: string;
  type: string;
  client_id: string;
  clients?: {
    name: string;
  };
  itemType?: 'content' | 'creative_request' | 'adjustment_request';
  requestType?: string;
  reason?: string;
}

interface RequestDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: Content | null;
}

export function RequestDetailsDialog({ open, onOpenChange, request }: RequestDetailsDialogProps) {
  if (!request) return null;

  const isCreativeRequest = request.itemType === 'creative_request';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isCreativeRequest ? '📋 Solicitação de Criativo' : '🔧 Solicitação de Ajuste'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-1">Título</h3>
            <p>{request.title}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Cliente</h3>
            <p>{request.clients?.name || 'Não especificado'}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Data</h3>
            <p>{format(new Date(request.date), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </div>

          {isCreativeRequest && request.requestType && (
            <div>
              <h3 className="font-semibold mb-1">Tipo de Criativo</h3>
              <Badge>{request.requestType}</Badge>
            </div>
          )}

          {!isCreativeRequest && request.reason && (
            <div>
              <h3 className="font-semibold mb-1">Motivo do Ajuste</h3>
              <p className="text-sm text-muted-foreground">{request.reason}</p>
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-1">Status</h3>
            <Badge variant={request.status === 'pending' ? 'warning' : 'outline'}>
              {request.status === 'pending' ? 'Pendente' : request.status}
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
