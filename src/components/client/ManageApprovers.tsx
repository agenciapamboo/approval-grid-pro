import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Mail, Phone, CheckCircle, XCircle, Edit, Menu, ArrowLeft } from "lucide-react";
import { AddApproverDialog } from "@/components/admin/AddApproverDialog";
import { EditApproverDialog } from "@/components/admin/EditApproverDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ClientUserSidebar } from "@/components/client/ClientUserSidebar";

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
  const navigate = useNavigate();
  const [approvers, setApprovers] = useState<ClientApprover[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedApprover, setSelectedApprover] = useState<ClientApprover | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [approverToDelete, setApproverToDelete] = useState<ClientApprover | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="flex-1 overflow-auto pb-20 sm:pb-4">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Aprovadores de Conteúdo</CardTitle>
              <CardDescription>
                Gerencie os aprovadores de conteúdo para {clientName}
              </CardDescription>
            </div>
            <Button 
              onClick={() => setAddDialogOpen(true)}
              className="hidden sm:flex"
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="hidden md:table-cell">Contato</TableHead>
                      <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvers.map((approver) => (
                      <TableRow key={approver.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{approver.name}</div>
                            <div className="text-xs text-muted-foreground md:hidden">
                              {approver.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="space-y-1">
                            <div className="flex items-center text-sm">
                              <Mail className="h-3 w-3 mr-1 text-muted-foreground" />
                              {approver.email}
                            </div>
                            {approver.whatsapp && (
                              <div className="flex items-center text-sm">
                                <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                                {approver.whatsapp}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {approver.is_primary ? (
                            <Badge variant="default">Principal</Badge>
                          ) : (
                            <Badge variant="outline">Secundário</Badge>
                          )}
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditApprover(approver)}
                              title="Editar aprovador"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            
                            {approver.is_active ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setApproverToDelete(approver);
                                  setDeleteDialogOpen(true);
                                }}
                                title="Desativar aprovador"
                                className="text-destructive hover:text-destructive"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReactivateApprover(approver.id)}
                                title="Reativar aprovador"
                                className="text-green-600 hover:text-green-700"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-sidebar border-t sm:hidden pb-safe z-50">
        <div className="flex items-center justify-around h-16 px-4">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex flex-col items-center gap-1 text-sidebar-foreground hover:bg-sidebar-accent h-auto py-2"
              >
                <Menu className="h-5 w-5" />
                <span className="text-xs">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-sidebar">
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-sidebar-border">
                  <h2 className="text-lg font-semibold text-sidebar-foreground">Menu Principal</h2>
                </div>
                <ClientUserSidebar />
              </div>
            </SheetContent>
          </Sheet>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="flex flex-col items-center gap-1 text-sidebar-foreground hover:bg-sidebar-accent h-auto py-2"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-xs">Voltar</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAddDialogOpen(true)}
            className="flex flex-col items-center gap-1 text-primary hover:bg-primary/10 h-auto py-2"
          >
            <UserPlus className="h-5 w-5" />
            <span className="text-xs">Adicionar</span>
          </Button>
        </div>
      </div>

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

