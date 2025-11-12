import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { TrustedIPsManager } from "@/components/admin/TrustedIPsManager";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TrustedIP {
  id: string;
  ip_address: string;
  label: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  added_by: string | null;
}

const TrustedIPs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [trustedIPs, setTrustedIPs] = useState<TrustedIP[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
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

      const { data: roleData } = await supabase
        .rpc('get_user_role', { _user_id: user.id });

      if (profileData) {
        const userProfile = { ...profileData, role: roleData || 'client_user' };
        
        // Verificar se é super admin
        if (roleData !== 'super_admin') {
          navigate("/dashboard");
          return;
        }

        setProfile(userProfile);
        loadTrustedIPs();
      }
    } catch (error) {
      console.error("Error loading data:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const loadTrustedIPs = async () => {
    try {
      const { data, error } = await supabase
        .from('trusted_ips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTrustedIPs(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar IPs confiáveis:', error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted to-background">
      <AppHeader 
        userName={profile?.name} 
        userRole={profile?.role} 
        onSignOut={() => navigate("/auth")} 
      />

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">IPs Confiáveis</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie a whitelist de endereços IP que nunca serão bloqueados pelo sistema de segurança 2FA
          </p>
        </div>

        <TrustedIPsManager 
          trustedIPs={trustedIPs} 
          onRefresh={loadTrustedIPs}
        />
      </main>

      <AppFooter />
    </div>
  );
};

export default TrustedIPs;
