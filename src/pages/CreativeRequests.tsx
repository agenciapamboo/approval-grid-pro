import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { CreativeRequestCard } from "@/components/content/CreativeRequestCard";
import { CreativeRequestDetailsDialog } from "@/components/content/CreativeRequestDetailsDialog";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CreativeRequests() {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (profile?.agency_id) {
      loadRequests();
    }
  }, [profile, clientId]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
    }
    
    setLoading(false);
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from("notifications")
        .select(`
          *,
          clients (
            id,
            name,
            email,
            whatsapp
          )
        `)
        .eq("event", "novojob")
        .eq("agency_id", profile.agency_id)
        .order("created_at", { ascending: false });

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setRequests(data || []);
    } catch (error) {
      console.error("Erro ao carregar solicitações:", error);
      toast({
        title: "Erro ao carregar solicitações",
        description: "Não foi possível carregar as solicitações de criativos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = (request: any) => {
    setSelectedRequest(request);
    setShowDetailsDialog(true);
  };

  if (loading || !profile) {
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
      <div className="container mx-auto px-4 md:px-6 py-4 md:py-8">
        <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              Solicitações de Criativos
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Gerencie todas as solicitações recebidas de clientes
            </p>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhuma solicitação de criativo encontrada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requests.map((request) => (
              <CreativeRequestCard
                key={request.id}
                request={{
                  id: request.id,
                  title: request.payload?.title || 'Sem título',
                  clientName: request.clients?.name || 'Cliente',
                  deadline: request.payload?.deadline,
                  status: request.payload?.job_status,
                  type: request.payload?.type,
                  createdAt: request.created_at,
                }}
                onClick={() => handleOpenDetails(request)}
              />
            ))}
          </div>
        )}

        {selectedRequest && (
          <CreativeRequestDetailsDialog
            open={showDetailsDialog}
            onOpenChange={setShowDetailsDialog}
            request={{
              id: selectedRequest.id,
              title: selectedRequest.payload?.title || 'Sem título',
              clientName: selectedRequest.clients?.name || 'Cliente',
              clientEmail: selectedRequest.clients?.email,
              clientWhatsapp: selectedRequest.clients?.whatsapp,
              type: selectedRequest.payload?.type,
              text: selectedRequest.payload?.text,
              observations: selectedRequest.payload?.observations,
              deadline: selectedRequest.payload?.deadline,
              status: selectedRequest.payload?.job_status,
              referenceFiles: selectedRequest.payload?.reference_files || [],
              createdAt: selectedRequest.created_at,
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
