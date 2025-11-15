import { useEffect, useState } from "react";
import { useUserData } from "@/hooks/useUserData";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notification {
  id: string;
  created_at: string;
  event: string;
  status: string;
  payload: any;
}

export default function MinhasSolicitacoes() {
  const { profile, loading: userLoading } = useUserData();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<Notification[]>([]);

  useEffect(() => {
    if (userLoading || !profile?.client_id) return;
    loadRequests();
  }, [userLoading, profile]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('client_id', profile!.client_id)
        .eq('event', 'novojob')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRequests(data || []);
    } catch (error) {
      console.error("Erro ao carregar solicitações:", error);
      toast.error("Erro ao carregar solicitações");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "destructive" | "outline" }> = {
      pending: { label: "Pendente", variant: "outline" },
      sent: { label: "Enviado", variant: "default" },
      error: { label: "Erro", variant: "destructive" },
    };
    
    const { label, variant } = variants[status] || { label: status, variant: "outline" };
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (userLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Minhas Solicitações
          </h1>
          <p className="text-muted-foreground">
            Acompanhe o status das suas solicitações de criativos
          </p>
        </div>

        {requests.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Você ainda não fez nenhuma solicitação</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle>{request.payload?.title || "Sem título"}</CardTitle>
                      <CardDescription>
                        Tipo: {request.payload?.type || "Não especificado"}
                      </CardDescription>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {request.payload?.text && (
                      <div>
                        <span className="font-medium">Texto:</span> {request.payload.text}
                      </div>
                    )}
                    {request.payload?.observations && (
                      <div>
                        <span className="font-medium">Observações:</span> {request.payload.observations}
                      </div>
                    )}
                    {request.payload?.deadline && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Prazo: {format(new Date(request.payload.deadline), "dd/MM/yyyy")}
                      </div>
                    )}
                    <div className="text-muted-foreground pt-2">
                      Solicitado em: {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
