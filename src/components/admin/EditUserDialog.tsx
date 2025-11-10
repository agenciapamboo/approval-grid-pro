import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface UserData {
  id: string;
  email: string;
  name: string;
  account_type: string;
  role: string;
  client_id?: string;
  agency_id?: string;
  is_active: boolean;
}

interface EditUserDialogProps {
  user: UserData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditUserDialog({ user, open, onOpenChange, onSuccess }: EditUserDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    client_id: "",
    agency_id: "",
    role: "",
    account_type: ""
  });

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch agencies
  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agencies')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Initialize form when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        client_id: user.client_id || "",
        agency_id: user.agency_id || "",
        role: user.role || "",
        account_type: user.account_type || ""
      });
    }
  }, [user]);

  const detectInconsistencies = () => {
    const issues: string[] = [];
    
    if (formData.role === 'client_user' && !formData.client_id) {
      issues.push('client_user deve ter um cliente vinculado');
    }
    
    if (formData.role === 'agency_admin' && !formData.agency_id) {
      issues.push('agency_admin deve ter uma agência vinculada');
    }
    
    if (formData.role === 'creator' && (formData.client_id && formData.client_id !== "" || formData.agency_id && formData.agency_id !== "")) {
      issues.push('creator não deve ter vínculos com cliente ou agência');
    }
    
    if (formData.account_type === 'agency' && formData.role !== 'agency_admin') {
      issues.push('account_type "agency" deve ter role "agency_admin"');
    }

    if (formData.account_type === 'creator' && formData.role !== 'creator') {
      issues.push('account_type "creator" deve ter role "creator"');
    }
    
    return issues;
  };

  const handleSave = async () => {
    const inconsistencies = detectInconsistencies();
    
    if (inconsistencies.length > 0) {
      toast({
        title: "Inconsistências detectadas",
        description: inconsistencies.join(', '),
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke('admin-edit-user', {
        body: {
          userId: user?.id,
          updates: {
            name: formData.name,
            client_id: formData.client_id || null,
            agency_id: formData.agency_id || null,
            role: formData.role || null,
            account_type: formData.account_type || null
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso"
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar usuário",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const inconsistencies = detectInconsistencies();

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label>Email (não editável)</Label>
            <Input value={user.email} disabled className="bg-muted" />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome do usuário"
            />
          </div>

          {/* Account Type */}
          <div className="space-y-2">
            <Label htmlFor="account_type">Tipo de Conta</Label>
            <Select
              value={formData.account_type || ""}
              onValueChange={(value) => setFormData({ ...formData, account_type: value })}
            >
              <SelectTrigger id="account_type">
                <SelectValue placeholder="Selecione o tipo de conta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhum</SelectItem>
                <SelectItem value="creator">Creator</SelectItem>
                <SelectItem value="agency">Agência</SelectItem>
                <SelectItem value="client">Cliente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={formData.role || ""}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Selecione a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhuma</SelectItem>
                <SelectItem value="creator">Creator</SelectItem>
                <SelectItem value="client_user">Client User</SelectItem>
                <SelectItem value="agency_admin">Agency Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Client */}
          <div className="space-y-2">
            <Label htmlFor="client">Cliente</Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) => setFormData({ ...formData, client_id: value })}
            >
              <SelectTrigger id="client">
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhum</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Agency */}
          <div className="space-y-2">
            <Label htmlFor="agency">Agência</Label>
            <Select
              value={formData.agency_id}
              onValueChange={(value) => setFormData({ ...formData, agency_id: value })}
            >
              <SelectTrigger id="agency">
                <SelectValue placeholder="Selecione uma agência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhuma</SelectItem>
                {agencies.map((agency) => (
                  <SelectItem key={agency.id} value={agency.id}>
                    {agency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Inconsistency warnings */}
          {inconsistencies.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-2">Problemas detectados:</p>
                <ul className="list-disc list-inside space-y-1">
                  {inconsistencies.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || inconsistencies.length > 0}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
