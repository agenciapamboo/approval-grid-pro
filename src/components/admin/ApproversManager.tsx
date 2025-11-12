import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Shield, Mail, Phone, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddApproverDialog } from "./AddApproverDialog";
import { EditApproverDialog } from "./EditApproverDialog";
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
      // Verificar se é o único aprovador primário ativo
      if (deletingApprover.is_primary) {
        const activePrimaryCount = approvers.filter(
          (a) => a.is_active && a.is_primary && a.id !== deletingApprover.id
        ).length;

        if (activePrimaryCount === 0) {
          toast({
            title: "Não é possível desativar",
            description: "Deve haver pelo menos um aprovador primário ativo. Promova outro aprovador a primário antes de desativar este.",
            variant: "destructive",
          });
          setDeletingApprover(null);
          return;
        }
      }

      // Soft delete - apenas desativar
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
        description: "Aprovador reativado com sucesso.",
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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Aprovadores de Conteúdo
              </CardTitle>
              <CardDescription>
                Gerenciar aprovadores para {clientName}
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Aprovador
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando aprovadores...
            </div>
          ) : approvers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum aprovador cadastrado. Clique em "Adicionar Aprovador" para começar.
            </div>
          ) : (
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
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{approver.email}</span>
                        </div>
                        {approver.whatsapp && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{approver.whatsapp}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {approver.is_primary ? (
                        <Badge variant="default">Primário</Badge>
                      ) : (
                        <Badge variant="outline">Secundário</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {approver.is_active ? (
                        <Badge variant="success" className="flex items-center gap-1 w-fit">
                          <CheckCircle className="h-3 w-3" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                          <XCircle className="h-3 w-3" />
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {approver.is_active ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingApprover(approver)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingApprover(approver)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReactivate(approver.id)}
                          >
                            Reativar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
            <AlertDialogTitle>Desativar aprovador?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar {deletingApprover?.name}? Ele não poderá mais fazer login
              via 2FA, mas poderá ser reativado posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Desativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
