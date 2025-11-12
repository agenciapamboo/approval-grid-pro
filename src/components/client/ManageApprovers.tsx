import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Mail, Phone, CheckCircle, XCircle } from "lucide-react";
import { AddApproverDialog } from "@/components/admin/AddApproverDialog";
import { EditApproverDialog } from "@/components/admin/EditApproverDialog";

interface Approver {
  id: string;
  name: string;
  email: string;
  whatsapp?: string;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
}

export function ManageApprovers() {
  const { toast } = useToast();
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedApprover, setSelectedApprover] = useState<Approver | null>(null);

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

  const handleEditApprover = (approver: Approver) => {
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gerenciar Aprovadores</CardTitle>
              <CardDescription>
                Gerencie quem pode aprovar conteúdos de {clientName}
              </CardDescription>
            </div>
            <Button onClick={() => setAddDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar Aprovador
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {approvers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum aprovador cadastrado ainda.
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
                      <div className="space-y-1">
                        {approver.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3" />
                            {approver.email}
                          </div>
                        )}
                        {approver.whatsapp && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-3 w-3" />
                            {approver.whatsapp}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={approver.is_primary ? "default" : "outline"}>
                        {approver.is_primary ? "Principal" : "Secundário"}
                      </Badge>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditApprover(approver)}
                      >
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
          approver={selectedApprover as any}
          onSuccess={() => {
            loadApprovers(clientId);
            setEditDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}
