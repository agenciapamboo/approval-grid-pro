import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Ban, Trash2, CheckCircle, Loader2, Lock, Unlock } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  created_at: string;
  blocked_by_parent: boolean;
  is_active: boolean;
}

export function TeamMembersManager() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState(false);
  
  // Form state
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      
      // Buscar agency_id do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("agency_id")
        .eq("id", user.id)
        .single();

      if (!profile?.agency_id) {
        toast.error("Você não está associado a uma agência");
        return;
      }

      // Buscar todos os profiles da agência com role team_member
      const { data: members, error } = await supabase
        .from("profiles")
        .select(`
          id,
          name,
          blocked_by_parent,
          is_active,
          created_at
        `)
        .eq("agency_id", profile.agency_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filtrar apenas team_members verificando a tabela user_roles
      const memberIds = members?.map(m => m.id) || [];
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("user_id", memberIds)
        .eq("role", "team_member");

      const teamMemberIds = new Set(roles?.map(r => r.user_id) || []);

      // Buscar emails via edge function
      const { data: emailData } = await supabase.functions.invoke("get-user-emails", {
        body: { userIds: Array.from(teamMemberIds) },
      });

      const emailMap = new Map(emailData?.emails?.map((e: any) => [e.id, e.email]) || []);

      const teamMembersData: TeamMember[] = members
        ?.filter(m => teamMemberIds.has(m.id))
        .map(member => ({
          id: member.id,
          name: member.name,
          email: (emailMap.get(member.id) as string) || "",
          created_at: member.created_at,
          blocked_by_parent: member.blocked_by_parent,
          is_active: member.is_active,
        })) || [];

      setTeamMembers(teamMembersData);
    } catch (error) {
      console.error("Error loading team members:", error);
      toast.error("Erro ao carregar membros da equipe");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberName || !newMemberEmail) {
      toast.error("Preencha todos os campos");
      return;
    }

    setAddingMember(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-team-member", {
        body: {
          name: newMemberName,
          email: newMemberEmail,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Membro adicionado com sucesso", {
          description: "Um email de convite foi enviado ao novo membro",
        });
        setShowAddDialog(false);
        setNewMemberName("");
        setNewMemberEmail("");
        loadTeamMembers();
      } else {
        throw new Error(data?.message || "Erro ao adicionar membro");
      }
    } catch (error: any) {
      console.error("Error adding team member:", error);
      toast.error("Erro ao adicionar membro", {
        description: error.message || "Tente novamente mais tarde",
      });
    } finally {
      setAddingMember(false);
    }
  };

  const handleToggleBlock = async (memberId: string, currentlyBlocked: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ blocked_by_parent: !currentlyBlocked })
        .eq("id", memberId);

      if (error) throw error;

      toast.success(
        currentlyBlocked ? "Membro desbloqueado" : "Membro bloqueado",
        {
          description: currentlyBlocked
            ? "O membro pode acessar o sistema novamente"
            : "O membro não poderá acessar o sistema",
        }
      );
      loadTeamMembers();
    } catch (error) {
      console.error("Error toggling block:", error);
      toast.error("Erro ao atualizar status do membro");
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    setRemovingMember(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", memberToRemove)
        .eq("role", "team_member");

      if (error) throw error;

      toast.success("Membro removido da equipe");
      setMemberToRemove(null);
      loadTeamMembers();
    } catch (error) {
      console.error("Error removing team member:", error);
      toast.error("Erro ao remover membro");
    } finally {
      setRemovingMember(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Membros da Equipe</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
              <CardTitle>Membros da Equipe</CardTitle>
              <CardDescription>
                Gerencie os membros da sua equipe (team_members)
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Adicionar Membro
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum membro da equipe cadastrado</p>
              <p className="text-sm mt-2">Adicione membros para colaborar com você</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Adicionado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      {member.blocked_by_parent ? (
                        <Badge variant="destructive">
                          <Ban className="mr-1 h-3 w-3" />
                          Bloqueado
                        </Badge>
                      ) : member.is_active ? (
                        <Badge variant="success">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(member.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleBlock(member.id, member.blocked_by_parent)}
                        >
                          {member.blocked_by_parent ? (
                            <>
                              <Unlock className="mr-2 h-4 w-4" />
                              Desbloquear
                            </>
                          ) : (
                            <>
                              <Lock className="mr-2 h-4 w-4" />
                              Bloquear
                            </>
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setMemberToRemove(member.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Membro da Equipe</DialogTitle>
            <DialogDescription>
              Adicione um novo membro à sua equipe. Um email de convite será enviado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                placeholder="João Silva"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="joao@exemplo.com"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setNewMemberName("");
                setNewMemberEmail("");
              }}
              disabled={addingMember}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddMember} disabled={addingMember}>
              {addingMember ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adicionando...
                </>
              ) : (
                "Adicionar Membro"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro da equipe?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o membro da equipe e ele perderá acesso ao sistema.
              Esta ação não pode ser desfeita, mas você pode adicionar o membro novamente depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingMember}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={removingMember}
              className="bg-destructive hover:bg-destructive/90"
            >
              {removingMember ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removendo...
                </>
              ) : (
                "Remover"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
