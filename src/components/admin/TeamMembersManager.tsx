import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Trash2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddTeamMemberDialog } from "./AddTeamMemberDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  is_active: boolean;
}

interface TeamMembersManagerProps {
  agencyId: string;
}

export function TeamMembersManager({ agencyId }: TeamMembersManagerProps) {
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  useEffect(() => {
    loadMembers();
  }, [agencyId]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      
      // Buscar perfis da agência
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, created_at, is_active")
        .eq("agency_id", agencyId);

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        setMembers([]);
        return;
      }

      const userIds = profiles.map((p) => p.id);

      // Buscar roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      if (rolesError) throw rolesError;

      // Buscar emails via edge function
      const { data: emailData } = await supabase.functions.invoke("get-user-emails", {
        body: { userIds },
      });

      const emailMap = emailData?.emailMap || {};
      const rolesMap = new Map(roles?.map((r) => [r.user_id, r.role]) || []);

      const enrichedMembers = profiles.map((p) => ({
        id: p.id,
        name: p.name,
        email: emailMap[p.id] || "",
        role: rolesMap.get(p.id) || "client_user",
        created_at: p.created_at,
        is_active: p.is_active,
      }));

      setMembers(enrichedMembers);
    } catch (error) {
      console.error("Erro ao carregar membros:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os membros da equipe.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (
      !window.confirm(
        `Tem certeza que deseja remover ${memberName} da equipe? Esta ação não pode ser desfeita.`
      )
    ) {
      return;
    }

    try {
      // Remove agency_id from profile
      const { error } = await supabase
        .from("profiles")
        .update({ agency_id: null, is_active: false })
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Membro removido",
        description: `${memberName} foi removido da equipe.`,
      });

      loadMembers();
    } catch (error) {
      console.error("Erro ao remover membro:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível remover o membro da equipe.",
      });
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: "Super Admin",
      agency_admin: "Admin da Agência",
      client_user: "Membro da Equipe",
    };
    return labels[role] || role;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Equipe</CardTitle>
              <CardDescription>
                Gerencie os membros da sua equipe
              </CardDescription>
            </div>
            <Button onClick={() => setAddDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Adicionar Membro
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum membro na equipe ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <Card key={member.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{member.name}</h4>
                        {!member.is_active && (
                          <Badge variant="outline" className="text-xs">
                            Inativo
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{getRoleLabel(member.role)}</Badge>
                        <span className="text-xs text-muted-foreground">
                          Desde {format(new Date(member.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMember(member.id, member.name)}
                      disabled={member.role === "super_admin"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddTeamMemberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        agencyId={agencyId}
        onSuccess={loadMembers}
      />
    </>
  );
}
