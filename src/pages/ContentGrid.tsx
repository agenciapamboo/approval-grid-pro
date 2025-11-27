import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Loader2, Plus, FileText, ArrowLeft, X, ImageIcon, Video, Images, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ContentCard } from "@/components/content/ContentCard";
import { ContentDetailsDialog } from "@/components/content/ContentDetailsDialog";
import { LGPDConsent } from "@/components/lgpd/LGPDConsent";
import { CreateContentWrapper } from "@/components/content/CreateContentWrapper";
import { AppLayout } from "@/components/layout/AppLayout";
import { UserProfileDialog } from "@/components/admin/UserProfileDialog";
import { useUserData } from "@/hooks/useUserData";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { StoriesHighlights } from "@/components/content/StoriesHighlights";
import { EnrichEditorialButton } from "@/components/ai/EnrichEditorialButton";
import { MonthlyContentPlanner } from "@/components/content/MonthlyContentPlanner";
import { EditorialLineAssistant } from "@/components/content/EditorialLineAssistant";
import { TrendingUp } from "lucide-react";

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
  thumb_path?: string | null;
  caption?: string | null;
  legend?: string | null;
  is_content_plan?: boolean;
  plan_description?: string | null;
  category?: string;
}

export default function ContentGrid() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');
  const { toast } = useToast();
  const { profile: userProfile, role, agency: userAgency, client: userClient, loading: userDataLoading } = useUserData();
  const isMobile = useIsMobile();
  const [contents, setContents] = useState<Content[]>([]);
  const [loadingContents, setLoadingContents] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [showMonthlyPlanner, setShowMonthlyPlanner] = useState(false);
  const [showEditorialAssistant, setShowEditorialAssistant] = useState(false);

  // Função para converter status do banco em status para client users
  const getClientStatus = (content: Content): 'pending' | 'producing' | 'scheduled' | 'published' | null => {
    const now = new Date();
    
    // PUBLICADOS: Já publicados OU aprovados com data passada
    if (content.published_at) return 'published';
    if (content.status === 'approved' && content.date && new Date(content.date) <= now) {
      return 'published';
    }
    
    // AGENDADOS: Aprovados com data futura
    if (content.status === 'approved' && (!content.date || new Date(content.date) > now)) {
      return 'scheduled';
    }
    
    // PRODUZINDO: Planos de conteúdo OU ajustes solicitados
    if (content.is_content_plan === true || content.status === 'changes_requested') {
      return 'producing';
    }
    
    // PENDENTE: Rascunho OU em revisão
    if (content.status === 'draft' || content.status === 'in_review') {
      return 'pending';
    }
    
    // Outros status não são exibidos
    return null;
  };

  const getStatusBadgeVariant = (clientStatus: string): "success" | "warning" | "destructive" | "outline" => {
    if (clientStatus === "published") return "success";
    if (clientStatus === "scheduled") return "outline";
    if (clientStatus === "producing") return "warning";
    if (clientStatus === "pending") return "warning";
    return "outline";
  };

  const getStatusLabel = (clientStatus: string) => {
    const labels: Record<string, string> = {
      'pending': 'Pendente',
      'producing': 'Produzindo',
      'scheduled': 'Agendado',
      'published': 'Publicado'
    };
    return labels[clientStatus] || clientStatus;
  };

  const filterLabels: Record<string, string> = {
    'pending': 'Pendentes',
    'producing': 'Produzindo',
    'scheduled': 'Agendados',
    'published': 'Publicados'
  };

  const filterContentsByStatus = (contents: Content[]) => {
    // SEMPRE excluir stories da grade principal
    const nonStoryContents = contents.filter(c => c.type !== 'story');
    
    if (!filterParam) return nonStoryContents;
    
    const now = new Date();
    
    switch(filterParam) {
      case 'pending':
        return nonStoryContents.filter(c => c.status === 'draft' || c.status === 'in_review');
      
      case 'producing':
        return nonStoryContents.filter(c => c.is_content_plan === true || c.status === 'changes_requested');
      
      case 'scheduled':
        return nonStoryContents.filter(c => 
          c.status === 'approved' && 
          (!c.date || new Date(c.date) > now)
        );
      
      case 'published':
        return nonStoryContents.filter(c => {
          if (c.published_at) return true;
          return c.status === 'approved' && c.date && new Date(c.date) <= now;
        });
      
      default:
        return nonStoryContents;
    }
  };

  // Auto-scroll ao conteúdo selecionado no feed
  useEffect(() => {
    if (selectedContent && isMobile) {
      setTimeout(() => {
        const element = document.getElementById(`content-${selectedContent.id}`);
        if (element) {
          element.scrollIntoView({
            behavior: 'instant',
            block: 'start'
          });
        }
      }, 100);
    }
  }, [selectedContent, isMobile]);

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
          deadline,
          status,
          type,
          category,
          channels,
          client_id,
          agency_id,
          version,
          owner_user_id,
          created_at,
          updated_at,
          auto_publish,
          published_at,
          supplier_link,
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

      // Carregar mídias, legendas E resolver URLs assinadas
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

          // Resolver URL assinada se houver mídia
          let signedMediaUrl = null;
          const mediaPath = mediaResult.data?.src_url || mediaResult.data?.thumb_url;
          
          if (mediaPath) {
            try {
              const { data: urlData } = await supabase.functions.invoke('get-media-url', {
                body: { path: mediaPath }
              });
              signedMediaUrl = urlData?.url || urlData?.signedUrl || null;
            } catch (error) {
              console.error('[ContentGrid] Erro ao resolver URL para', content.id.slice(0, 8), error);
            }
          }

          return {
            ...content,
            media_path: signedMediaUrl,
            thumb_path: mediaResult.data?.thumb_url,
            caption: textResult.data?.caption || null
          };
        })
      );

      console.log('[ContentGrid] Conteúdos carregados:', enrichedContents.map(c => ({
        id: c.id.slice(0, 8),
        title: c.title,
        type: c.type,
        is_plan: c.is_content_plan,
        has_media: !!c.media_path,
        media_url_resolved: c.media_path ? 'Sim ✅' : 'Não ❌'
      })));
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

  // Debug: Log dados do usuário
  console.log('[ContentGrid] 🔍 Debug - Role:', role);
  console.log('[ContentGrid] 🔍 Debug - UserClient:', userClient);
  console.log('[ContentGrid] 🔍 Debug - Agency ID:', userClient?.agency_id);
  console.log('[ContentGrid] 🔍 Debug - Condição botões:', (role === 'agency_admin' || role === 'team_member'));

  return (
    <AppLayout>
      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {filterParam && (
          <div className="mb-4">
            <Badge variant="outline" className="text-sm gap-2">
              Filtro: {filterLabels[filterParam]}
              <button 
                onClick={() => navigate('/conteudo')}
                className="hover:text-destructive transition-colors"
                aria-label="Remover filtro"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold break-words">Meu Conteúdo</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {userClient.name}
            </p>
          </div>
          {/* Botões visíveis apenas para agency_admin e team_member */}
          {(role === 'agency_admin' || role === 'team_member') ? (
            <>
              {console.log('[ContentGrid] ✅ Renderizando botões para role:', role)}
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setShowMonthlyPlanner(true)}
                size="sm"
                className="flex-shrink-0"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Planejamento IA
              </Button>
              <EnrichEditorialButton
                clientId={userClient.id}
                variant="outline"
                size="sm"
                onSuccess={() => {
                  toast({
                    title: "Linha Editorial Atualizada",
                    description: "A linha editorial foi enriquecida com sucesso"
                  });
                }}
              />
              <Button 
                onClick={() => setShowCreateDialog(true)}
                size="sm"
                className="flex-shrink-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Conteúdo
              </Button>
              <Button
                onClick={() => {
                  console.log('[ContentGrid] 🎯 Botão Assistente IA clicado');
                  setShowEditorialAssistant(true);
                }}
                className="gap-2 bg-green-500 hover:bg-green-600 flex-shrink-0"
                size="sm"
              >
                <Sparkles className="h-4 w-4" />
                Assistente IA - Linha Editorial
              </Button>
              </div>
            </>
          ) : (
            console.log('[ContentGrid] ❌ Botões NÃO renderizados - role:', role)
          )}
        </div>

          {/* Stories Highlights - SEM filtro */}
          {!filterParam && contents.length > 0 && (
            <StoriesHighlights 
              contents={contents}
              onUpdate={() => loadContents(userClient!.id)}
            />
          )}

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
          // MOBILE: Instagram-style grid (3 colunas) que ao clicar abre Dialog fullscreen
          <>
            <div className="grid grid-cols-3 gap-0.5 pb-20">
              {filterContentsByStatus(contents).map((content) => (
                <div
                  key={content.id}
                  onClick={() => setSelectedContent(content)}
                  className="relative aspect-square cursor-pointer group overflow-hidden"
                >
                  {/* Renderizar baseado no tipo de conteúdo */}
                  {content.is_content_plan ? (
                    // Ícones diferenciados por tipo de plano
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/10 to-primary/5">
                      {content.type === 'reels' ? (
                        <>
                          <Video className="h-8 w-8 text-primary/40" />
                          <span className="text-[8px] text-primary/60 font-medium uppercase">Vídeo</span>
                        </>
                      ) : content.type === 'carousel' ? (
                        <>
                          <Images className="h-8 w-8 text-primary/40" />
                          <span className="text-[8px] text-primary/60 font-medium uppercase">Galeria</span>
                        </>
                      ) : (
                        <>
                          <FileText className="h-8 w-8 text-primary/40" />
                          <span className="text-[8px] text-primary/60 font-medium uppercase">Feed</span>
                        </>
                      )}
                    </div>
                  ) : content.media_path ? (
                    // Imagem principal do conteúdo
                    <img 
                      key={`media-${content.id}`}
                      src={content.media_path}
                      alt={content.title}
                      className="object-cover w-full h-full group-hover:opacity-90 transition-opacity"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const fallback = document.createElement('div');
                          fallback.className = 'w-full h-full flex items-center justify-center bg-muted/50';
                          fallback.innerHTML = '<div class="text-muted-foreground/30">⚠</div>';
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                  ) : (
                    // Placeholder apenas para conteúdos sem mídia
                    <div className="w-full h-full flex items-center justify-center bg-muted/50">
                      <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                  )}
                  
                  {/* Ícone de tipo - Canto inferior esquerdo */}
                  {!content.is_content_plan && content.media_path && (
                    <div className="absolute bottom-1 left-1">
                      {content.type === 'reels' || content.type === 'video' ? (
                        <div className="bg-black/70 backdrop-blur-sm rounded-full p-1">
                          <Video className="h-3 w-3 text-white" />
                        </div>
                      ) : content.type === 'carousel' ? (
                        <div className="bg-black/70 backdrop-blur-sm rounded-full p-1">
                          <Images className="h-3 w-3 text-white" />
                        </div>
                      ) : (
                        <div className="bg-black/70 backdrop-blur-sm rounded-full p-1">
                          <ImageIcon className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Badge de Status - Canto superior direito */}
                  {(() => {
                    const clientStatus = getClientStatus(content);
                    if (!clientStatus) return null;
                    
                    const badgeColors: Record<string, string> = {
                      pending: 'bg-orange-500',
                      producing: 'bg-blue-500',
                      scheduled: 'bg-purple-500',
                      published: 'bg-green-500'
                    };
                    
                    return (
                      <span 
                        className={`absolute top-1 right-1 text-[9px] px-1.5 py-0.5 rounded shadow-sm font-semibold text-white ${badgeColors[clientStatus]}`}
                      >
                        {getStatusLabel(clientStatus)}
                      </span>
                    );
                  })()}
                </div>
              ))}
            </div>

            {/* Dialog Fullscreen - Apenas Mobile */}
            {selectedContent && (
              <Dialog open={!!selectedContent} onOpenChange={() => setSelectedContent(null)}>
                <DialogContent className="max-w-full h-full p-0 gap-0 overflow-hidden">
                  {/* Header fixo com seta voltar e X */}
                  <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50 p-3 flex items-center justify-between">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setSelectedContent(null)}
                      className="h-9 w-9"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    
                    <span className="text-sm font-medium">Conteúdos</span>
                    
                    <DialogClose className="rounded-sm opacity-70 hover:opacity-100 ring-offset-background transition-opacity hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                      <X className="h-5 w-5" />
                      <span className="sr-only">Fechar</span>
                    </DialogClose>
                  </div>
                  
                  {/* Feed com scroll vertical */}
                  <ScrollArea className="h-full snap-y snap-mandatory overflow-y-auto">
                    {filterContentsByStatus(contents).map((content) => (
                      <div 
                        key={content.id} 
                        id={`content-${content.id}`}
                        className="min-h-screen snap-start snap-always flex items-start p-4 border-b border-border/10"
                        style={{ scrollSnapStop: 'always' }}
                      >
                        <ContentCard
                          content={content}
                          isResponsible={content.owner_user_id === userProfile.id}
                          isAgencyView={role === 'agency_admin' || role === 'team_member'}
                          onUpdate={() => {
                            loadContents(userClient.id);
                          }}
                        />
                      </div>
                    ))}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            )}
          </>
        ) : (
          // DESKTOP/TABLET: Grid de 3 colunas com ContentCard completo
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6">
              {filterContentsByStatus(contents).map((content) => (
                <div
                  key={content.id}
                  onClick={(e) => {
                    // Não abrir modal se clicar em botões ou elementos interativos
                    const target = e.target as HTMLElement;
                    if (
                      target.closest('button') ||
                      target.closest('a') ||
                      target.closest('[role="button"]') ||
                      target.closest('input') ||
                      target.closest('textarea') ||
                      target.closest('select')
                    ) {
                      return;
                    }
                    setSelectedContentId(content.id);
                  }}
                  className="cursor-pointer"
                >
                  <ContentCard
                    content={content}
                    isResponsible={content.owner_user_id === userProfile.id}
                    isAgencyView={role === 'agency_admin' || role === 'team_member'}
                    onUpdate={() => {
                      loadContents(userClient.id);
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Modal individual para desktop/tablet */}
            {selectedContentId && (
              <ContentDetailsDialog
                open={!!selectedContentId}
                onOpenChange={(open) => {
                  if (!open) setSelectedContentId(null);
                }}
                contentId={selectedContentId}
                onUpdate={() => {
                  loadContents(userClient.id);
                }}
                isAgencyView={role === 'agency_admin' || role === 'team_member'}
              />
            )}
          </>
        )}

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

        {userClient && (
          <MonthlyContentPlanner
            clientId={userClient.id}
            open={showMonthlyPlanner}
            onOpenChange={setShowMonthlyPlanner}
            onSuccess={() => loadContents(userClient.id)}
          />
        )}

        {/* Assistente de IA - Linha Editorial */}
        {userClient?.agency_id ? (
          <>
            {console.log('[ContentGrid] 🎨 Renderizando EditorialLineAssistant - Agency ID:', userClient.agency_id, 'Open:', showEditorialAssistant)}
            <EditorialLineAssistant
              open={showEditorialAssistant}
              onOpenChange={setShowEditorialAssistant}
              agencyId={userClient.agency_id}
              onContentCreated={() => {
                loadContents(userClient.id);
                setShowEditorialAssistant(false);
              }}
            />
          </>
        ) : (
          console.log('[ContentGrid] ⚠️ EditorialLineAssistant NÃO renderizado - Agency ID:', userClient?.agency_id)
        )}
      </div>
    </AppLayout>
  );
}
