import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/error-messages";

interface AddTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  onSuccess: () => void;
}

export function AddTeamMemberDialog({
  open,
  onOpenChange,
  agencyId,
  onSuccess,
}: AddTeamMemberDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call edge function to create team member
      const { data, error } = await supabase.functions.invoke('create-team-member', {
        body: {
          name: formData.name,
          email: formData.email,
        },
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.message || 'Falha ao criar membro da equipe');
      }

      toast({
        title: "Membro adicionado",
        description: `${formData.name} foi adicionado à equipe com sucesso.`,
      });

      setFormData({
        name: "",
        email: "",
        password: "",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('[ADD_TEAM_MEMBER] Erro:', error);
      
      let errorMsg = "Erro ao adicionar membro da equipe";
      
      // Handle specific error cases
      if (error.message?.includes('already been registered')) {
        errorMsg = "Este email já está cadastrado no sistema";
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      toast({
        variant: "destructive",
        title: "Erro ao adicionar membro",
        description: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Adicionar Membro da Equipe</DialogTitle>
            <DialogDescription>
              Adicione um novo membro à equipe da agência. Um email de confirmação será enviado automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
