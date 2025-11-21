import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, FileText, Clock } from "lucide-react";
import { format, differenceInDays, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CreativeRequestCardProps {
  request: {
    id: string;
    title: string;
    clientName: string;
    deadline?: string;
    status?: string;
    type?: string;
    createdAt: string;
  };
  onClick: () => void;
}

export function CreativeRequestCard({ request, onClick }: CreativeRequestCardProps) {
  const getStatusBadge = (status?: string) => {
    const statusConfig: Record<string, { variant: "default" | "destructive" | "outline" | "pending" | "success" | "warning", label: string }> = {
      pending: { variant: "outline", label: "Pendente" },
      reviewing: { variant: "pending", label: "Em Análise" },
      in_production: { variant: "default", label: "Em Produção" },
      completed: { variant: "success", label: "Finalizado" },
    };
    const config = statusConfig[status || "pending"] || statusConfig.pending;
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
  };

  const getDeadlineBadge = (deadline?: string) => {
    if (!deadline) return null;

    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffInDays = differenceInDays(deadlineDate, now);

    let variant: "default" | "destructive" | "outline" = "outline";
    let label = format(deadlineDate, "dd/MM/yyyy", { locale: ptBR });
    let className = "";

    if (isPast(deadlineDate) && !isToday(deadlineDate)) {
      variant = "destructive";
      label = "Atrasado";
    } else if (isToday(deadlineDate)) {
      variant = "destructive";
      label = "Hoje";
    } else if (diffInDays <= 2) {
      variant = "outline";
      label = "Urgente";
      className = "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/50";
    }

    return (
      <Badge variant={variant} className={cn("text-xs flex items-center gap-1", className)}>
        <Clock className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

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

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all group" 
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors">
            {request.title}
          </CardTitle>
          {getStatusBadge(request.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span className="truncate">{request.clientName}</span>
        </div>

        {request.deadline && (
          <div className="flex items-center gap-2">
            {getDeadlineBadge(request.deadline)}
          </div>
        )}

        {request.type && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{getTypeLabel(request.type)}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          <Calendar className="h-3 w-3" />
          {format(new Date(request.createdAt), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
        </div>
      </CardContent>
    </Card>
  );
}
