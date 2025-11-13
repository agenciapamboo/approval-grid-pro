import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Lock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { VirtualizedContentGrid } from "@/components/content/VirtualizedContentGrid";
import { ContentFilters } from "@/components/content/ContentFilters";
import { LGPDConsent } from "@/components/lgpd/LGPDConsent";
import { CreateContentWrapper } from "@/components/content/CreateContentWrapper";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { UserProfileDialog } from "@/components/admin/UserProfileDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RateLimitBlockedAlert } from "@/components/admin/RateLimitBlockedAlert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useBatchStorageUrls } from "@/hooks/useBatchStorageUrls";

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
  const { user, session, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [isApprover, setIsApprover] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [showConsent, setShowConsent] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showAllContents, setShowAllContents] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "changes_requested" | "all">("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [rateLimitError, setRateLimitError] = useState<{
    type: 'RATE_LIMIT' | 'IP_BLOCKED_PERMANENT' | 'IP_BLOCKED_TEMPORARY' | 'INVALID_TOKEN' | null;
    message: string;
    blockedUntil?: string;
    ipAddress?: string;
    failedAttempts?: number;
    attemptsRemaining?: number;
    showWarning?: boolean;
    showTemporaryBlockWarning?: boolean;
    showPermanentBlockWarning?: boolean;
  }>({ type: null, message: '' });
  const [countdown, setCountdown] = useState<number>(0);

  // Countdown effect for rate limiting
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Countdown effect for IP block
  useEffect(() => {
    if ((rateLimitError.type === 'IP_BLOCKED_PERMANENT' || rateLimitError.type === 'IP_BLOCKED_TEMPORARY') && rateLimitError.blockedUntil) {
      const updateCountdown = () => {
        const now = new Date().getTime();
        const blockEnd = new Date(rateLimitError.blockedUntil!).getTime();
        const remaining = Math.max(0, Math.floor((blockEnd - now) / 1000));
        setCountdown(remaining);
        
        if (remaining <= 0) {
          setRateLimitError({ type: null, message: '' });
        }
      };
      
      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }
  }, [rateLimitError.type, rateLimitError.blockedUntil]);

  // Check if user is an approver
  useEffect(() => {
    const checkApproverRole = async () => {
      if (!user) {
        setIsApprover(false);
        return;
      }

      console.log('[ContentGrid] Checking if user is approver:', user.id);

      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'approver')
        .maybeSingle();

      if (error) {
        console.error('[ContentGrid] Error checking approver role:', error);
        setIsApprover(false);
        return;
      }

      const hasApproverRole = !!roleData;
      console.log('[ContentGrid] Is approver:', hasApproverRole);
      setIsApprover(hasApproverRole);
    };

    checkApproverRole();
  }, [user]);

  useEffect(() => {
    const initializePage = async () => {
      if (authLoading) {
        console.log('[ContentGrid] Waiting for auth to load...');
        return;
      }

      console.log('[ContentGrid] Initializing page...', { 
        hasUser: !!user, 
        hasSession: !!session,
        isApprover 
      });
      
      // Se tem usuário autenticado, carregar dados
      if (user && session) {
        console.log('[ContentGrid] Authenticated user access');
        await loadPublicData();
        return;
      }
      
      // Sem autenticação = acesso restrito (público)
      console.log('[ContentGrid] Public access - restricted view');
      setLoading(false);
    };
    
    initializePage();
  }, [user, session, authLoading, isApprover, agencySlug, clientSlug]);

  const loadPublicData = async () => {
    try {
      console.log('=== ContentGrid loadPublicData started ===');
      console.log('agencySlug:', agencySlug, 'clientSlug:', clientSlug);
      console.log('User:', user?.id, 'Is Approver:', isApprover);
      
      if (user) {
        // Carregar perfil se logado
        console.log('Loading profile for user:', user.id);
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error loading profile:', profileError);
        } else if (profileData) {
          console.log('Profile loaded:', profileData);
          setProfile(profileData);
          
          // Verificar consentimento LGPD apenas para usuários logados não-aprovadores
          if (!isApprover && !profileData.accepted_terms_at) {
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
          .from("agencies_public")
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
      await loadContents(clientData.id, undefined);
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

  const loadContents = async (clientId: string, filterMonth?: string) => {
    console.log('=== loadContents started for client:', clientId);
    
    console.log('[ContentGrid] Load details:', {
      hasUser: !!user,
      isApprover,
      statusFilter,
      clientId
    });
    
    let query = supabase
      .from("contents")
      .select("*")
      .eq("client_id", clientId);
    
    // CASO 1: Aprovador autenticado (visualização COMPLETA sem filtros)
    // Aprovadores veem TODOS os conteúdos independente de status ou tabs
    if (isApprover) {
      console.log('[ContentGrid] Approver view - showing ALL contents (no filters applied)');
      // Não aplica nenhum filtro de status - aprovadores veem tudo
    }
    // CASO 2: Cliente autenticado via Supabase Auth (visualização COMPLETA)
    else if (user && !isApprover) {
      console.log('[ContentGrid] Authenticated client - showing ALL contents, applying tab filter:', statusFilter);
      
      // Aplicar filtro de status apenas se não for 'all'
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending') {
          query = query.in("status", ["draft", "in_review"]);
        } else if (statusFilter === 'approved') {
          query = query.eq("status", "approved");
        } else if (statusFilter === 'changes_requested') {
          query = query.eq("status", "changes_requested");
        }
      }
      // Se statusFilter === 'all', não aplica filtro de status (mostra todos)
    }
    // CASO 3: Acesso público sem autenticação (apenas aprovados)
    else {
      console.log('[ContentGrid] Public access - showing only approved contents');
      query = query.eq("status", "approved");
    }

    // Filtrar por mês se especificado (exceto para aprovadores que veem todos os meses)
    if (filterMonth && !isApprover) {
      const [year, month] = filterMonth.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      
      query = query
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString());
    }
    
    const { data, error } = await query.order("date", { ascending: false });

    if (error) {
      console.error('[ContentGrid] Error loading contents:', error);
      return;
    }

    console.log('[ContentGrid] Contents fetched:', {
      count: data?.length || 0,
      clientId,
      filterMonth,
      isApprover,
      hasUser: !!user,
      statuses: data?.map(c => c.status)
    });
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
  
  // Para aprovadores: mostrar TODOS os conteúdos SEM filtro de mês
  // Para outros: filtrar pelo mês selecionado
  const filteredContents = useMemo(() => {
    if (isApprover) {
      // Aprovadores veem todos os conteúdos sem filtro de mês
      return contents;
    }
    // Outros usuários veem apenas do mês selecionado
    return groupedContents[selectedMonth] || [];
  }, [contents, selectedMonth, isApprover, groupedContents]);

  // Contar conteúdos por status
  const statusCounts = useMemo(() => {
    const counts = {
      pending: 0,
      approved: 0,
      changes: 0,
      total: filteredContents.length
    };

    filteredContents.forEach(content => {
      if (content.status === 'draft' || content.status === 'in_review') {
        counts.pending++;
      } else if (content.status === 'approved') {
        counts.approved++;
      } else if (content.status === 'changes_requested') {
        counts.changes++;
      }
    });

    return counts;
  }, [filteredContents]);

  // Coletar todos os file paths das mídias para batch loading
  const mediaFilePaths = useMemo(() => {
    const paths: (string | null | undefined)[] = [];
    filteredContents.forEach(content => {
      // Buscar mídias desse conteúdo (será feito async no hook)
      // Por ora, retornar array vazio para inicializar hook
    });
    return paths;
  }, [filteredContents]);

  // Carregar URLs das mídias em batch
  const [mediaData, setMediaData] = useState<Array<{ content_id: string; src_url: string; thumb_url?: string }>>([]);
  
  useEffect(() => {
    async function loadAllMedia() {
      if (filteredContents.length === 0) return;
      
      const contentIds = filteredContents.map(c => c.id);
      const { data, error } = await supabase
        .from("content_media")
        .select("content_id, src_url, thumb_url")
        .in("content_id", contentIds);
      
      if (!error && data) {
        setMediaData(data);
      }
    }
    loadAllMedia();
  }, [filteredContents]);

  const allMediaPaths = useMemo(() => {
    const paths: (string | null | undefined)[] = [];
    mediaData.forEach(media => {
      // Extrair path do src_url
      const srcPath = media.src_url?.includes('/content-media/')
        ? media.src_url.split('/content-media/')[1]
        : media.src_url;
      paths.push(srcPath);
      
      // Extrair path do thumb_url
      if (media.thumb_url) {
        const thumbPath = media.thumb_url?.includes('/content-media/')
          ? media.thumb_url.split('/content-media/')[1]
          : media.thumb_url;
        paths.push(thumbPath);
      }
    });
    return paths;
  }, [mediaData]);

  const { urls: mediaUrls, loading: mediaLoading } = useBatchStorageUrls({
    bucket: 'content-media',
    filePaths: allMediaPaths,
    expiresIn: 3600,
  });

  // Debug: Log state changes
  useEffect(() => {
    console.log('[ContentGrid] State changed:', {
      loading,
      contentsCount: filteredContents.length,
      isApprover,
      rateLimitError: rateLimitError.type
    });
    
    if (!loading && filteredContents.length > 0) {
      console.log('[ContentGrid] Contents visible:', filteredContents.length, 'contents');
      console.log('[ContentGrid] First content:', filteredContents[0]);
    } else if (!loading && filteredContents.length === 0) {
      console.warn('[ContentGrid] No contents found after loading');
    }
  }, [filteredContents, loading, isApprover, rateLimitError.type]);

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

  // Mostrar "Acesso Restrito" APENAS se NÃO houver usuário logado
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-2xl w-full space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-xl">Acesso Restrito</CardTitle>
                  <CardDescription>Autenticação necessária</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {rateLimitError.type && (
                <Alert variant={rateLimitError.type === 'IP_BLOCKED_PERMANENT' ? 'destructive' : 'default'}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{rateLimitError.message}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  Esta página requer autenticação para acesso.
                </p>
                <p className="text-sm text-muted-foreground">
                  Faça login via 2FA para continuar.
                </p>
              </div>

              <div className="pt-4 border-t">
                <Button
                  onClick={() => navigate('/aprovar')}
                  className="w-full"
                >
                  Fazer Login 2FA
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header padrão */}
      <AppHeader 
        userName={isApprover ? "Aprovador" : (client?.name || "Cliente")}
        userRole={isApprover ? "Aprovador de Conteúdo" : (agency ? `Cliente ${agency.name}` : "Cliente")}
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
        {/* Aviso para aprovadores */}
        {isApprover && (
          <Alert className="mb-6">
            <AlertDescription>
              Você está visualizando como aprovador. Pode ver todos os conteúdos sem restrição de período ou status.
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs de filtro por status - apenas para não-aprovadores */}
        {!isApprover && user && (
          <div className="mb-6">
            <Tabs value={statusFilter} onValueChange={(value: any) => {
              setStatusFilter(value);
              loadContents(client!.id, selectedMonth);
            }}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  Pendentes
                  <Badge variant="pending" className="ml-1">
                    {statusCounts.pending}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="approved" className="flex items-center gap-2">
                  Aprovados
                  <Badge variant="success" className="ml-1">
                    {statusCounts.approved}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="changes_requested" className="flex items-center gap-2">
                  Ajustes
                  <Badge variant="warning" className="ml-1">
                    {statusCounts.changes}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="all" className="flex items-center gap-2">
                  Todos
                  <Badge variant="outline" className="ml-1">
                    {statusCounts.total}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Seletor de Mês - desabilitado para aprovadores */}
        {!isApprover && sortedMonthKeys.length > 0 && (
          <div className="mb-6">
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                loadContents(client!.id, e.target.value);
              }}
              className="px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {sortedMonthKeys.map((monthKey) => {
                const [year, month] = monthKey.split('-');
                const monthDate = new Date(parseInt(year), parseInt(month) - 1);
                const monthName = monthDate.toLocaleDateString('pt-BR', { 
                  month: 'long', 
                  year: 'numeric' 
                });
                return (
                  <option key={monthKey} value={monthKey}>
                    {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {filteredContents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum conteúdo encontrado
          </div>
        ) : (
          <VirtualizedContentGrid
            contents={filteredContents}
            mediaUrls={mediaUrls}
            isResponsible={false}
            isAgencyView={false}
            isPublicApproval={isApprover}
            sessionToken={undefined}
            onUpdate={() => {
              loadContents(client!.id, selectedMonth);
            }}
            blockSize={9}
          />
        )}
      </main>
      
      <AppFooter />
    </div>
  );
}
