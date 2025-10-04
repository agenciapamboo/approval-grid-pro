import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Users, Building2, FileImage } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  name: string;
  role: string;
  agency_id: string | null;
  client_id: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      setUser(user);

      // Fetch profile
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar o perfil.",
        });
      } else {
        setProfile(profileData);
      }

      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          navigate("/auth");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      super_admin: "Super Administrador",
      agency_admin: "Administrador da Agência",
      client_user: "Usuário do Cliente",
    };
    return roles[role] || role;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <FileImage className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Social Approval</h1>
              <p className="text-sm text-muted-foreground">Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{profile?.name}</p>
              <p className="text-xs text-muted-foreground">{profile && getRoleLabel(profile.role)}</p>
            </div>
            <Button variant="outline" size="icon" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Agências</CardTitle>
              <CardDescription>
                Gerencie agências e suas configurações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled>
                Em breve
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <CardTitle>Clientes</CardTitle>
              <CardDescription>
                Visualize e gerencie clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled>
                Em breve
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-3">
                <FileImage className="w-6 h-6 text-success" />
              </div>
              <CardTitle>Conteúdos</CardTitle>
              <CardDescription>
                Acesse a grade de conteúdos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled>
                Em breve
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8 shadow-lg">
          <CardHeader>
            <CardTitle>Bem-vindo ao Social Approval!</CardTitle>
            <CardDescription>
              Sistema profissional de aprovação de conteúdos para redes sociais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Este é um sistema multi-tenant completo para gerenciar o fluxo de aprovação
              de conteúdos de redes sociais com:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
              <li>Grade 3×3 estilo Instagram para visualização de conteúdos</li>
              <li>Sistema de aprovação com comentários e solicitação de ajustes</li>
              <li>Suporte para imagens, carrosséis e reels</li>
              <li>Multi-tenancy (Agências → Clientes → Usuários)</li>
              <li>Marca branca por agência</li>
              <li>Conformidade com LGPD</li>
            </ul>
            <p className="text-sm font-medium text-primary">
              As funcionalidades estão sendo construídas progressivamente.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
