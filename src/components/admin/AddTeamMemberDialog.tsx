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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

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
        description: `${formData.name} foi adicionado à equipe com sucesso. Um email foi enviado com instruções.`,
      });

      setFormData({
        name: "",
        email: "",
        functions: [],
      });
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error adding team member:', error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao adicionar membro da equipe. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Membro da Equipe</DialogTitle>
          <DialogDescription>
            Preencha os dados do novo membro. Um email será enviado com instruções para definir a senha.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="João Silva"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="joao@exemplo.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Funções</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['designer', 'copywriter', 'estrategista', 'editor'] as const).map((func) => (
                <div key={func} className="flex items-center space-x-2">
                  <Checkbox
                    id={func}
                    checked={formData.functions.includes(func)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData({
                          ...formData,
                          functions: [...formData.functions, func],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          functions: formData.functions.filter((f) => f !== func),
                        });
                      }
                    }}
                  />
                  <Label htmlFor={func} className="text-sm font-normal capitalize cursor-pointer">
                    {func}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
