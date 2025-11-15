import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ContentCard } from "@/components/content/ContentCard";
import { LGPDConsent } from "@/components/lgpd/LGPDConsent";
import { CreateContentWrapper } from "@/components/content/CreateContentWrapper";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { UserProfileDialog } from "@/components/admin/UserProfileDialog";
import { useUserData } from "@/hooks/useUserData";

interface Content {
  id: string;
  title: string;
  date: string;
  scheduled_at?: string | null;
  deadline?: string;
  type: string;
  status: string;
  client_id: string;
  agency_id?: string | null;
  owner_user_id: string;
  version: number;
  created_at: string;
  updated_at: string;
  channels?: string[];
  published_at?: string | null;
  media_path?: string | null;
  caption?: string | null;
  legend?: string | null;
  is_content_plan?: boolean;
  plan_description?: string | null;
  category?: string;
}

export default function ContentGrid() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile: userProfile, role, agency: userAgency, client: userClient, loading: userDataLoading } = useUserData();
  const [contents, setContents] = useState<Content[]>([]);
  const [loadingContents, setLoadingContents] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  // Carregar conteúdos quando tiver dados do cliente
  useEffect(() => {
    if (userDataLoading || !userClient?.id) {
      console.log('[ContentGrid] Aguardando dados do cliente...', { userDataLoading, hasClient: !!userClient });
      return;
    }
    
    console.log('[ContentGrid] Cliente disponível, carregando conteúdos...', { clientId: userClient.id });
    loadContents(userClient.id);
  }, [userDataLoading, userClient]);

  const loadContents = async (clientId: string) => {
    try {
      setLoadingContents(true);
      console.log('[ContentGrid] Carregando conteúdos para cliente:', clientId);

      // Buscar conteúdos básicos
      const { data: contentsData, error } = await supabase
        .from('contents')
        .select(`
          id,
          title,
          date,
          status,
          type,
          category,
          channels,
          client_id,
          version,
          owner_user_id,
          created_at,
          updated_at,
          is_content_plan,
          plan_description
        `)
        .eq('client_id', clientId)
        .order('date', { ascending: true });

      if (error) {
        console.error('[ContentGrid] Erro ao carregar conteúdos:', error);
        toast({
          title: "Erro ao carregar conteúdos",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (!contentsData || contentsData.length === 0) {
        console.log('[ContentGrid] Nenhum conteúdo encontrado');
        setContents([]);
        return;
      }

      console.log('[ContentGrid] Carregados', contentsData.length, 'conteúdos');

      // Carregar mídias e legendas em paralelo para cada conteúdo
      const enrichedContents = await Promise.all(
        contentsData.map(async (content) => {
          const [mediaResult, textResult] = await Promise.all([
            // Buscar primeira mídia
            supabase
              .from('content_media')
              .select('src_url, thumb_url')
              .eq('content_id', content.id)
              .order('order_index', { ascending: true })
              .limit(1)
              .maybeSingle(),
            
            // Buscar legenda mais recente
            supabase
              .from('content_texts')
              .select('caption')
              .eq('content_id', content.id)
              .eq('version', content.version)
              .maybeSingle()
          ]);

          return {
            ...content,
            media_path: mediaResult.data?.src_url || null,
            caption: textResult.data?.caption || null
          };
        })
      );

      console.log('[ContentGrid] Enriquecidos conteúdos com mídias e legendas');
      setContents(enrichedContents);
    } catch (error: any) {
      console.error('[ContentGrid] Erro ao carregar conteúdos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os conteúdos.",
        variant: "destructive",
      });
    } finally {
      setLoadingContents(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleConsentAccept = () => {
    window.location.reload();
  };

  // Loading state
  if (userDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando perfil...</p>
          </div>
        </Card>
      </div>
    );
  }

  // Authentication guard
  if (!userProfile || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 max-w-md w-full">
          <div className="flex flex-col items-center space-y-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div className="text-center">
              <h3 className="font-semibold">Acesso Restrito</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Você precisa estar logado para acessar esta página.
              </p>
            </div>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Fazer Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // LGPD consent check
  if (userProfile && 'accepted_terms_at' in userProfile && !userProfile.accepted_terms_at) {
    return <LGPDConsent onAccept={handleConsentAccept} />;
  }

  // Client validation
  if (!userClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 max-w-md w-full">
          <div className="flex flex-col items-center space-y-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div className="text-center">
              <h3 className="font-semibold">Cliente não encontrado</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Não foi possível identificar seu cliente. Entre em contato com o suporte.
              </p>
            </div>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Voltar ao Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader 
        userName={userProfile.name}
        userRole={role}
        onProfileClick={() => setShowProfileDialog(true)}
      />

      <main className="flex-1 container py-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Grade de Conteúdos</h1>
            <p className="text-muted-foreground">
              Cliente: {userClient.name}
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            Criar Novo Conteúdo
          </Button>
        </div>

        {loadingContents ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando conteúdos...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contents.length > 0 ? (
              contents.map((content) => (
                <ContentCard
                  key={content.id}
                  content={content}
                  isResponsible={true}
                  onUpdate={() => loadContents(userClient.id)}
                />
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum Conteúdo Encontrado</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Não há conteúdos cadastrados para este cliente ainda.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <AppFooter />

      {showCreateDialog && (
        <CreateContentWrapper
          clientId={userClient.id}
          onContentCreated={() => {
            setShowCreateDialog(false);
            loadContents(userClient.id);
          }}
        />
      )}

      {showProfileDialog && (
        <UserProfileDialog
          user={userProfile}
          profile={{ ...userProfile, role }}
          open={showProfileDialog}
          onOpenChange={setShowProfileDialog}
          onUpdate={() => {}}
        />
      )}
    </div>
  );
}
