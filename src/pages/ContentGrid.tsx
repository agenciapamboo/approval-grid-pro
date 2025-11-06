import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Lock } from "lucide-react";
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
  const [searchParams] = useSearchParams();
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
  const [approvalToken, setApprovalToken] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [showAllContents, setShowAllContents] = useState(false);
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
    const token = searchParams.get('token');
    if (token) {
      setApprovalToken(token);
      validateTokenAndLoadData(token);
    } else {
      loadPublicData();
    }
  }, [agencySlug, clientSlug, searchParams]);

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

      // Carregar dados do cliente usando as informações do token
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", data.client_id)
        .maybeSingle();

      if (clientError || !clientData) {
        console.error('Error loading client:', clientError);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados do cliente",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setClient(clientData);

      // Carregar agência
      if (clientData.agency_id) {
        const { data: agencyData } = await supabase
          .from("agencies_public")
          .select("*")
          .eq("id", clientData.agency_id)
          .maybeSingle();
        
        if (agencyData) {
          setAgency(agencyData);
        }
      }

      await loadContents(clientData.id, data.month, true);
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
      await loadContents(clientData.id, undefined, false);
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
    console.log('=== loadContents started for client:', clientId);
    
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Session in loadContents:', !!session, 'Token access:', tokenAccess, 'Show all:', showAllContents);
    
    let query = supabase
      .from("contents")
      .select("*")
      .eq("client_id", clientId);
    
    // Com token: mostrar apenas "in_review" (aguardando aprovação)
    if (tokenAccess) {
      console.log('Token access - filtering in_review contents');
      query = query.eq("status", "in_review");
    } 
    // Sem sessão e sem token: mostrar apenas aprovados (visualização pública)
    else if (!session) {
      console.log('No session - filtering only approved contents');
      query = query.eq("status", "approved");
    } 
    // Com sessão de cliente: mostrar apenas in_review por padrão, a menos que showAllContents seja true
    else if (session && !showAllContents) {
      console.log('Client session - showing only in_review contents by default');
      query = query.eq("status", "in_review");
    }
    // Se showAllContents for true, mostrar todos
    else {
      console.log('Session exists - loading all contents');
    }

    // Filtrar por mês se especificado
    if (filterMonth) {
      const [year, month] = filterMonth.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      
      query = query
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString());
    }
    
    const { data, error } = await query.order("date", { ascending: true });

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
  
  // Filtrar pelo mês selecionado
  const filteredContents = selectedMonth ? (groupedContents[selectedMonth] || []) : contents;

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

  // Token inválido ou expirado (com rate limiting)
  if (approvalToken && tokenValid === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-2xl w-full space-y-4">
          {rateLimitError.type ? (
            <RateLimitBlockedAlert
              type={rateLimitError.type}
              message={rateLimitError.message}
              countdown={countdown}
              blockedUntil={rateLimitError.blockedUntil}
              ipAddress={rateLimitError.ipAddress}
              failedAttempts={rateLimitError.failedAttempts}
              attemptsRemaining={rateLimitError.attemptsRemaining}
            />
          ) : (
            <Alert variant="destructive">
              <Lock className="h-4 w-4" />
              <AlertDescription>
                <strong>Link Expirado ou Inválido</strong>
                <p className="mt-2">Este link de aprovação não é mais válido. Links de aprovação expiram após 7 dias.</p>
                <p className="mt-2">Entre em contato com a agência para receber um novo link de aprovação.</p>
              </AlertDescription>
            </Alert>
          )}
          <Button 
            onClick={() => navigate('/')} 
            className="w-full"
          >
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  const isPublicView = !!approvalToken && tokenValid;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mostrar header apenas se NÃO for visualização pública com token */}
      {!isPublicView && (
        <AppHeader 
          userName={profile?.name}
          userRole="Cliente"
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
                  <p className="text-sm text-muted-foreground">Aprovação de Conteúdo</p>
                </div>
              </div>
              <Lock className="h-5 w-5 text-muted-foreground" />
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
              Você está visualizando os conteúdos aguardando aprovação via link temporário. 
              Este link expira em 7 dias a partir do envio.
            </AlertDescription>
          </Alert>
        )}

        {/* Botão para ver todos os conteúdos - apenas quando logado e não em modo de aprovação */}
        {!isPublicView && user && (
          <div className="mb-6 flex gap-3">
            <Button
              variant={!showAllContents ? "default" : "outline"}
              onClick={() => {
                setShowAllContents(false);
                loadContents(client!.id, selectedMonth, false);
              }}
            >
              Pendentes de Aprovação
            </Button>
            <Button
              variant={showAllContents ? "default" : "outline"}
              onClick={() => {
                setShowAllContents(true);
                loadContents(client!.id, selectedMonth, false);
              }}
            >
              Todos os Conteúdos
            </Button>
          </div>
        )}

        {/* Seletor de Mês - desabilitado na visualização pública */}
        {!isPublicView && sortedMonthKeys.length > 0 && (
          <div className="mb-6">
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                loadContents(client!.id, e.target.value, isPublicView);
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
                onUpdate={() => loadContents(client!.id, selectedMonth, isPublicView)}
              />
            ))}
          </div>
        )}
      </main>
      
      <AppFooter />
    </div>
  );
}
