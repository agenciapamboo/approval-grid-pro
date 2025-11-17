import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Shield, Mail, Phone, Edit, Trash2, CheckCircle, XCircle, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddApproverDialog } from "./AddApproverDialog";
import { EditApproverDialog } from "./EditApproverDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Approver {
  id: string;
  client_id: string;
  name: string;
  email: string;
  whatsapp: string | null;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
}

interface ApproversManagerProps {
  clientId: string;
  clientName: string;
}

export function ApproversManager({ clientId, clientName }: ApproversManagerProps) {
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingApprover, setEditingApprover] = useState<Approver | null>(null);
  const [deletingApprover, setDeletingApprover] = useState<Approver | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const loadApprovers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("client_approvers")
        .select("*")
        .eq("client_id", clientId)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      setApprovers(data || []);
    } catch (error: any) {
      console.error("Error loading approvers:", error);
      toast({
        title: "Erro ao carregar aprovadores",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovers();
  }, [clientId]);

  const handleDelete = async () => {
    if (!deletingApprover) return;

    try {
      if (deletingApprover.is_primary) {
        const activePrimaryCount = approvers.filter(
          (a) => a.is_active && a.is_primary && a.id !== deletingApprover.id
        ).length;

        if (activePrimaryCount === 0) {
          toast({
            title: "Não é possível desativar",
            description: "Deve haver pelo menos um aprovador primário ativo.",
            variant: "destructive",
          });
          setDeletingApprover(null);
          return;
        }
      }

      const { error } = await supabase
        .from("client_approvers")
        .update({ is_active: false })
        .eq("id", deletingApprover.id);

      if (error) throw error;

      toast({
        title: "Aprovador desativado",
        description: `${deletingApprover.name} foi desativado com sucesso.`,
      });

      loadApprovers();
    } catch (error: any) {
      console.error("Error deleting approver:", error);
      toast({
        title: "Erro ao desativar aprovador",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingApprover(null);
    }
  };

  const handleReactivate = async (approverId: string) => {
    try {
      const { error } = await supabase
        .from("client_approvers")
        .update({ is_active: true })
        .eq("id", approverId);

      if (error) throw error;

      toast({
        title: "Aprovador reativado",
        description: "O aprovador foi reativado com sucesso.",
      });

      loadApprovers();
    } catch (error: any) {
      console.error("Error reactivating approver:", error);
      toast({
        title: "Erro ao reativar aprovador",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Aprovadores de Conteúdo
            </CardTitle>
            <CardDescription className="mt-2">
              Gerenciar aprovadores para {clientName}
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddDialog(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Aprovador
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {approvers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum aprovador cadastrado.</p>
          </div>
        ) : (
          <>
            {!isMobile && (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvers.map((approver) => (
                      <TableRow key={approver.id}>
                        <TableCell className="font-medium">{approver.name}</TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell>
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
                              onClick={() => setEditingApprover(approver)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {approver.is_active ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingApprover(approver)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReactivate(approver.id)}
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
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

            {isMobile && (
              <div className="space-y-4">
                {approvers.map((approver) => (
                  <Card key={approver.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{approver.name}</CardTitle>
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
                            <Button variant="ghost" size="sm" className="ml-2 flex-shrink-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => setEditingApprover(approver)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            {approver.is_active ? (
                              <DropdownMenuItem 
                                onClick={() => setDeletingApprover(approver)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Desativar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => handleReactivate(approver.id)}
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
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center break-all">
                        <Mail className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                        <span>{approver.email}</span>
                      </div>
                      {approver.whatsapp && (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                          <span>{approver.whatsapp}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>

      <AddApproverDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        clientId={clientId}
        onSuccess={loadApprovers}
      />

      {editingApprover && (
        <EditApproverDialog
          open={!!editingApprover}
          onOpenChange={(open) => !open && setEditingApprover(null)}
          approver={editingApprover}
          onSuccess={loadApprovers}
        />
      )}

      <AlertDialog open={!!deletingApprover} onOpenChange={(open) => !open && setDeletingApprover(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar aprovador</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar {deletingApprover?.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
