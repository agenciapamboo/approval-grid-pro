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
import { Checkbox } from "@/components/ui/checkbox";
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
    functions: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call edge function to create team member
      const { data, error: functionError } = await supabase.functions.invoke('create-team-member', {
        body: {
          name: formData.name,
          email: formData.email,
          functions: formData.functions,
        },
      });

      // Check for function invocation errors
      if (functionError) {
        // Extract error message from function error
        const errorMessage = functionError.message || 'Erro ao chamar função de cadastro';
        
        if (errorMessage.includes('already been registered')) {
          throw new Error('Este email já está cadastrado no sistema');
        }
        
        throw new Error(errorMessage);
      }
      
      // Check for application-level errors in response
      if (!data?.success) {
        const errorMessage = data?.message || 'Falha ao criar membro da equipe';
        
        if (errorMessage.includes('already been registered')) {
          throw new Error('Este email já está cadastrado no sistema');
        }
        
        throw new Error(errorMessage);
      }

      toast({
        title: "Membro adicionado",
        description: `${formData.name} foi adicionado à equipe com sucesso.`,
      });

      setFormData({
        name: "",
        email: "",
        password: "",
        functions: [],
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('[ADD_TEAM_MEMBER] Erro:', error);
      
      let errorMsg = error.message || "Erro ao adicionar membro da equipe";
      
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
            
            <div className="grid gap-2">
              <Label>Funções / Departamentos</Label>
              <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg">
                {[
                  { id: 'atendimento', label: 'Atendimento' },
                  { id: 'planejamento', label: 'Planejamento' },
                  { id: 'redacao', label: 'Redação' },
                  { id: 'design', label: 'Design' },
                  { id: 'audiovisual', label: 'Audiovisual' },
                  { id: 'revisao', label: 'Revisão' },
                  { id: 'publicacao', label: 'Publicação' },
                  { id: 'trafego', label: 'Tráfego' },
                ].map((func) => (
                  <div key={func.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={func.id}
                      checked={formData.functions.includes(func.id)}
                      onCheckedChange={(checked) => {
                        setFormData({
                          ...formData,
                          functions: checked
                            ? [...formData.functions, func.id]
                            : formData.functions.filter((f) => f !== func.id),
                        });
                      }}
                    />
                    <label
                      htmlFor={func.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {func.label}
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Selecione uma ou mais funções para este membro
              </p>
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
