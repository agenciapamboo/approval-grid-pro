import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CreativeRequestCard } from "./CreativeRequestCard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CreativeRequestsGridProps {
  clientId?: string;
  showClientColumn?: boolean;
}

interface CreativeRequest {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  client_id: string;
  client_name?: string;
  status?: string;
  request_type?: string;
}

export function CreativeRequestsGrid({ clientId, showClientColumn }: CreativeRequestsGridProps) {
  const [requests, setRequests] = useState<CreativeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<CreativeRequest | null>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [clientId]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from("contents")
        .select(`
          id,
          title,
          plan_description,
          created_at,
          client_id,
          status,
          type,
          clients (
            name
          )
        `)
        .eq("is_content_plan", true)
        .order("created_at", { ascending: false });

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedRequests: CreativeRequest[] = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.plan_description,
        created_at: item.created_at,
        client_id: item.client_id,
        client_name: item.clients?.name,
        status: item.status === "draft" ? "pending" : "converted",
        request_type: item.type,
      }));

      setRequests(formattedRequests);
    } catch (error: any) {
      console.error("Error loading requests:", error);
      toast.error("Erro ao carregar solicitações");
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToDraft = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("contents")
        .update({ 
          is_content_plan: false,
          status: "draft"
        })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Solicitação convertida em rascunho!");
      loadRequests();
    } catch (error: any) {
      console.error("Error converting request:", error);
      toast.error("Erro ao converter solicitação");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhuma solicitação encontrada</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {requests.map((request) => (
          <CreativeRequestCard
            key={request.id}
            request={request}
            showClientName={showClientColumn}
            onView={() => {
              setSelectedRequest(request);
              setShowRequestDialog(true);
            }}
            onConvertToDraft={() => handleConvertToDraft(request.id)}
          />
        ))}
      </div>

      {selectedRequest && (
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedRequest.title}</DialogTitle>
              <DialogDescription>
                Detalhes da solicitação de criativo
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Calendar className="h-4 w-4" />
                    <span>Criado em {format(new Date(selectedRequest.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                  {selectedRequest.client_name && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>Cliente: {selectedRequest.client_name}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {selectedRequest.description && (
                  <div>
                    <h4 className="font-medium mb-2">Descrição</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedRequest.description}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  {selectedRequest.status === 'pending' && (
                    <Button 
                      onClick={() => {
                        handleConvertToDraft(selectedRequest.id);
                        setShowRequestDialog(false);
                      }}
                      className="w-full"
                    >
                      Converter em Rascunho
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={() => setShowRequestDialog(false)}
                    className="w-full"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
