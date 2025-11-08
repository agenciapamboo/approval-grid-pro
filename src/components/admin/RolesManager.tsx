import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Users, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

interface UserWithRole {
  id: string;
  name: string;
  email: string;
  role: string;
  agency_name?: string;
}

export const RolesManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRole[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<Record<string, boolean>>({});

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      // Buscar profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, agency_id")
        .order("name");

      if (profilesError) throw profilesError;

      if (!profilesData || profilesData.length === 0) {
        setUsers([]);
        setFilteredUsers([]);
        setLoading(false);
        return;
      }

      const userIds = profilesData.map((p) => p.id);

      // Buscar roles
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const rolesMap: Record<string, string[]> = {};
      (rolesData || []).forEach((r: any) => {
        if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
        rolesMap[r.user_id].push(r.role);
      });

      // Buscar emails
      const { data: emailData } = await supabase.functions.invoke("get-user-emails", {
        body: { userIds },
      });

      const emailMap = emailData?.emailMap || {};

      // Buscar agências
      const agencyIds = profilesData
        .map((p) => p.agency_id)
        .filter((id) => id !== null) as string[];
      
      const { data: agenciesData } = await supabase
        .from("agencies")
        .select("id, name")
        .in("id", agencyIds);

      const agencyMap = new Map((agenciesData || []).map((a: any) => [a.id, a.name]));

      const enrichedUsers: UserWithRole[] = profilesData.map((p) => {
        const roles = rolesMap[p.id] || [];
        const resolvedRole = roles.includes("super_admin")
          ? "super_admin"
          : roles.includes("agency_admin")
          ? "agency_admin"
          : roles.includes("team_member")
          ? "team_member"
          : "client_user";

        return {
          id: p.id,
          name: p.name,
          email: emailMap[p.id] || "Sem email",
          role: resolvedRole,
          agency_name: p.agency_id ? agencyMap.get(p.agency_id) : undefined,
        };
      });

      setUsers(enrichedUsers);
      setFilteredUsers(enrichedUsers);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os usuários.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          (u) =>
            u.name.toLowerCase().includes(query) ||
            u.email.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, users]);

  const handleChangeUserRole = async (userId: string, newRole: string) => {
    if (userId === currentUserId) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Você não pode alterar sua própria role.",
      });
      return;
    }

    setChangingRole({ ...changingRole, [userId]: true });
    try {
      // Atualizar user_roles
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: newRole as any })
        .eq("user_id", userId);

      if (roleError) throw roleError;

      // Atualizar profiles.role para compatibilidade
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ role: newRole as any })
        .eq("id", userId);

      if (profileError) throw profileError;

      toast({
        title: "Role atualizada",
        description: "A role do usuário foi atualizada com sucesso.",
      });

      await loadUsers();
    } catch (error) {
      console.error("Erro ao alterar role:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível alterar a role do usuário.",
      });
    } finally {
      setChangingRole({ ...changingRole, [userId]: false });
    }
  };

  const getRoleBadgeVariant = (role: string): "default" | "destructive" | "outline" | "success" | "warning" | "pending" => {
    switch (role) {
      case "super_admin":
        return "destructive";
      case "agency_admin":
        return "default";
      case "team_member":
        return "outline";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: "Super Admin",
      agency_admin: "Admin da Agência",
      team_member: "Membro da Equipe",
      client_user: "Usuário Cliente",
    };
    return labels[role] || role;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gerenciamento de Roles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card 1: Permissões por Função (Documentação Visual) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissões por Função
          </CardTitle>
          <CardDescription>
            Visualize as permissões de cada role (documentação)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="super_admin">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="super_admin">Super Admin</TabsTrigger>
              <TabsTrigger value="agency_admin">Agency Admin</TabsTrigger>
              <TabsTrigger value="client_user">Client User</TabsTrigger>
              <TabsTrigger value="team_member">Team Member</TabsTrigger>
            </TabsList>

            <TabsContent value="super_admin" className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Super Administradores têm acesso total ao sistema.
              </p>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Acesso a Módulos</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox checked disabled />
                    <Label>Dashboard Completo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox checked disabled />
                    <Label>Gerenciar Clientes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox checked disabled />
                    <Label>Gerenciar Usuários</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox checked disabled />
                    <Label>Ver Financeiro</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox checked disabled />
                    <Label>Editar Planos</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox checked disabled />
                    <Label>Gerenciar Roles</Label>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="agency_admin" className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Administradores de Agência gerenciam seus clientes e equipe.
              </p>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Acesso a Módulos</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox checked disabled />
                    <Label>Dashboard da Agência</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox checked disabled />
                    <Label>Gerenciar Clientes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox checked disabled />
                    <Label>Criar Conteúdo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox checked disabled />
                    <Label>Aprovar Conteúdo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox disabled />
                    <Label>Ver Financeiro (Limitado)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox disabled />
                    <Label>Editar Planos</Label>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="client_user" className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Usuários Clientes visualizam e aprovam conteúdo.
              </p>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Acesso a Módulos</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox checked disabled />
                    <Label>Ver Conteúdo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox checked disabled />
                    <Label>Aprovar Conteúdo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox checked disabled />
                    <Label>Solicitar Ajustes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox disabled />
                    <Label>Criar Conteúdo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox disabled />
                    <Label>Deletar Conteúdo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox disabled />
                    <Label>Ver Financeiro</Label>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="team_member" className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Membros da Equipe colaboram no conteúdo.
              </p>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Acesso a Módulos</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox checked disabled />
                    <Label>Ver Conteúdo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox checked disabled />
                    <Label>Criar Conteúdo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox disabled />
                    <Label>Aprovar Conteúdo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox disabled />
                    <Label>Deletar Conteúdo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox disabled />
                    <Label>Ver Financeiro</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox disabled />
                    <Label>Gerenciar Clientes</Label>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Card 2: Alterar Role de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Alterar Role de Usuários
          </CardTitle>
          <CardDescription>
            Pesquise e altere a role de usuários específicos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">Buscar usuário</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Digite o nome ou email do usuário..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum usuário encontrado.
              </p>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    {user.agency_name && (
                      <p className="text-xs text-muted-foreground">
                        Agência: {user.agency_name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                    <Select
                      value={user.role}
                      onValueChange={(newRole) => handleChangeUserRole(user.id, newRole)}
                      disabled={changingRole[user.id] || user.id === currentUserId}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="agency_admin">Admin da Agência</SelectItem>
                        <SelectItem value="team_member">Membro da Equipe</SelectItem>
                        <SelectItem value="client_user">Usuário Cliente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};