import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Search as SearchIcon, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UserWithRole {
  id: string;
  name: string;
  email: string;
  role: string;
  agency_name?: string;
}

interface RolePermission {
  id: string;
  role: string;
  permission_key: string;
  enabled: boolean;
}

type PermissionsByRole = Record<string, Record<string, boolean>>;

export const RolesManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRole[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<Record<string, boolean>>({});
  const [permissions, setPermissions] = useState<PermissionsByRole>({});
  const [editedPermissions, setEditedPermissions] = useState<PermissionsByRole>({});
  const [savingPermissions, setSavingPermissions] = useState(false);

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

  const loadPermissions = async () => {
    const { data, error } = await supabase
      .from("role_permissions")
      .select("*");

    if (error) {
      console.error("Erro ao carregar permissões:", error);
      return;
    }

    const permsByRole: PermissionsByRole = {};
    (data || []).forEach((perm: RolePermission) => {
      if (!permsByRole[perm.role]) permsByRole[perm.role] = {};
      permsByRole[perm.role][perm.permission_key] = perm.enabled;
    });

    setPermissions(permsByRole);
    setEditedPermissions(JSON.parse(JSON.stringify(permsByRole)));
  };

  const handlePermissionChange = (role: string, permKey: string, enabled: boolean) => {
    setEditedPermissions(prev => ({
      ...prev,
      [role]: {
        ...(prev[role] || {}),
        [permKey]: enabled
      }
    }));
  };

  const handleSavePermissions = async () => {
    setSavingPermissions(true);
    try {
      const updates: Array<{ role: string; permission_key: string; enabled: boolean }> = [];
      
      Object.entries(editedPermissions).forEach(([role, perms]) => {
        Object.entries(perms).forEach(([permKey, enabled]) => {
          if (permissions[role]?.[permKey] !== enabled) {
            updates.push({ role, permission_key: permKey, enabled });
          }
        });
      });

      for (const update of updates) {
        const { error } = await supabase
          .from("role_permissions")
          .update({ enabled: update.enabled })
          .eq("role", update.role as any)
          .eq("permission_key", update.permission_key);

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: "Permissões atualizadas com sucesso!",
      });
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao salvar permissões:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao salvar permissões",
      });
    } finally {
      setSavingPermissions(false);
    }
  };

  const hasChanges = () => {
    return JSON.stringify(permissions) !== JSON.stringify(editedPermissions);
  };

  useEffect(() => {
    loadUsers();
    loadPermissions();
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

      // Atualizar profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ role: newRole as any })
        .eq("id", userId);

      if (profileError) throw profileError;

      toast({
        title: "Sucesso",
        description: "Role atualizada com sucesso!",
      });

      await loadUsers();
    } catch (error) {
      console.error("Erro ao atualizar role:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar a role.",
      });
    } finally {
      setChangingRole({ ...changingRole, [userId]: false });
    }
  };

  const getRoleBadgeVariant = (role: string): "default" | "outline" | "destructive" => {
    if (role === "super_admin") return "destructive";
    if (role === "agency_admin") return "default";
    return "outline";
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: "Super Admin",
      agency_admin: "Admin de Agência",
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
      {/* Card 1: Permissões por Função (Agora Editável) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissões por Função
          </CardTitle>
          <CardDescription>
            Configure as permissões de cada role (clique para editar)
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
                <h4 className="text-sm font-medium">Permissões</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(editedPermissions.super_admin || {}).map(([key, enabled]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox 
                        checked={enabled}
                        onCheckedChange={(checked) => handlePermissionChange('super_admin', key, !!checked)}
                      />
                      <Label className="cursor-pointer">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="agency_admin" className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Administradores de Agência gerenciam seus clientes e equipe.
              </p>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Permissões</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(editedPermissions.agency_admin || {}).map(([key, enabled]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox 
                        checked={enabled}
                        onCheckedChange={(checked) => handlePermissionChange('agency_admin', key, !!checked)}
                      />
                      <Label className="cursor-pointer">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="client_user" className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Usuários Cliente podem visualizar e aprovar conteúdos.
              </p>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Permissões</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(editedPermissions.client_user || {}).map(([key, enabled]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox 
                        checked={enabled}
                        onCheckedChange={(checked) => handlePermissionChange('client_user', key, !!checked)}
                      />
                      <Label className="cursor-pointer">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="team_member" className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Membros da Equipe colaboram na criação de conteúdo.
              </p>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Permissões</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(editedPermissions.team_member || {}).map(([key, enabled]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox 
                        checked={enabled}
                        onCheckedChange={(checked) => handlePermissionChange('team_member', key, !!checked)}
                      />
                      <Label className="cursor-pointer">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {hasChanges() && (
            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
              <Button variant="outline" onClick={loadPermissions} disabled={savingPermissions}>
                Cancelar
              </Button>
              <Button onClick={handleSavePermissions} disabled={savingPermissions}>
                {savingPermissions ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Permissões
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 2: Alterar Role de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SearchIcon className="h-5 w-5" />
            Alterar Role de Usuários
          </CardTitle>
          <CardDescription>
            Pesquise e altere a role de qualquer usuário do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Lista de Usuários */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.name}</p>
                      {user.agency_name && (
                        <Badge variant="outline" className="text-xs">
                          {user.agency_name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <Badge variant={getRoleBadgeVariant(user.role)} className="mt-1">
                      {getRoleLabel(user.role)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={user.role}
                      onValueChange={(newRole) => handleChangeUserRole(user.id, newRole)}
                      disabled={user.id === currentUserId || changingRole[user.id]}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="agency_admin">Admin de Agência</SelectItem>
                        <SelectItem value="team_member">Membro da Equipe</SelectItem>
                        <SelectItem value="client_user">Usuário Cliente</SelectItem>
                      </SelectContent>
                    </Select>

                    {changingRole[user.id] && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}

              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
