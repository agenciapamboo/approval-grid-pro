import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Lock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ContentCard } from "@/components/content/ContentCard";
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
import { useUserData } from "@/hooks/useUserData";

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
  agency_id?: string;
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
}

type MinimalClientRow = {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  agency_id?: string | null;
};

export default function ContentGrid() {
  const { agencySlug, clientSlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile: userProfile, role, agency: userAgency, client: userClient, loading: userDataLoading } = useUserData();
  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState<'auth' | 'profile' | 'contents' | 'done'>('auth');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [showConsent, setShowConsent] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showAllContents, setShowAllContents] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "changes_requested" | "all">("pending");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const tokenMonth = searchParams.get('month');
    if (tokenMonth && /^\d{4}-\d{2}$/.test(tokenMonth)) {
      return tokenMonth;
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [debugMode, setDebugMode] = useState(false);
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

  // Debug mode handler (Ctrl + Shift + D)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setDebugMode(prev => !prev);
        console.log('[ContentGrid] Debug mode:', !debugMode);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [debugMode]);

  useEffect(() => {
    console.log('[ContentGrid] Initial load effect - START');
    loadPublicData();
  }, []);

  const loadPublicData = async () => {
    try {
      console.log('[ContentGrid] loadPublicData started');
      console.log('[ContentGrid] agencySlug:', agencySlug, 'clientSlug:', clientSlug);
      console.log('[ContentGrid] userProfile:', userProfile, 'role:', role);
      
      // Verificar se há sessão ativa (opcional)
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[ContentGrid] Session exists:', !!session);
      
      if (session) {
        setUser(session.user);
        
        // Usar dados do hook useUserData
        if (userProfile) {
          console.log('[ContentGrid] Using profile from useUserData:', userProfile);
          setProfile(userProfile as any);
          
          // Verificar consentimento LGPD apenas para usuários logados
          if (!(userProfile as any).accepted_terms_at) {
            console.log('[ContentGrid] User needs to accept terms');
            setShowConsent(true);
            return;
          }
          
          // Usar agency e client do hook
          if (userAgency) {
            setAgency(userAgency as any);
          }
          if (userClient) {
            setClient(userClient as any);
          }
        }
      }

      // Carregar dados da agência e cliente usando filtros DIRETOS
      let finalAgency = userAgency as any;
      let finalClient = userClient as any;
      
      // Se não tem dados do hook, carregar pelo slug
      if (!finalAgency && agencySlug) {
        console.log('[ContentGrid] Loading agency by slug:', agencySlug);
        const { data: agencyData } = await supabase
          .from("agencies_public")
          .select("*")
          .eq("slug", agencySlug)
          .maybeSingle();
        
        if (agencyData) {
          finalAgency = agencyData;
          setAgency(agencyData);
        }
      }
      
     const normalizeClient = (data: MinimalClientRow): Client => ({
        id: data.id,
        name: data.name,
        slug: data.slug,
        logo_url: data.logo_url || undefined,
        agency_id: data.agency_id || undefined,
      });
      
      if (!finalClient && clientSlug) {
        console.log('[ContentGrid] Loading client by slug:', clientSlug);
        const { data: secureClient, error: secureError } = await supabase
          .from('clients_secure')
          .select('id, name, slug, logo_url, agency_id')
          .eq('slug', clientSlug)
          .maybeSingle();

        if (secureError) {
          console.warn('[ContentGrid] clients_secure lookup failed, falling back to public view:', secureError);
        }

        if (secureClient) {
          const normalized = normalizeClient(secureClient);
          finalClient = normalized;
          setClient(normalized);
        } else {
          const { data: publicClient, error: publicError } = await supabase
            .from('clients_public')
            .select('id, name, slug, logo_url')
            .eq('slug', clientSlug)
            .maybeSingle();

          if (publicError) {
            console.error('[ContentGrid] clients_public lookup failed:', publicError);
          }

          if (publicClient) {
            const normalized = normalizeClient(publicClient);
            finalClient = normalized;
            setClient(normalized);
          }
        }
      }
      
      // Usar client_id do profile se role = client_user
      if (role === 'client_user' && userProfile?.client_id && !finalClient) {
        console.log('[ContentGrid] Loading client by profile.client_id:', userProfile.client_id);
         const { data: secureClient, error: secureError } = await supabase
          .from('clients_secure')
          .select('id, name, slug, logo_url, agency_id')
          .eq('id', userProfile.client_id)
          .maybeSingle();

        if (secureError) {
          console.warn('[ContentGrid] clients_secure lookup by id failed, falling back to public view:', secureError);
        }

        if (secureClient) {
          const normalized = normalizeClient(secureClient);
          finalClient = normalized;
          setClient(normalized);
        } else {
          const { data: publicClient, error: publicError } = await supabase
            .from('clients_public')
            .select('id, name, slug, logo_url')
            .eq('id', userProfile.client_id)
            .maybeSingle();

          if (publicError) {
            console.error('[ContentGrid] clients_public lookup by id failed:', publicError);
          }

          if (publicClient) {
            const normalized = normalizeClient(publicClient);
            finalClient = normalized;
            setClient(normalized);
          }
        }
      }

      if (!finalClient) {
        console.error('[ContentGrid] No client found');
        toast({
          title: "Cliente não encontrado",
          description: "Não foi possível carregar o cliente.",
          variant: "destructive",
        });
        return;
      }

      console.log('[ContentGrid] Final client:', finalClient);
      await loadContents(finalClient.id, selectedMonth);
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
    console.log('[ContentGrid] loadContents - clientId:', clientId, 'role:', role);

    const { data: { session } } = await supabase.auth.getSession();
    console.log('[ContentGrid] Session:', !!session);

    const profileAgencyId = profile?.agency_id
      ?? (userProfile as Profile | null)?.agency_id
      ?? userAgency?.id
      ?? agency?.id
      ?? null;

    const profileClientId = profile?.client_id
      ?? (userProfile as Profile | null)?.client_id
      ?? userClient?.id
      ?? client?.id
      ?? clientId;

    let query = supabase
      .from('contents')
      .select(`
        id,
        title,
        status,
        date,
        deadline,
        type,
        client_id,
        owner_user_id,
        version,
        created_at,
        updated_at,
        channels,
        published_at
      `)
      .order('date', { ascending: false });

    if (role === 'super_admin') {
      // acesso total
    } else if (role === 'agency_admin') {
      if (profileAgencyId) {
        // Filtrar por agency_id através da junção com clients
        const { data: agencyClients } = await supabase
          .from('clients')
          .select('id')
          .eq('agency_id', profileAgencyId);
        
        if (agencyClients && agencyClients.length > 0) {
          const clientIds = agencyClients.map(c => c.id);
          query = query.in('client_id', clientIds);
        }
      } else if (clientId) {
        query = query.eq('client_id', clientId);
      }
    } else if (role === 'client_user' || role === 'approver') {
      if (!profileClientId) {
        console.error('[ContentGrid] ERRO: client_user sem client_id no profile!', {
          userId: user?.id,
          role,
          profile: userProfile
        });
        
        toast({
          title: "Configuração Incompleta",
          description: "Seu perfil não está vinculado a um cliente. Entre em contato com o suporte.",
          variant: "destructive",
        });
        
        setContents([]);
        setLoading(false);
        return;
      }
      
      console.log('[ContentGrid] Filtering contents for client_user:', {
        clientId: profileClientId,
        role
      });
      
      query = query.eq('client_id', profileClientId);
    } else if (clientId) {
      query = query.eq('client_id', clientId);
    }

      // Aplicar filtro de status
      if (session && role === 'client_user') {
      // Client User autenticado: ver TODOS os status (não aplicar filtro)
      console.log('[ContentGrid] Client user - mostrando todos os status');
      
    } else if (statusFilter && statusFilter !== 'all') {
      // Outros roles com filtro
      console.log('[ContentGrid] Aplicando filtro de status:', statusFilter);
      
      if (statusFilter === 'pending') {
        query = query.in('status', ['draft', 'in_review']);
      } else if (statusFilter === 'approved') {
        query = query.eq('status', 'approved');
      } else if (statusFilter === 'changes_requested') {
        query = query.eq('status', 'changes_requested');
      }
    }

    if (filterMonth) {
      const [year, month] = filterMonth.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

      query = query
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString());
    }

    const { data, error } = await query
      .order('scheduled_at', { ascending: false, nullsFirst: true })
      .order('date', { ascending: false });

    if (error) {
      console.error('[ContentGrid] ERRO ao carregar conteúdos:', {
        error,
        role,
        clientId: profileClientId,
        userId: user?.id
      });
      
      toast({
        title: "Erro ao Carregar Conteúdos",
        description: error.message || "Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
      return;
    }

    console.log('[ContentGrid] Conteúdos carregados com sucesso:', {
      total: data?.length || 0,
      role,
      clientId: profileClientId,
      statuses: [...new Set(data?.map(c => c.status) || [])]
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

  const resolveContentDate = (content: Content) => {
    const raw = content.scheduled_at || content.date || content.created_at;
    if (!raw) return new Date();
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  // Agrupar conteúdos por mês
  const groupedContents = contents.reduce((groups, content) => {
    const date = resolveContentDate(content);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(content);
    return groups;
  }, {} as Record<string, Content[]>);

  const sortedMonthKeys = Object.keys(groupedContents).sort((a, b) => b.localeCompare(a));
  
  // Filtrar pelo mês selecionado
  const filteredContents = selectedMonth ? (groupedContents[selectedMonth] || []) : contents;

  // Calcular contadores de status
  const statusCounts = contents.reduce((acc, content) => {
    if (content.status === 'draft' || content.status === 'in_review') {
      acc.pending = (acc.pending || 0) + 1;
    } else if (content.status === 'approved') {
      acc.approved = (acc.approved || 0) + 1;
    } else if (content.status === 'changes_requested') {
      acc.changes = (acc.changes || 0) + 1;
    }
    acc.total = (acc.total || 0) + 1;
    return acc;
  }, { pending: 0, approved: 0, changes: 0, total: 0 });

  // Debug: Log state changes
  useEffect(() => {
    console.log('[ContentGrid] State changed:', {
      loading,
      contentsCount: filteredContents.length,
      rateLimitError: rateLimitError.type
    });
    
    if (!loading && filteredContents.length > 0) {
      console.log('[ContentGrid] Contents visible:', filteredContents.length, 'contents');
      console.log('[ContentGrid] First content:', filteredContents[0]);
    } else if (!loading && filteredContents.length === 0) {
      console.warn('[ContentGrid] No contents found after loading');
    }
  }, [filteredContents, loading, rateLimitError.type]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              {loadingStage === 'auth' && 'Verificando autenticação...'}
              {loadingStage === 'profile' && 'Carregando seu perfil...'}
              {loadingStage === 'contents' && 'Carregando conteúdos...'}
              {loadingStage === 'done' && 'Finalizando...'}
            </p>
          </div>
        </Card>
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
                  Faça login para continuar.
                </p>
              </div>

              <div className="pt-4 border-t">
                <Button onClick={() => navigate('/auth')} className="w-full">
                  Fazer Login
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
      <AppHeader 
        userName={client?.name}
        userRole={agency ? `Cliente ${agency.name}` : "Cliente"}
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

        {/* Tabs de filtro por status - apenas quando logado e não em modo de aprovação */}
        {user && (
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

        {/* Seletor de Mês - desabilitado na visualização pública */}
        {sortedMonthKeys.length > 0 && (
          <div className="mb-6">
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                if (!client) return;
                loadContents(client.id, e.target.value);
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

        {/* Debug Mode Info */}
        {debugMode && (
          <Card className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-950 border-yellow-200">
            <div className="text-xs font-mono">
              <div className="font-bold mb-2">🐛 Debug Mode (Ctrl+Shift+D para desativar)</div>
              <pre className="overflow-auto">
                {JSON.stringify({
                  role,
                  userId: user?.id,
                  profileClientId: userProfile?.client_id,
                  clientId: client?.id,
                  totalContents: contents.length,
                  filteredContents: filteredContents.length,
                  selectedMonth,
                  statusFilter,
                  statuses: [...new Set(contents.map(c => c.status))],
                  loadingStage
                }, null, 2)}
              </pre>
            </div>
          </Card>
        )}

        {filteredContents.length === 0 ? (
          role === 'client_user' ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Nenhum Conteúdo Encontrado</h3>
                  <p className="text-muted-foreground max-w-md">
                    Sua agência ainda não criou conteúdos para este período.
                    {selectedMonth && ` Tente selecionar outro mês ou aguarde novos conteúdos.`}
                  </p>
                </div>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Entre em contato com sua agência para solicitar novos conteúdos.
                  </AlertDescription>
                </Alert>
              </div>
            </Card>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum conteúdo encontrado para este mês
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContents.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                isResponsible={false}
                isAgencyView={false}
                onUpdate={() => {
                  if (!client) return;
                  loadContents(client.id, selectedMonth);
                }}
              />
            ))}
          </div>
        )}
      </main>
      
      <AppFooter />
    </div>
  );
}
