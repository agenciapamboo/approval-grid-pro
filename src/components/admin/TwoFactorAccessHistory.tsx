import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Globe, 
  User, 
  Building2,
  RefreshCw,
  Search,
  Calendar,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AccessAttempt {
  id: string;
  code: string;
  identifier: string;
  identifier_type: string;
  created_at: string;
  used_at: string | null;
  expires_at: string;
  ip_address: string | null;
  user_agent: string | null;
  approver_name: string | null;
  approver_email: string | null;
  client_name: string | null;
  client_slug: string | null;
  is_success: boolean;
  is_expired: boolean;
}

type FilterStatus = "all" | "success" | "failed" | "expired";

interface TwoFactorAccessHistoryProps {
  agencyId?: string;
}

export function TwoFactorAccessHistory({ agencyId }: TwoFactorAccessHistoryProps = {}) {
  const [attempts, setAttempts] = useState<AccessAttempt[]>([]);
  const [filteredAttempts, setFilteredAttempts] = useState<AccessAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "all">("week");
  const { toast } = useToast();

  const loadAccessHistory = async () => {
    try {
      setLoading(true);
      
      // Calcular data inicial baseado no filtro
      let startDate = new Date();
      switch (dateRange) {
        case "today":
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case "all":
          startDate = new Date(0); // Início dos tempos
          break;
      }

      // Buscar tentativas de acesso com joins - filtrar por agência se fornecido
      let query = supabase
        .from("two_factor_codes")
        .select(`
          id,
          code,
          identifier,
          identifier_type,
          created_at,
          used_at,
          expires_at,
          ip_address,
          user_agent,
          client_approvers (
            name,
            email
          ),
          clients!inner (
            name,
            slug,
            agency_id
          )
        `)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (agencyId) {
        query = query.eq('clients.agency_id', agencyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const now = new Date();
      const transformedData: AccessAttempt[] = (data || []).map((attempt: any) => {
        const expiresAt = new Date(attempt.expires_at);
        const isExpired = expiresAt < now && !attempt.used_at;
        const isSuccess = !!attempt.used_at;

        return {
          id: attempt.id,
          code: attempt.code,
          identifier: attempt.identifier,
          identifier_type: attempt.identifier_type,
          created_at: attempt.created_at,
          used_at: attempt.used_at,
          expires_at: attempt.expires_at,
          ip_address: attempt.ip_address,
          user_agent: attempt.user_agent,
          approver_name: attempt.client_approvers?.name || null,
          approver_email: attempt.client_approvers?.email || null,
          client_name: attempt.clients?.name || null,
          client_slug: attempt.clients?.slug || null,
          is_success: isSuccess,
          is_expired: isExpired,
        };
      });

      setAttempts(transformedData);
      applyFilters(transformedData, searchTerm, statusFilter);
    } catch (error: any) {
      console.error("Error loading access history:", error);
      toast({
        title: "Erro ao carregar histórico",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccessHistory();
  }, [dateRange]);

  useEffect(() => {
    applyFilters(attempts, searchTerm, statusFilter);
  }, [searchTerm, statusFilter, attempts]);

  const applyFilters = (
    data: AccessAttempt[],
    search: string,
    status: FilterStatus
  ) => {
    let filtered = [...data];

    // Filtro de status
    if (status !== "all") {
      filtered = filtered.filter((attempt) => {
        if (status === "success") return attempt.is_success;
        if (status === "failed") return !attempt.is_success && !attempt.is_expired;
        if (status === "expired") return attempt.is_expired;
        return true;
      });
    }

    // Filtro de busca
    if (search.trim()) {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        (attempt) =>
          attempt.approver_name?.toLowerCase().includes(term) ||
          attempt.approver_email?.toLowerCase().includes(term) ||
          attempt.client_name?.toLowerCase().includes(term) ||
          attempt.client_slug?.toLowerCase().includes(term) ||
          attempt.identifier.toLowerCase().includes(term) ||
          attempt.ip_address?.toLowerCase().includes(term)
      );
    }

    setFilteredAttempts(filtered);
  };

  const getBrowserFromUserAgent = (userAgent: string | null): string => {
    if (!userAgent) return "Desconhecido";
    
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari")) return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    if (userAgent.includes("Opera")) return "Opera";
    
    return "Outro";
  };

  const getStatusBadge = (attempt: AccessAttempt) => {
    if (attempt.is_success) {
      return (
        <Badge variant="success" className="flex items-center gap-1 w-fit">
          <CheckCircle2 className="h-3 w-3" />
          Sucesso
        </Badge>
      );
    }
    
    if (attempt.is_expired) {
      return (
        <Badge variant="outline" className="flex items-center gap-1 w-fit">
          <Clock className="h-3 w-3" />
          Expirado
        </Badge>
      );
    }

    return (
      <Badge variant="destructive" className="flex items-center gap-1 w-fit">
        <XCircle className="h-3 w-3" />
        Não Usado
      </Badge>
    );
  };

  const stats = {
    total: attempts.length,
    success: attempts.filter((a) => a.is_success).length,
    failed: attempts.filter((a) => !a.is_success && !a.is_expired).length,
    expired: attempts.filter((a) => a.is_expired).length,
  };

  const successRate = stats.total > 0 
    ? ((stats.success / stats.total) * 100).toFixed(1) 
    : "0.0";

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Tentativas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Sucessos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats.success}</p>
            <p className="text-xs text-muted-foreground mt-1">Taxa: {successRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Não Usados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{stats.failed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Expirados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-600">{stats.expired}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Histórico */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Histórico de Acessos 2FA
              </CardTitle>
              <CardDescription>
                Registro completo de todas as tentativas de autenticação
              </CardDescription>
            </div>
            <Button onClick={loadAccessHistory} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por aprovador, cliente ou IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value: FilterStatus) => setStatusFilter(value)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="failed">Não Usado</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Última Semana</SelectItem>
                <SelectItem value="month">Último Mês</SelectItem>
                <SelectItem value="all">Todo Período</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando histórico...
            </div>
          ) : filteredAttempts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || statusFilter !== "all" 
                ? "Nenhuma tentativa encontrada com estes filtros" 
                : "Nenhuma tentativa de acesso registrada"}
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                {filteredAttempts.length} tentativa(s) encontrada(s)
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Aprovador</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Acesso</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttempts.map((attempt) => (
                      <TableRow key={attempt.id}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">
                              {format(new Date(attempt.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(attempt.created_at), "HH:mm:ss", { locale: ptBR })}
                            </span>
                            {attempt.used_at && (
                              <span className="text-xs text-green-600">
                                ✓ Usado às {format(new Date(attempt.used_at), "HH:mm", { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {attempt.approver_name ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium">{attempt.approver_name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">{attempt.approver_email}</span>
                              </>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                  {attempt.identifier_type === 'email' ? '📧' : '📱'} {attempt.identifier}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {attempt.client_name ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <div className="flex flex-col">
                                <span className="font-medium">{attempt.client_name}</span>
                                <span className="text-xs text-muted-foreground font-mono">{attempt.client_slug}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-sm">
                            {attempt.ip_address && (
                              <div className="flex items-center gap-2">
                                <Globe className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground font-mono">{attempt.ip_address}</span>
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {getBrowserFromUserAgent(attempt.user_agent)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(attempt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
