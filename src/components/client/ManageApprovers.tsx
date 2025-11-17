import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, Mail, Phone, CheckCircle, XCircle, Edit, Trash2, MoreVertical } from "lucide-react";
import { AddApproverDialog } from "@/components/admin/AddApproverDialog";
import { EditApproverDialog } from "@/components/admin/EditApproverDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ClientApprover {
  id: string;
  client_id: string;
  name: string;
  email: string;
  whatsapp?: string;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
}

export function ManageApprovers() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [approvers, setApprovers] = useState<ClientApprover[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedApprover, setSelectedApprover] = useState<ClientApprover | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [approverToDelete, setApproverToDelete] = useState<ClientApprover | null>(null);

  useEffect(() => {
    loadClientAndApprovers();
  }, []);

  const loadClientAndApprovers = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar profile do usuário para pegar client_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("client_id")
        .eq("id", user.id)
        .single();

      if (!profile?.client_id) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Cliente não encontrado.",
        });
        return;
      }

      setClientId(profile.client_id);

      // Buscar dados do cliente
      const { data: client } = await supabase
        .from("clients")
        .select("name")
        .eq("id", profile.client_id)
        .single();

      if (client) {
        setClientName(client.name);
      }

      // Buscar aprovadores
      await loadApprovers(profile.client_id);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os aprovadores.",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadApprovers = async (cId: string) => {
    const { data, error } = await supabase
      .from("client_approvers")
      .select("*")
      .eq("client_id", cId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro ao carregar aprovadores:", error);
      return;
    }

    setApprovers(data || []);
  };

  const handleEditApprover = (approver: ClientApprover) => {
    setSelectedApprover(approver);
    setEditDialogOpen(true);
  };

  const handleDeactivateApprover = async (approverId: string) => {
    try {
      // Verificar se é o último primário ativo
      const primaryActive = approvers.filter(a => a.is_primary && a.is_active && a.id !== approverId);
      
      if (primaryActive.length === 0) {
        const approverToDeactivate = approvers.find(a => a.id === approverId);
        if (approverToDeactivate?.is_primary) {
          toast({
            variant: "destructive",
            title: "Não é possível desativar",
            description: "Deve haver pelo menos um aprovador primário ativo. Promova outro aprovador primeiro."
          });
          return;
        }
      }

      const { error } = await supabase
        .from("client_approvers")
        .update({ is_active: false })
        .eq("id", approverId);

      if (error) throw error;

      toast({
        title: "Aprovador desativado",
        description: "O aprovador foi desativado com sucesso."
      });

      loadApprovers(clientId!);
    } catch (error) {
      console.error("Erro ao desativar aprovador:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível desativar o aprovador."
      });
    } finally {
      setDeleteDialogOpen(false);
      setApproverToDelete(null);
    }
  };

  const handleDeleteApprover = async (approverId: string) => {
    try {
      // Verificar se é o último primário ativo
      const primaryActive = approvers.filter(a => a.is_primary && a.is_active && a.id !== approverId);
      
      if (primaryActive.length === 0) {
        const approverToDelete = approvers.find(a => a.id === approverId);
        if (approverToDelete?.is_primary) {
          toast({
            variant: "destructive",
            title: "Não é possível deletar",
            description: "Deve haver pelo menos um aprovador primário ativo. Promova outro aprovador primeiro."
          });
          return;
        }
      }

      const { error } = await supabase
        .from("client_approvers")
        .delete()
        .eq("id", approverId);

      if (error) throw error;

      toast({
        title: "Aprovador removido",
        description: "O aprovador foi removido permanentemente."
      });

      loadApprovers(clientId!);
    } catch (error) {
      console.error("Erro ao deletar aprovador:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível deletar o aprovador."
      });
    } finally {
      setDeleteDialogOpen(false);
      setApproverToDelete(null);
    }
  };

  const handleReactivateApprover = async (approverId: string) => {
    try {
      const { error } = await supabase
        .from("client_approvers")
        .update({ is_active: true })
        .eq("id", approverId);

      if (error) throw error;

      toast({
        title: "Aprovador reativado",
        description: "O aprovador foi reativado com sucesso."
      });

      loadApprovers(clientId!);
    } catch (error) {
      console.error("Erro ao reativar aprovador:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível reativar o aprovador."
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!clientId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Erro</CardTitle>
          <CardDescription>Não foi possível identificar o cliente.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-6xl pb-20 md:pb-6">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Aprovadores de Conteúdo</CardTitle>
              <CardDescription>
                Gerencie os aprovadores de conteúdo para {clientName}
              </CardDescription>
            </div>
          </div>
          <Button 
            onClick={() => setAddDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Adicionar Aprovador
          </Button>
        </CardHeader>
        <CardContent>
          {approvers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Nenhum aprovador cadastrado ainda.
              </p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar Primeiro Aprovador
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop: Tabela */}
              {!isMobile && (
                <div className="rounded-md border">
                  <div className="grid grid-cols-[2fr,2fr,1fr,1fr,120px] gap-4 p-4 bg-muted/50 font-medium text-sm">
                    <div>Nome</div>
                    <div>Contato</div>
                    <div>Tipo</div>
                    <div>Status</div>
                    <div className="text-right">Ações</div>
                  </div>
                  <div className="divide-y">
                    {approvers.map((approver) => (
                      <div key={approver.id} className="grid grid-cols-[2fr,2fr,1fr,1fr,120px] gap-4 p-4 items-center">
                        <div className="font-medium">{approver.name}</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center">
                            <Mail className="h-3 w-3 mr-1 text-muted-foreground" />
                            {approver.email}
                          </div>
                          {approver.whatsapp && (
                            <div className="flex items-center">
                              <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                              {approver.whatsapp}
                            </div>
                          )}
                        </div>
                        <div>
                          {approver.is_primary ? (
                            <Badge variant="default">Principal</Badge>
                          ) : (
                            <Badge variant="outline">Secundário</Badge>
                          )}
                        </div>
                        <div>
                          {approver.is_active ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inativo
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleEditApprover(approver)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              {approver.is_active ? (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setApproverToDelete(approver);
                                      setDeleteDialogOpen(true);
                                    }}
                                    className="text-orange-600"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Desativar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteApprover(approver.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Deletar
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <DropdownMenuItem 
                                  onClick={() => handleReactivateApprover(approver.id)}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Reativar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mobile: Cards */}
              {isMobile && (
                <div className="space-y-4">
                  {approvers.map((approver) => (
                    <Card key={approver.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <CardTitle className="text-base">{approver.name}</CardTitle>
                            <div className="flex gap-2 flex-wrap">
                              {approver.is_primary ? (
                                <Badge variant="default" className="text-xs">Principal</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">Secundário</Badge>
                              )}
                              {approver.is_active ? (
                                <Badge variant="default" className="bg-green-500 text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Ativo
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Inativo
                                </Badge>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleEditApprover(approver)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              {approver.is_active ? (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setApproverToDelete(approver);
                                      setDeleteDialogOpen(true);
                                    }}
                                    className="text-orange-600"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Desativar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteApprover(approver.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Deletar
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <DropdownMenuItem 
                                  onClick={() => handleReactivateApprover(approver.id)}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Reativar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="break-all">{approver.email}</span>
                          </div>
                          {approver.whatsapp && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span>{approver.whatsapp}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AddApproverDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        clientId={clientId}
        onSuccess={() => {
          loadApprovers(clientId);
          setAddDialogOpen(false);
        }}
      />

      {selectedApprover && (
        <EditApproverDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          approver={{
            ...selectedApprover,
            whatsapp: selectedApprover.whatsapp || ''
          }}
          onSuccess={() => {
            loadApprovers(clientId);
            setEditDialogOpen(false);
          }}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar Aprovador</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar {approverToDelete?.name}? 
              Este aprovador não poderá mais aprovar conteúdos até ser reativado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => approverToDelete && handleDeactivateApprover(approverToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

