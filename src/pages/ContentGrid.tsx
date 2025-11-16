import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Loader2, Plus, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ContentCard } from "@/components/content/ContentCard";
import { LGPDConsent } from "@/components/lgpd/LGPDConsent";
import { CreateContentWrapper } from "@/components/content/CreateContentWrapper";
import { AppLayout } from "@/components/layout/AppLayout";
import { UserProfileDialog } from "@/components/admin/UserProfileDialog";
import { useUserData } from "@/hooks/useUserData";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

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
  const isMobile = useIsMobile();
  const [contents, setContents] = useState<Content[]>([]);
  const [loadingContents, setLoadingContents] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);

  const getStatusBadgeVariant = (status: string): "success" | "warning" | "destructive" | "outline" => {
    if (status === "approved") return "success";
    if (status === "pending") return "warning";
    if (status === "rejected") return "destructive";
    return "outline";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'draft': 'Rascunho',
      'pending': 'Pendente',
      'approved': 'Aprovado',
      'rejected': 'Rejeitado',
      'published': 'Publicado',
      'archived': 'Arquivado'
    };
    return labels[status] || status;
  };

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
        .order('date', { ascending: false });

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
    <AppLayout>
      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold break-words">Meu Conteúdo</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {userClient.name}
            </p>
          </div>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Conteúdo
          </Button>
        </div>

        {loadingContents ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : contents.length === 0 ? (
          <Card className="p-8">
            <div className="text-center">
              <p className="text-muted-foreground">Nenhum conteúdo encontrado</p>
            </div>
          </Card>
        ) : isMobile ? (
          // Instagram-style grid for mobile
          <div className="grid grid-cols-3 gap-1">
            {contents.map((content) => (
              <button
                key={content.id}
                onClick={() => setSelectedContent(content)}
                className="aspect-square relative overflow-hidden rounded-lg bg-muted group cursor-pointer"
              >
                {content.media_path ? (
                  <div className="w-full h-full">
                    <img 
                      src={content.media_path} 
                      alt={content.title}
                      className="object-cover w-full h-full group-hover:opacity-90 transition-opacity"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                    <FileText className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}
                <Badge 
                  variant={getStatusBadgeVariant(content.status)}
                  className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5"
                >
                  {getStatusLabel(content.status)}
                </Badge>
              </button>
            ))}
          </div>
        ) : (
          // Traditional grid for desktop
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {contents.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                isResponsible={content.owner_user_id === userProfile.id}
                onUpdate={() => loadContents(userClient.id)}
              />
            ))}
          </div>
        )}

        {/* Mobile Content Detail Dialog */}
        <Dialog open={!!selectedContent} onOpenChange={() => setSelectedContent(null)}>
          <DialogContent className="max-w-full h-full p-0 gap-0">
            <ScrollArea className="h-full">
              {selectedContent && (
                <div className="p-4">
                  <ContentCard
                    content={selectedContent}
                    isResponsible={selectedContent.owner_user_id === userProfile.id}
                    onUpdate={() => {
                      loadContents(userClient.id);
                      setSelectedContent(null);
                    }}
                  />
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {showCreateDialog && (
          <CreateContentWrapper
            clientId={userClient.id}
            onContentCreated={() => {
              setShowCreateDialog(false);
              loadContents(userClient.id);
            }}
          />
        )}

        {showProfileDialog && userProfile && (
          <UserProfileDialog
            user={userProfile}
            profile={{ ...userProfile, role }}
            open={showProfileDialog}
            onOpenChange={setShowProfileDialog}
            onUpdate={() => {}}
          />
        )}
      </div>
    </AppLayout>
  );
}
