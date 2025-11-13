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

export default function ContentGrid() {
  const { agencySlug, clientSlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile: userProfile, role, agency: userAgency, client: userClient, loading: userDataLoading } = useUserData();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [showConsent, setShowConsent] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [approvalToken, setApprovalToken] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [sessionData, setSessionData] = useState<{
    client_id: string;
    client_name: string;
    client_slug: string;
    client_logo_url?: string;
    approver_name: string;
    approver_email: string;
    is_primary: boolean;
  } | null>(null);
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


  useEffect(() => {
    const initializePage = async () => {
      console.log('[ContentGrid] Initializing page...');
      
      // 1. PRIORIDADE: Verificar session_token 2FA PRIMEIRO
      const sessionTkn = searchParams.get('session_token');
      if (sessionTkn) {
        console.log('[ContentGrid] 2FA session-based access (priority) - validating session:', sessionTkn.substring(0, 10) + '...');
        setSessionToken(sessionTkn);
        await validateSessionAndLoadData(sessionTkn);
        return; // Session token tem prioridade máxima, encerra aqui
      }
      
      // 2. PRIORIDADE 2: Verificar token de aprovação
      const token = searchParams.get('token');
      if (token) {
        console.log('[ContentGrid] Token-based access - validating token:', token.substring(0, 10) + '...');
        setApprovalToken(token);
        await validateTokenAndLoadData(token);
        return; // Token tem prioridade, encerra aqui
      }
      
      // 3. Se não tem token, verificar sessão autenticada
      const { data: { session } } = await supabase.auth.getSession();
      
    // 4. Se tem sessão, carregar dados via autenticação
    if (session) {
      console.log('[ContentGrid] Authenticated access - loading via session');
      setUser(session.user);
      setTokenValid(true); // Marcar como válido para usuários autenticados
      await loadPublicData();
      return;
    }
      
      // 5. Sem token e sem sessão = acesso restrito
      console.log('[ContentGrid] No authentication and no token - restricted access');
      setTokenValid(false);
      setLoading(false);
    };
    
    initializePage();
  }, [agencySlug, clientSlug, searchParams]);

  const validateSessionAndLoadData = async (sessionTkn: string) => {
    try {
      console.log('=== Validating 2FA client session ===');
      setRateLimitError({ type: null, message: '' });
      
      // Call the edge function to validate session
      const { data, error } = await supabase.functions.invoke('validate-client-session', {
        body: { session_token: sessionTkn }
      });

      if (error) {
        console.error('Session validation error:', error);
        setTokenValid(false);
        setLoading(false);
        
        toast({
          title: "Sessão inválida",
          description: "Sua sessão expirou ou é inválida. Faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      if (!data || !data.valid) {
        console.error('Session validation failed:', data);
        setTokenValid(false);
        setLoading(false);
        toast({
          title: "Sessão expirada",
          description: data?.error || "Sua sessão expirou. Faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      console.log('Session validated successfully:', data);
      setTokenValid(true);
      
      // Store session data
      setSessionData({
        client_id: data.client.id,
        client_name: data.client.name,
        client_slug: data.client.slug,
        client_logo_url: data.client.logo_url,
        approver_name: data.approver.name,
        approver_email: data.approver.email,
        is_primary: data.approver.is_primary
      });

      // Set client data
      setClient({
        id: data.client.id,
        name: data.client.name,
        slug: data.client.slug,
        logo_url: data.client.logo_url || undefined,
        agency_id: ''
      } as any);

      // Load agency from public table via slug
      if (agencySlug) {
        const { data: agencyData } = await supabase
          .from('agencies_public')
          .select('*')
          .eq('slug', agencySlug)
          .maybeSingle();
        if (agencyData) setAgency(agencyData);
      }

      // Fetch contents for this client
      await loadContents(data.client.id, undefined, true);
    } catch (error) {
      console.error("Error validating session:", error);
      setTokenValid(false);
      toast({
        title: "Erro",
        description: "Erro ao validar a sessão",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSessionLogout = async () => {
    if (!sessionToken) return;

    try {
      console.log('=== Logging out 2FA session ===');
      
      // Expirar a sessão no banco de dados
      const { error } = await supabase
        .from("client_sessions")
        .update({ expires_at: new Date().toISOString() })
        .eq("session_token", sessionToken);

      if (error) {
        console.error('Error expiring session:', error);
        toast({
          title: "Erro ao encerrar sessão",
          description: "Ocorreu um erro ao encerrar sua sessão.",
          variant: "destructive",
        });
        return;
      }

      console.log('Session expired successfully');
      
      // Limpar estados locais
      setSessionToken(null);
      setSessionData(null);
      setTokenValid(false);
      setContents([]);
      
      toast({
        title: "Sessão encerrada",
        description: "Você foi desconectado com sucesso.",
      });

      // Redirecionar para a página de aprovação
      navigate("/aprovar");
    } catch (error) {
      console.error('Error during logout:', error);
      toast({
        title: "Erro",
        description: "Erro ao encerrar a sessão",
        variant: "destructive",
      });
    }
  };

  const validateTokenAndLoadData = async (token: string) => {
    try {
      console.log('=== Validating approval token with rate limiting ===');
      setRateLimitError({ type: null, message: '' });
      
      // Call the edge function with rate limiting
      const { data, error } = await supabase.functions.invoke('validate-approval-token', {
        body: { token }
      });

      if (error) {
        console.error('Token validation error:', error);
        setTokenValid(false);
        setLoading(false);
        
        // Try to parse error message as JSON
        let errorData: any = {};
        try {
          errorData = typeof error.message === 'string' ? JSON.parse(error.message) : error;
        } catch {
          errorData = { error: error.message };
        }
        
        // Handle rate limiting errors
        if (errorData.error === 'IP_BLOCKED_PERMANENT' || errorData.error === 'IP_BLOCKED_TEMPORARY') {
          setRateLimitError({
            type: errorData.error,
            message: errorData.message || 'Seu IP foi bloqueado.',
            blockedUntil: errorData.blocked_until,
            ipAddress: errorData.ip_address,
            failedAttempts: errorData.failed_attempts
          });
          return;
        }
        
        if (errorData.error === 'RATE_LIMIT_EXCEEDED') {
          setRateLimitError({
            type: 'RATE_LIMIT',
            message: errorData.message || 'Limite de tentativas excedido.',
            attemptsRemaining: errorData.attempts_remaining
          });
          setCountdown(errorData.retry_after || 60);
          return;
        }
        
        if (errorData.error === 'INVALID_TOKEN') {
          setRateLimitError({
            type: 'INVALID_TOKEN',
            message: 'Token inválido ou expirado.',
            failedAttempts: errorData.failed_attempts,
            attemptsRemaining: errorData.attempts_remaining
          });
          return;
        }
        
        // Generic error
        toast({
          title: "Erro ao validar token",
          description: errorData.message || "Ocorreu um erro ao validar o link de aprovação.",
          variant: "destructive",
        });
        return;
      }

      if (!data || !data.success) {
        console.error('Token validation failed:', data);
        setTokenValid(false);
        setLoading(false);
        toast({
          title: "Link inválido ou expirado",
          description: "Este link de aprovação não é mais válido. Entre em contato com a agência.",
          variant: "destructive",
        });
        return;
      }

      console.log('Token validated successfully:', data);
      setTokenValid(true);
      setRateLimitError({ type: null, message: '' });
      setSelectedMonth(data.month);

      // Load client from public table (no RLS)
      try {
        const { data: clientPub, error: clientPubErr } = await supabase
          .from('clients_public')
          .select('*')
          .eq('id', data.client_id)
          .maybeSingle();

        if (clientPub) {
          setClient({
            id: clientPub.id,
            name: clientPub.name,
            slug: clientPub.slug,
            logo_url: clientPub.logo_url || undefined,
            agency_id: ''
          } as any);
        } else {
          // Fallback: use data from token validation
          setClient({
            id: data.client_id,
            name: data.client_name,
            slug: data.client_slug,
            logo_url: undefined,
            agency_id: ''
          } as any);
        }

        // Load agency from public table via slug
        if (agencySlug) {
          const { data: agencyData } = await supabase
            .from('agencies_public')
            .select('*')
            .eq('slug', agencySlug)
            .maybeSingle();
          if (agencyData) setAgency(agencyData);
        }
      } catch (e) {
        console.warn('[ContentGrid] Public client/agency fetch skipped due to error:', e);
      }

      // Carregar conteúdos da conta do cliente validado
      await loadContents(data.client_id, data.month, true);
    } catch (error) {
      console.error("Error validating token:", error);
      setTokenValid(false);
      toast({
        title: "Erro",
        description: "Erro ao validar o link de aprovação",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

      if (!finalClient && clientSlug) {
        console.log('[ContentGrid] Loading client by slug:', clientSlug);
        const { data: clientData } = await supabase
          .from("clients")
          .select("*")
          .eq("slug", clientSlug)
          .maybeSingle();

        if (clientData) {
          finalClient = clientData;
          setClient(clientData);
        }
      }
      
      // Usar client_id do profile se role = client_user
      if (role === 'client_user' && userProfile?.client_id && !finalClient) {
        console.log('[ContentGrid] Loading client by profile.client_id:', userProfile.client_id);
        const { data: clientData } = await supabase
          .from("clients")
          .select("*")
          .eq("id", userProfile.client_id)
          .single();
        
        if (clientData) {
          finalClient = clientData;
          setClient(clientData);
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
      await loadContents(finalClient.id, selectedMonth, false);
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

  const loadContents = async (clientId: string, filterMonth?: string, tokenAccess: boolean = false) => {
    console.log('[ContentGrid] loadContents - clientId:', clientId, 'role:', role);

    const { data: { session } } = await supabase.auth.getSession();
    console.log('[ContentGrid] Session:', !!session, 'Token access:', tokenAccess);

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

    if (tokenAccess) {
      query = query.eq('client_id', clientId);
    } else if (role === 'super_admin') {
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
      if (profileClientId) {
        query = query.eq('client_id', profileClientId);
      } else {
        console.warn('[ContentGrid] No client_id available for client user');
        setContents([]);
        return;
      }
    } else if (clientId) {
      query = query.eq('client_id', clientId);
    }

    if (tokenAccess) {
      console.log('[ContentGrid] Token access - filtering draft and in_review contents');
      query = query.in('status', ['draft', 'in_review']);
    } else if (!session) {
      console.log('No session - filtering only approved contents');
      query = query.eq('status', 'approved');
    } else if (statusFilter !== 'all') {
      console.log('Client session - applying status filter:', statusFilter);
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
      console.error('[ContentGrid] Error loading contents:', error);
      return;
    }

    console.log('[ContentGrid] Contents fetched:', {
      count: data?.length || 0,
      clientId,
      filterMonth,
      tokenAccess,
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
      tokenValid,
      hasToken: !!approvalToken,
      rateLimitError: rateLimitError.type
    });
    
    if (!loading && filteredContents.length > 0) {
      console.log('[ContentGrid] Contents visible:', filteredContents.length, 'contents');
      console.log('[ContentGrid] First content:', filteredContents[0]);
    } else if (!loading && filteredContents.length === 0) {
      console.warn('[ContentGrid] No contents found after loading');
    }
  }, [filteredContents, loading, tokenValid, approvalToken, rateLimitError.type]);

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

  // Mostrar "Acesso Restrito" APENAS se NÃO houver usuário logado E NÃO houver token válido E NÃO houver sessão 2FA
  const hasUser = !!user;
  const hasValidToken = approvalToken && tokenValid === true;
  const hasValidSession = sessionToken && tokenValid === true;
  
  if (!hasUser && !hasValidToken && !hasValidSession) {
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
                  {sessionToken 
                    ? 'Sua sessão expirou ou é inválida.'
                    : approvalToken 
                      ? 'O link de aprovação que você está usando é inválido ou expirou.'
                      : 'Esta página requer autenticação ou um link de aprovação válido para acesso.'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {sessionToken 
                    ? 'Faça login novamente para continuar.'
                    : 'Links de aprovação têm validade de 7 dias e são enviados por email pela agência.'}
                </p>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Precisa de acesso?</p>
                <p className="text-sm text-muted-foreground">
                  Entre em contato com sua agência para solicitar um novo link de aprovação.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isPublicView = (!!approvalToken && tokenValid) || (!!sessionToken && tokenValid);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mostrar header apenas se NÃO for visualização pública com token */}
      {!isPublicView && (
        <AppHeader 
          userName={client?.name}
          userRole={agency ? `Cliente ${agency.name}` : "Cliente"}
          onProfileClick={() => setShowProfileDialog(true)}
          onSignOut={handleSignOut}
        />
      )}

      {/* Cabeçalho especial para visualização pública */}
      {isPublicView && (
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {agency?.logo_url && (
                  <img 
                    src={agency.logo_url} 
                    alt={agency.name} 
                    className="h-10 w-auto"
                  />
                )}
                <div>
                  <h1 className="text-lg font-semibold">{client?.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {sessionData ? `Aprovador: ${sessionData.approver_name}` : 'Aprovação de Conteúdo'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-muted-foreground" />
                {sessionToken && sessionData && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSessionLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

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
        {/* Aviso de acesso via link */}
        {isPublicView && (
          <Alert className="mb-6">
            <AlertDescription>
              {sessionToken 
                ? `Você está logado como ${sessionData?.approver_name}. Sua sessão expira em algumas horas.`
                : 'Você está visualizando os conteúdos aguardando aprovação via link temporário. Este link expira em 7 dias a partir do envio.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs de filtro por status - apenas quando logado e não em modo de aprovação */}
        {!isPublicView && user && (
          <div className="mb-6">
            <Tabs value={statusFilter} onValueChange={(value: any) => {
              setStatusFilter(value);
              loadContents(client!.id, selectedMonth, false);
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
        {!isPublicView && sortedMonthKeys.length > 0 && (
          <div className="mb-6">
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                if (!client) return;
                loadContents(client.id, e.target.value, isPublicView);
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
            {isPublicView 
              ? "Nenhum conteúdo aguardando aprovação neste período" 
              : "Nenhum conteúdo encontrado para este mês"
            }
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContents.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                isResponsible={false}
                isAgencyView={false}
                isPublicApproval={isPublicView}
                approvalToken={approvalToken || undefined}
                onUpdate={() => {
                  if (!client) return;
                  loadContents(client.id, selectedMonth, isPublicView);
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
