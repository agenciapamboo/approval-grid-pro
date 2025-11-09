import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Search as SearchIcon, Save, Package, Settings } from "lucide-react";
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

interface PlanPermission {
  id: string;
  plan: string;
  permission_key: string;
  enabled: boolean;
}

interface PlanEntitlement {
  id: string;
  plan: string;
  posts_limit: number | null;
  creatives_limit: number | null;
  history_days: number;
  team_members_limit: number | null;
  whatsapp_support: boolean;
  graphics_approval: boolean;
  supplier_link: boolean;
  global_agenda: boolean;
  team_kanban: boolean;
  team_notifications: boolean;
}

type PermissionsByRole = Record<string, Record<string, boolean>>;
type PermissionsByPlan = Record<string, Record<string, boolean>>;

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
  
  // Plan Permissions State
  const [planPermissions, setPlanPermissions] = useState<PermissionsByPlan>({});
  const [editedPlanPermissions, setEditedPlanPermissions] = useState<PermissionsByPlan>({});
  const [savingPlanPermissions, setSavingPlanPermissions] = useState(false);
  
  // Plan Entitlements State
  const [planEntitlements, setPlanEntitlements] = useState<PlanEntitlement[]>([]);
  const [editingPlan, setEditingPlan] = useState<Record<string, PlanEntitlement>>({});
  const [savingPlan, setSavingPlan] = useState<Record<string, boolean>>({});

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

  const loadPlanPermissions = async () => {
    const { data, error } = await supabase
      .from("plan_permissions")
      .select("*");

    if (error) {
      console.error("Erro ao carregar permissões de planos:", error);
      return;
    }

    const permsByPlan: PermissionsByPlan = {};
    (data || []).forEach((perm: PlanPermission) => {
      if (!permsByPlan[perm.plan]) permsByPlan[perm.plan] = {};
      permsByPlan[perm.plan][perm.permission_key] = perm.enabled;
    });

    setPlanPermissions(permsByPlan);
    setEditedPlanPermissions(JSON.parse(JSON.stringify(permsByPlan)));
  };

  const handlePlanPermissionChange = (plan: string, permKey: string, enabled: boolean) => {
    setEditedPlanPermissions(prev => ({
      ...prev,
      [plan]: {
        ...(prev[plan] || {}),
        [permKey]: enabled
      }
    }));
  };

  const handleSavePlanPermissions = async () => {
    setSavingPlanPermissions(true);
    try {
      const updates: Array<{ plan: string; permission_key: string; enabled: boolean }> = [];
      
      Object.entries(editedPlanPermissions).forEach(([plan, perms]) => {
        Object.entries(perms).forEach(([permKey, enabled]) => {
          if (planPermissions[plan]?.[permKey] !== enabled) {
            updates.push({ plan, permission_key: permKey, enabled });
          }
        });
      });

      for (const update of updates) {
        const { error } = await supabase
          .from("plan_permissions")
          .update({ enabled: update.enabled })
          .eq("plan", update.plan)
          .eq("permission_key", update.permission_key);

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: "Permissões de planos atualizadas com sucesso!",
      });
      await loadPlanPermissions();
    } catch (error) {
      console.error("Erro ao salvar permissões de planos:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao salvar permissões de planos",
      });
    } finally {
      setSavingPlanPermissions(false);
    }
  };

  const hasPlanChanges = () => {
    return JSON.stringify(planPermissions) !== JSON.stringify(editedPlanPermissions);
  };

  const loadPlanEntitlements = async () => {
    try {
      const { data, error } = await supabase
        .from("plan_entitlements")
        .select("*")
        .order("plan");

      if (error) throw error;

      setPlanEntitlements(data || []);
      const editMap: Record<string, PlanEntitlement> = {};
      (data || []).forEach((plan) => {
        editMap[plan.plan] = { ...plan };
      });
      setEditingPlan(editMap);
    } catch (error) {
      console.error("Erro ao carregar planos:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os planos.",
      });
    }
  };

  const handleSavePlanEntitlement = async (planKey: string) => {
    setSavingPlan({ ...savingPlan, [planKey]: true });
    try {
      const planData = editingPlan[planKey];
      
      const { error } = await supabase
        .from("plan_entitlements")
        .update({
          posts_limit: planData.posts_limit,
          creatives_limit: planData.creatives_limit,
          history_days: planData.history_days,
          team_members_limit: planData.team_members_limit,
          whatsapp_support: planData.whatsapp_support,
          graphics_approval: planData.graphics_approval,
          supplier_link: planData.supplier_link,
          global_agenda: planData.global_agenda,
          team_kanban: planData.team_kanban,
          team_notifications: planData.team_notifications,
        })
        .eq("plan", planKey);

      if (error) throw error;

      toast({
        title: "Plano atualizado",
        description: `O plano ${getPlanLabel(planKey)} foi atualizado com sucesso.`,
      });

      await loadPlanEntitlements();
    } catch (error) {
      console.error("Erro ao salvar plano:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar o plano.",
      });
    } finally {
      setSavingPlan({ ...savingPlan, [planKey]: false });
    }
  };

  const updatePlanField = (planKey: string, field: keyof PlanEntitlement, value: any) => {
    setEditingPlan({
      ...editingPlan,
      [planKey]: {
        ...editingPlan[planKey],
        [field]: value,
      },
    });
  };

  const getPlanLabel = (plan: string) => {
    const labels: Record<string, string> = {
      creator: "Creator (Gratuito)",
      eugencia: "Eugência",
      socialmidia: "Social Mídia",
      fullservice: "Full Service",
      unlimited: "Sem Plano (Interno)",
    };
    return labels[plan] || plan;
  };

  useEffect(() => {
    loadUsers();
    loadPermissions();
    loadPlanPermissions();
    loadPlanEntitlements();
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
      {/* Card Principal com Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gerenciamento de Regras
          </CardTitle>
          <CardDescription>
            Configure permissões por função, permissões por plano e recursos disponíveis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="roles" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="roles">
                <Shield className="h-4 w-4 mr-2" />
                Permissões por Função
              </TabsTrigger>
              <TabsTrigger value="plans">
                <Settings className="h-4 w-4 mr-2" />
                Configuração por Plano
              </TabsTrigger>
            </TabsList>

            {/* Aba 1: Permissões por Função */}
            <TabsContent value="roles" className="space-y-4">
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
            </TabsContent>

            {/* Aba 2: Configuração por Plano (Permissões + Recursos) */}
            <TabsContent value="plans" className="space-y-4">
              <Tabs defaultValue="creator">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="creator">Creator</TabsTrigger>
                  <TabsTrigger value="eugencia">Eugência</TabsTrigger>
                  <TabsTrigger value="socialmidia">Social Mídia</TabsTrigger>
                  <TabsTrigger value="fullservice">Full Service</TabsTrigger>
                  <TabsTrigger value="unlimited">Unlimited</TabsTrigger>
                </TabsList>

                {['creator', 'eugencia', 'socialmidia', 'fullservice', 'unlimited'].map((planKey) => {
                  const planData = editingPlan[planKey];
                  const hasPermissionChanges = JSON.stringify(planPermissions[planKey]) !== JSON.stringify(editedPlanPermissions[planKey]);
                  
                  return (
                    <TabsContent key={planKey} value={planKey} className="space-y-6 pt-4">
                      <p className="text-sm text-muted-foreground">
                        Configure permissões e recursos para o plano {getPlanLabel(planKey)}
                      </p>

                      {/* Permissões de Ação */}
                      <div>
                        <h4 className="text-sm font-medium mb-4">Permissões de Ação</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(editedPlanPermissions[planKey] || {}).map(([key, enabled]) => (
                            <div key={key} className="flex items-center space-x-2">
                              <Checkbox 
                                checked={enabled}
                                onCheckedChange={(checked) => handlePlanPermissionChange(planKey, key, !!checked)}
                              />
                              <Label className="cursor-pointer">
                                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </Label>
                            </div>
                          ))}
                        </div>
                        
                        {hasPermissionChanges && (
                          <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setEditedPlanPermissions(prev => ({
                                  ...prev,
                                  [planKey]: planPermissions[planKey]
                                }));
                              }}
                              disabled={savingPlanPermissions}
                              size="sm"
                            >
                              Cancelar
                            </Button>
                            <Button 
                              onClick={handleSavePlanPermissions} 
                              disabled={savingPlanPermissions}
                              size="sm"
                            >
                              {savingPlanPermissions ? (
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
                      </div>


                      {/* Limites Numéricos */}
                      {planData && (
                        <>
                          <div>
                            <h4 className="text-sm font-medium mb-4">Limites Numéricos</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Posts por mês</Label>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={planData.posts_limit || ""}
                                    onChange={(e) =>
                                      updatePlanField(planKey, "posts_limit", e.target.value ? parseInt(e.target.value) : null)
                                    }
                                    disabled={planData.posts_limit === null}
                                    placeholder="Limite"
                                  />
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      checked={planData.posts_limit === null}
                                      onCheckedChange={(checked) =>
                                        updatePlanField(planKey, "posts_limit", checked ? null : 0)
                                      }
                                    />
                                    <span className="text-sm">Ilimitado</span>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>Criativos por mês</Label>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={planData.creatives_limit || ""}
                                    onChange={(e) =>
                                      updatePlanField(planKey, "creatives_limit", e.target.value ? parseInt(e.target.value) : null)
                                    }
                                    disabled={planData.creatives_limit === null}
                                    placeholder="Limite"
                                  />
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      checked={planData.creatives_limit === null}
                                      onCheckedChange={(checked) =>
                                        updatePlanField(planKey, "creatives_limit", checked ? null : 0)
                                      }
                                    />
                                    <span className="text-sm">Ilimitado</span>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>Histórico em dias</Label>
                                <Input
                                  type="number"
                                  value={planData.history_days || ""}
                                  onChange={(e) =>
                                    updatePlanField(planKey, "history_days", parseInt(e.target.value))
                                  }
                                  placeholder="Dias"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Membros do time</Label>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={planData.team_members_limit || ""}
                                    onChange={(e) =>
                                      updatePlanField(planKey, "team_members_limit", e.target.value ? parseInt(e.target.value) : null)
                                    }
                                    disabled={planData.team_members_limit === null}
                                    placeholder="Limite"
                                  />
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      checked={planData.team_members_limit === null}
                                      onCheckedChange={(checked) =>
                                        updatePlanField(planKey, "team_members_limit", checked ? null : 0)
                                      }
                                    />
                                    <span className="text-sm">Ilimitado</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Recursos Booleanos */}
                          <div>
                            <h4 className="text-sm font-medium mb-4">Recursos Disponíveis</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={planData.whatsapp_support || false}
                                  onCheckedChange={(checked) =>
                                    updatePlanField(planKey, "whatsapp_support", checked)
                                  }
                                />
                                <Label>Notificações via WhatsApp</Label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={planData.graphics_approval || false}
                                  onCheckedChange={(checked) =>
                                    updatePlanField(planKey, "graphics_approval", checked)
                                  }
                                />
                                <Label>Aprovação de Artes</Label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={planData.supplier_link || false}
                                  onCheckedChange={(checked) =>
                                    updatePlanField(planKey, "supplier_link", checked)
                                  }
                                />
                                <Label>Link de Fornecedor</Label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={planData.global_agenda || false}
                                  onCheckedChange={(checked) =>
                                    updatePlanField(planKey, "global_agenda", checked)
                                  }
                                />
                                <Label>Agenda Global</Label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={planData.team_kanban || false}
                                  onCheckedChange={(checked) =>
                                    updatePlanField(planKey, "team_kanban", checked)
                                  }
                                />
                                <Label>Kanban de Equipe</Label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={planData.team_notifications || false}
                                  onCheckedChange={(checked) =>
                                    updatePlanField(planKey, "team_notifications", checked)
                                  }
                                />
                                <Label>Notificações de Equipe</Label>
                              </div>
                            </div>
                          </div>

                          {/* Botões de Salvar Recursos */}
                          <div className="flex gap-2 pt-4 border-t">
                            <Button
                              onClick={() => handleSavePlanEntitlement(planKey)}
                              disabled={savingPlan[planKey]}
                              className="flex items-center gap-2"
                            >
                              {savingPlan[planKey] ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Salvando...
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4" />
                                  Salvar Recursos
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => loadPlanEntitlements()}
                              disabled={savingPlan[planKey]}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
            </TabsContent>
          </Tabs>
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
