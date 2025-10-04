import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Profile {
  id: string;
  name: string;
  role: string;
  plan?: string;
  plan_renewal_date?: string;
}

interface UserProfileDialogProps {
  user: any;
  profile: Profile | null;
  onUpdate: () => void;
}

export function UserProfileDialog({ user, profile, onUpdate }: UserProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: profile?.name || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ name: formData.name })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!",
      });

      setOpen(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar perfil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Não definido";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getPlanLabel = (plan?: string) => {
    const plans: Record<string, string> = {
      free: "Gratuito",
      basic: "Básico",
      pro: "Profissional",
      enterprise: "Empresarial",
    };
    return plans[plan || "free"] || plan || "Gratuito";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Minha Conta">
          <User className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Minha Conta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dados Cadastrais */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">Dados Cadastrais</h3>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="text-sm font-medium">{user?.email}</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-2">
                  <div>
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" size="sm" disabled={loading}>
                    {loading ? "Salvando..." : "Salvar Nome"}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>

          {/* Plano e Renovação */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">Plano e Assinatura</h3>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Plano Atual</Label>
                  <p className="text-sm font-medium">{getPlanLabel(profile?.plan)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data de Renovação</Label>
                  <p className="text-sm font-medium">{formatDate(profile?.plan_renewal_date)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
