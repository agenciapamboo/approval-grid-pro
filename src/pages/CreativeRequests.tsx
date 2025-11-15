import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ClientCreativeRequestsTable } from "@/components/admin/ClientCreativeRequestsTable";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function CreativeRequests() {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

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
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Solicitações de Criativos
            </h1>
            <p className="text-muted-foreground">
              Gerencie todas as solicitações recebidas de clientes
            </p>
          </div>
        </div>

        <ClientCreativeRequestsTable 
          clientId={clientId} 
          showClientColumn={!clientId} 
        />
      </div>
    </AppLayout>
  );
}
