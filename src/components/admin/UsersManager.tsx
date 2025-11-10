import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { RefreshCw, Trash2, User, Mail, Search, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface UserData {
  id: string;
  email: string;
  created_at: string;
  name: string | null;
  account_type: string | null;
  role: string | null;
  plan: string | null;
  is_active: boolean;
}

export const UsersManager = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all profiles with role information
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id,
          name,
          account_type,
          plan,
          is_active,
          user_roles (role)
        `)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get auth users data
      const { data: orphanedData } = await supabase.functions.invoke('list-orphaned-accounts');
      const allAuthUsers = orphanedData?.all_auth_users || [];

      // Merge data
      const usersData: UserData[] = allAuthUsers.map((authUser: any) => {
        const profile = profilesData?.find(p => p.id === authUser.id);
        const userRole = Array.isArray(profile?.user_roles) && profile.user_roles.length > 0 
          ? profile.user_roles[0]?.role 
          : null;
        
        return {
          id: authUser.id,
          email: authUser.email,
          created_at: authUser.created_at,
          name: profile?.name || authUser.user_metadata?.name || null,
          account_type: profile?.account_type || null,
          role: userRole,
          plan: profile?.plan || null,
          is_active: profile?.is_active ?? false,
        };
      });

      setUsers(usersData);
      setFilteredUsers(usersData);
      
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

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers(users);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredUsers(
        users.filter(
          u =>
            u.email.toLowerCase().includes(term) ||
            u.name?.toLowerCase().includes(term) ||
            u.id.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, users]);

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
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email, nome ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.email}</span>
                        {!user.is_active && (
                          <Badge variant="outline" className="text-xs bg-muted">Inativo</Badge>
                        )}
                        {!user.name && (
                          <Badge variant="outline" className="text-xs">Sem Perfil</Badge>
                        )}
                      </div>
                      {user.name && (
                        <div className="text-sm text-muted-foreground">
                          {user.name}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>Criado: {format(new Date(user.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                        {user.role && (
                          <Badge variant="outline" className="text-xs">
                            {user.role}
                          </Badge>
                        )}
                        {user.account_type && (
                          <Badge variant="outline" className="text-xs">
                            {user.account_type}
                          </Badge>
                        )}
                        {user.plan && (
                          <Badge variant="outline" className="text-xs">
                            {user.plan}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        ID: {user.id}
                      </div>
                    </div>
                  </div>
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
