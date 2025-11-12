import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { TwoFactorSecurityDashboard } from "@/components/admin/TwoFactorSecurityDashboard";
import { Loader2 } from "lucide-react";

const SecurityDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

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
        
        // Verificar se é super admin ou agency admin
        if (roleData !== 'super_admin' && roleData !== 'agency_admin') {
          navigate("/dashboard");
          return;
        }

        setProfile(userProfile);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
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
          <h1 className="text-3xl font-bold">Dashboard de Segurança 2FA</h1>
          <p className="text-muted-foreground mt-2">
            {profile?.role === 'agency_admin' 
              ? 'Monitore tentativas de acesso e atividades suspeitas dos seus clientes'
              : 'Visão geral de segurança e tentativas de autenticação do sistema'}
          </p>
        </div>

        <TwoFactorSecurityDashboard agencyId={profile?.role === 'agency_admin' ? profile?.agency_id : undefined} />
      </main>

      <AppFooter />
    </div>
  );
};

export default SecurityDashboard;
