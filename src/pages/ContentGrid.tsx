import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ContentCard } from "@/components/content/ContentCard";
import { ContentFilters } from "@/components/content/ContentFilters";
import { LGPDConsent } from "@/components/lgpd/LGPDConsent";
import { CreateContentWrapper } from "@/components/content/CreateContentWrapper";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { UserProfileDialog } from "@/components/admin/UserProfileDialog";

interface Profile {
  id: string;
  name: string;
  role: string;
  client_id?: string;
  agency_id?: string;
  accepted_terms_at?: string;
}

interface Client {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  agency_id: string;
}

interface Agency {
  id: string;
  name: string;
  slug: string;
  brand_primary?: string;
  brand_secondary?: string;
  logo_url?: string;
}

interface Content {
  id: string;
  title: string;
  date: string;
  deadline?: string;
  type: string;
  status: string;
  client_id: string;
  owner_user_id: string;
  version: number;
  created_at: string;
  updated_at: string;
  channels?: string[];
}

export default function ContentGrid() {
  const { agencySlug, clientSlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [showConsent, setShowConsent] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadPublicData();
  }, [agencySlug, clientSlug]);

  const loadPublicData = async () => {
    try {
      console.log('=== ContentGrid loadPublicData started ===');
      console.log('agencySlug:', agencySlug, 'clientSlug:', clientSlug);
      
      // Verificar se há sessão ativa (opcional)
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session exists:', !!session);
      
      if (session) {
        setUser(session.user);
        // Carregar perfil se logado
        console.log('Loading profile for user:', session.user.id);
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error loading profile:', profileError);
        } else if (profileData) {
          console.log('Profile loaded:', profileData);
          setProfile(profileData);
          
          // Verificar consentimento LGPD apenas para usuários logados
          if (!profileData.accepted_terms_at) {
            console.log('User needs to accept terms');
            setShowConsent(true);
            return;
          }
        } else {
          console.warn('No profile found for user');
        }
      }

      // Carregar dados públicos da agência (se agencySlug for fornecido)
      if (agencySlug) {
        console.log('Loading agency by slug:', agencySlug);
        const { data: agencyData, error: agencyError } = await supabase
          .from("agencies")
          .select("*")
          .eq("slug", agencySlug)
          .maybeSingle();

        if (agencyError) {
          console.error("Erro ao carregar agência:", agencyError);
        } else if (agencyData) {
          console.log('Agency loaded:', agencyData);
          setAgency(agencyData);
        }
      }

      // Carregar cliente pelo slug
      console.log('Loading client by slug:', clientSlug);
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("slug", clientSlug)
        .maybeSingle();

      if (clientError) {
        console.error('Error loading client:', clientError);
        toast({
          title: "Cliente não encontrado",
          description: "Não foi possível carregar o cliente.",
          variant: "destructive",
        });
        return;
      }
      
      if (!clientData) {
        console.error('Client not found with slug:', clientSlug);
        toast({
          title: "Cliente não encontrado",
          description: "Não foi possível carregar o cliente.",
          variant: "destructive",
        });
        return;
      }

      console.log('Client loaded:', clientData);
      setClient(clientData);
      await loadContents(clientData.id);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar os dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadContents = async (clientId: string) => {
    console.log('=== loadContents started for client:', clientId);
    
    // Se há um usuário logado, mostrar todos os conteúdos
    // Se não há usuário logado (acesso público), mostrar apenas aprovados
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Session in loadContents:', !!session);
    
    let query = supabase
      .from("contents")
      .select("*")
      .eq("client_id", clientId);
    
    // Se não estiver logado, filtrar apenas aprovados
    if (!session) {
      console.log('No session - filtering only approved contents');
      query = query.eq("status", "approved");
    } else {
      console.log('Session exists - loading all contents');
    }
    
    const { data, error } = await query.order("date", { ascending: false });

    if (error) {
      console.error("Erro ao carregar conteúdos:", error);
      return;
    }

    console.log('Contents loaded:', data?.length || 0);
    setContents(data || []);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleConsentAccepted = () => {
    setShowConsent(false);
    loadPublicData();
  };

  const handleProfileUpdate = () => {
    loadPublicData();
  };

  // Agrupar conteúdos por mês
  const groupedContents = contents.reduce((groups, content) => {
    const date = new Date(content.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(content);
    return groups;
  }, {} as Record<string, Content[]>);

  const sortedMonthKeys = Object.keys(groupedContents).sort((a, b) => b.localeCompare(a));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (showConsent) {
    return <LGPDConsent onAccept={handleConsentAccepted} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader 
        userName={profile?.name}
        userRole="Cliente"
        onProfileClick={() => setShowProfileDialog(true)}
        onSignOut={handleSignOut}
      />

      {/* Diálogo de Perfil com Preferências */}
      {profile && user && (
        <UserProfileDialog
          user={user}
          profile={profile}
          onUpdate={handleProfileUpdate}
          open={showProfileDialog}
          onOpenChange={setShowProfileDialog}
        />
      )}

      <main className="container mx-auto px-4 py-8">
        {sortedMonthKeys.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum conteúdo encontrado
          </div>
        ) : (
          <div className="space-y-12 mt-6">
            {sortedMonthKeys.map((monthKey) => {
              const [year, month] = monthKey.split('-');
              const monthDate = new Date(parseInt(year), parseInt(month) - 1);
              const monthName = monthDate.toLocaleDateString('pt-BR', { 
                month: 'long', 
                year: 'numeric' 
              });

              return (
                <div key={monthKey}>
                  <h2 className="text-2xl font-semibold capitalize mb-4">
                    {monthName}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedContents[monthKey].map((content) => (
                      <ContentCard 
                        key={content.id} 
                        content={content}
                        isResponsible={false}
                        isAgencyView={false}
                        onUpdate={() => loadContents(client!.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      
      <AppFooter />
    </div>
  );
}
