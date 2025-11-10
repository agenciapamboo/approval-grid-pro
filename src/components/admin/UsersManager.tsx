import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { RefreshCw, Trash2, User, Search, AlertTriangle, Edit, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { EditUserDialog } from "./EditUserDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserData {
  id: string;
  email: string;
  created_at: string;
  name: string | null;
  account_type: string | null;
  role: string | null;
  plan: string | null;
  is_active: boolean;
  client_id?: string | null;
  agency_id?: string | null;
  client_name?: string | null;
  agency_name?: string | null;
}

export const UsersManager = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [issuesFilter, setIssuesFilter] = useState<boolean>(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, account_type, plan, is_active, client_id, agency_id, created_at")
        .order("created_at", { ascending: false });

      // Fetch roles separately
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (profilesError) throw profilesError;

      // Get clients and agencies for names
      const { data: clients } = await supabase
        .from("clients")
        .select("id, name");

      const { data: agencies } = await supabase
        .from("agencies")
        .select("id, name");

      // Get auth users data
      const { data: orphanedData } = await supabase.functions.invoke('list-orphaned-accounts');
      const allAuthUsers = orphanedData?.all_auth_users || [];

      // Merge data
      const usersData: UserData[] = allAuthUsers.map((authUser: any) => {
        const profile = profilesData?.find((p) => p.id === authUser.id);
        const roleEntry = rolesData?.find((r) => r.user_id === authUser.id);
        const client = clients?.find((c) => c.id === profile?.client_id);
        const agency = agencies?.find((a) => a.id === profile?.agency_id);
        
        return {
          id: authUser.id,
          email: authUser.email,
          created_at: authUser.created_at,
          name: profile?.name || authUser.user_metadata?.name || null,
          account_type: profile?.account_type || null,
          role: roleEntry?.role || null,
          plan: profile?.plan || null,
          is_active: profile?.is_active ?? false,
          client_id: profile?.client_id || null,
          agency_id: profile?.agency_id || null,
          client_name: client?.name || null,
          agency_name: agency?.name || null,
        };
      });

      setUsers(usersData);
      applyFilters(usersData, searchTerm, roleFilter, issuesFilter);
      
      toast.success(`${usersData.length} usuário(s) carregado(s)`);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error("Erro ao buscar usuários");
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    if (!window.confirm(
      `⚠️ ATENÇÃO: Deseja excluir permanentemente o usuário ${email}?\n\n` +
      `Esta ação irá remover:\n` +
      `- Conta de autenticação\n` +
      `- Perfil e configurações\n` +
      `- Papéis e permissões\n` +
      `- Preferências de notificação\n` +
      `- Logs de atividade\n\n` +
      `Esta ação NÃO pode ser desfeita!`
    )) {
      return;
    }

    setDeleting(userId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao excluir usuário");

      toast.success(`Usuário ${email} excluído com sucesso`);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setFilteredUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error);
      toast.error(error.message || "Erro ao excluir usuário");
    } finally {
      setDeleting(null);
    }
  };

  const detectInconsistencies = (user: UserData): string[] => {
    const issues: string[] = [];
    
    if (user.role === 'client_user' && !user.client_id) {
      issues.push('Sem cliente');
    }
    
    if (user.role === 'agency_admin' && !user.agency_id) {
      issues.push('Sem agência');
    }
    
    if (user.account_type === 'agency' && user.role !== 'agency_admin') {
      issues.push('Role inconsistente');
    }
    
    if (user.account_type === 'creator' && (user.client_id || user.agency_id)) {
      issues.push('Vínculos indevidos');
    }

    if (user.account_type === 'client' && user.role !== 'client_user') {
      issues.push('Role inconsistente');
    }
    
    return issues;
  };

  const applyFilters = (
    usersList: UserData[], 
    search: string, 
    role: string, 
    showIssues: boolean
  ) => {
    let filtered = usersList;

    // Search filter
    if (search.trim() !== "") {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        u =>
          u.email.toLowerCase().includes(term) ||
          u.name?.toLowerCase().includes(term) ||
          u.id.toLowerCase().includes(term)
      );
    }

    // Role filter
    if (role !== "all") {
      filtered = filtered.filter(u => u.role === role);
    }

    // Issues filter
    if (showIssues) {
      filtered = filtered.filter(u => detectInconsistencies(u).length > 0);
    }

    setFilteredUsers(filtered);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters(users, searchTerm, roleFilter, issuesFilter);
  }, [searchTerm, roleFilter, issuesFilter, users]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Gerenciar Usuários
              </CardTitle>
              <CardDescription>
                Visualize e gerencie todos os usuários do sistema
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/admin/auditoria-usuarios'}
              >
                📋 Ver Auditoria
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsers}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email, nome ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="agency_admin">Agency Admin</SelectItem>
                <SelectItem value="client_user">Client User</SelectItem>
                <SelectItem value="creator">Creator</SelectItem>
                <SelectItem value="team_member">Team Member</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={issuesFilter ? "default" : "outline"}
              onClick={() => setIssuesFilter(!issuesFilter)}
              className="w-full"
            >
              <Filter className="h-4 w-4 mr-2" />
              {issuesFilter ? "Mostrando apenas com problemas" : "Mostrar apenas com problemas"}
            </Button>
          </div>

          {filteredUsers.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {searchTerm ? "Nenhum usuário encontrado com este critério de busca." : "Nenhum usuário cadastrado."}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {filteredUsers.length} usuário(s) {searchTerm && `encontrado(s)`}
              </p>
              {filteredUsers.map((user) => {
                const issues = detectInconsistencies(user);
                return (
                  <div
                    key={user.id}
                    className="flex items-start justify-between p-4 border rounded-lg bg-card gap-4"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <User className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="space-y-2 flex-1 min-w-0">
                        {/* Email and status */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{user.email}</span>
                          {!user.is_active && (
                            <Badge variant="outline" className="text-xs bg-muted">Inativo</Badge>
                          )}
                          {!user.name && (
                            <Badge variant="outline" className="text-xs">Sem Perfil</Badge>
                          )}
                          {issues.length > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {issues.length} problema{issues.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>

                        {/* Name */}
                        {user.name && (
                          <div className="text-sm text-muted-foreground truncate">
                            👤 {user.name}
                          </div>
                        )}

                        {/* Role and Account Type */}
                        <div className="flex flex-wrap gap-2">
                          {user.role && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                user.role === 'super_admin' ? 'bg-purple-100 dark:bg-purple-900' :
                                user.role === 'agency_admin' ? 'bg-blue-100 dark:bg-blue-900' :
                                user.role === 'client_user' ? 'bg-green-100 dark:bg-green-900' :
                                'bg-gray-100 dark:bg-gray-800'
                              }`}
                            >
                              🏷️ {user.role}
                            </Badge>
                          )}
                          {user.account_type && (
                            <Badge variant="outline" className="text-xs">
                              📋 {user.account_type}
                            </Badge>
                          )}
                          {user.plan && (
                            <Badge variant="outline" className="text-xs">
                              💎 {user.plan}
                            </Badge>
                          )}
                        </div>

                        {/* Client/Agency links */}
                        {(user.client_name || user.agency_name) && (
                          <div className="flex flex-wrap gap-2 text-xs">
                            {user.client_name && (
                              <span className="text-muted-foreground">
                                🏢 Cliente: <span className="font-medium">{user.client_name}</span>
                              </span>
                            )}
                            {user.agency_name && (
                              <span className="text-muted-foreground">
                                🏭 Agência: <span className="font-medium">{user.agency_name}</span>
                              </span>
                            )}
                          </div>
                        )}

                        {/* Issues */}
                        {issues.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {issues.map((issue, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs bg-destructive/10">
                                ⚠️ {issue}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Meta info */}
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <div>📅 {format(new Date(user.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
                          <div className="font-mono truncate">ID: {user.id}</div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingUser(user)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteUser(user.id, user.email)}
                        disabled={deleting === user.id}
                      >
                        {deleting === user.id ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Excluindo...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <EditUserDialog
        user={editingUser}
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        onSuccess={fetchUsers}
      />
    </div>
  );
};
