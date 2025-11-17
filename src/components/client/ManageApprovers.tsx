import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Mail, Phone, CheckCircle, XCircle, Edit } from "lucide-react";
import { AddApproverDialog } from "@/components/admin/AddApproverDialog";
import { EditApproverDialog } from "@/components/admin/EditApproverDialog";

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
  const [approvers, setApprovers] = useState<ClientApprover[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedApprover, setSelectedApprover] = useState<ClientApprover | null>(null);

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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditApprover(approver)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
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

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t sm:hidden pb-safe z-50">
        <div className="container mx-auto px-4 py-3">
          <Button 
            onClick={() => setAddDialogOpen(true)}
            className="w-full"
            size="lg"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Adicionar Aprovador
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
    </div>
  );
}

