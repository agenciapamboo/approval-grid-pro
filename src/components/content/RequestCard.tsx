import { Badge } from "@/components/ui/badge";
import { Calendar, MessageSquare, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RequestCardProps {
  request: {
    id: string;
    type: 'creative_request' | 'adjustment_request';
    title: string;
    clientName: string;
    createdAt: string;
    status?: string;
    assigneeName?: string;
  };
  onClick: () => void;
}

export function RequestCard({ request, onClick }: RequestCardProps) {
  const getStatusBadge = () => {
    if (request.type === 'creative_request') {
      const statusVariants: Record<string, { variant: "default" | "pending" | "destructive" | "success" | "warning", label: string }> = {
        pending: { variant: "warning", label: "Pendente" },
        reviewing: { variant: "pending", label: "Em Revisão" },
        in_production: { variant: "default", label: "Em Produção" },
        completed: { variant: "success", label: "Finalizado" },
      };
      const config = statusVariants[request.status || "pending"] || statusVariants.pending;
      return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
    }
    return <Badge variant="destructive" className="text-xs">Ajuste</Badge>;
  };

  return (
    <div
      onClick={onClick}
      className="p-3 bg-card border border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="m-0 font-medium text-sm truncate">
            {request.title}
          </p>
          <p className="m-0 text-xs text-muted-foreground truncate">
            {request.clientName}
          </p>
        </div>
        {getStatusBadge()}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          {request.type === 'creative_request' ? (
            <MessageSquare className="h-3 w-3" />
          ) : (
            <MessageSquare className="h-3 w-3 text-destructive" />
          )}
          <span>{request.type === 'creative_request' ? 'Criativo' : 'Ajuste'}</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {format(new Date(request.createdAt), "dd/MM", { locale: ptBR })}
        </div>
        {request.assigneeName && (
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{request.assigneeName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
