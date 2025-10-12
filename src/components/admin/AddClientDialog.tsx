import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Eye, EyeOff } from "lucide-react";

interface AddClientDialogProps {
  agencyId: string;
  onClientAdded: () => void;
}

export function AddClientDialog({ agencyId, onClientAdded }: AddClientDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    email: "",
    password: "",
    logo_url: "",
    webhook_url: "",
    timezone: "America/Sao_Paulo",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create client first
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .insert([{
          name: formData.name,
          slug: formData.slug,
          logo_url: formData.logo_url,
          timezone: formData.timezone,
          email: formData.email,
          agency_id: agencyId,
        }])
        .select()
        .single();

      if (clientError) throw clientError;

      // Create client user
      if (formData.email && formData.password) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { name: formData.name },
          },
        });

        if (authError) throw authError;

        // Update the profile with client_id and set role to client_user
        if (authData.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ 
              client_id: clientData.id,
              agency_id: agencyId,
              role: 'client_user'
            })
            .eq("id", authData.user.id);

          if (profileError) throw profileError;

          // Update user_roles table
          const { error: roleError } = await supabase
            .from("user_roles")
            .update({ role: 'client_user' })
            .eq("user_id", authData.user.id);

          if (roleError) throw roleError;
        }
      }

      toast({
        title: "Sucesso",
        description: "Cliente e usuário cadastrados com sucesso!",
      });

      setFormData({
        name: "",
        slug: "",
        email: "",
        password: "",
        logo_url: "",
        webhook_url: "",
        timezone: "America/Sao_Paulo",
      });
      setOpen(false);
      onClientAdded();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao cadastrar cliente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Cliente *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Nome do cliente"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL) *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              required
              placeholder="slug-do-cliente"
            />
            <p className="text-xs text-muted-foreground">
              Acesso sem senha: https://aprova.pamboocriativos.com.br/[slug-agencia]/{formData.slug || 'slug-cliente'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="cliente@empresa.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
                placeholder="••••••••"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo_url">URL do Logo</Label>
            <Input
              id="logo_url"
              type="url"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              placeholder="https://exemplo.com/logo.png"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
