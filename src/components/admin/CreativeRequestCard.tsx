import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Eye, FileText, ArrowRight } from "lucide-react";
import { formatDate } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CreativeRequestCardProps {
  request: {
    id: string;
    title: string;
    description?: string;
    created_at: string;
    client_name?: string;
    status?: string;
    request_type?: string;
  };
  onView: () => void;
  onConvertToDraft?: () => void;
  onRequestInfo?: () => void;
  onDelete?: () => void;
  showClientName?: boolean;
}

export function CreativeRequestCard({ 
  request, 
  onView, 
  onConvertToDraft,
  showClientName
}: CreativeRequestCardProps) {
  const getStatusBadge = (status?: string) => {
    if (!status || status === 'pending') {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Pendente</Badge>;
    }
    if (status === 'converted') {
      return <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">Convertido</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all group" 
      onClick={onView}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors">
            {request.title}
          </CardTitle>
          {getStatusBadge(request.status)}
        </div>
        {showClientName && request.client_name && (
          <CardDescription className="text-sm flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {request.client_name}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {request.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {request.description}
          </p>
        )}
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {formatDate(new Date(request.created_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
        </div>
        
        <div className="flex flex-col gap-2 pt-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full group-hover:border-primary group-hover:text-primary" 
            onClick={(e) => { 
              e.stopPropagation(); 
              onView(); 
            }}
          >
            <Eye className="h-4 w-4 mr-2" />
            Ver Detalhes
          </Button>
          
          {onConvertToDraft && request.status === 'pending' && (
            <Button 
              size="sm" 
              className="w-full" 
              onClick={(e) => { 
                e.stopPropagation(); 
                onConvertToDraft(); 
              }}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Converter em Rascunho
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
