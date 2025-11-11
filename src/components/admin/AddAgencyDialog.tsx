import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Eye, EyeOff } from "lucide-react";
import { getErrorMessage } from "@/lib/error-messages";

interface AddAgencyDialogProps {
  onAgencyAdded: () => void;
}

export function AddAgencyDialog({ onAgencyAdded }: AddAgencyDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    email: "",
    password: "",
    brand_primary: "#00B878",
    brand_secondary: "#0072CE",
    logo_url: "",
    webhook_url: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Encrypt sensitive data first
      const { data: emailEnc } = await supabase.rpc('encrypt_social_token', {
        token: formData.email
      });
      const { data: webhookEnc } = formData.webhook_url 
        ? await supabase.rpc('encrypt_social_token', { token: formData.webhook_url })
        : { data: null };

      // Create agency first
      const { data: agencyData, error: agencyError } = await supabase
        .from("agencies")
        .insert([{
          name: formData.name,
          slug: formData.slug,
          brand_primary: formData.brand_primary,
          brand_secondary: formData.brand_secondary,
          logo_url: formData.logo_url,
          email_encrypted: emailEnc,
          webhook_url_encrypted: webhookEnc,
        }])
        .select()
        .single();

      if (agencyError) throw agencyError;

      // Create agency admin user
      if (formData.email && formData.password) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { 
              name: formData.name,
              accountType: 'agency'
            },
          },
        });

        if (authError) throw authError;

        // Update the profile with agency_id
        if (authData.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ agency_id: agencyData.id })
            .eq("id", authData.user.id);

          if (profileError) throw profileError;
        }
      }

      toast({
        title: "Sucesso",
        description: "Agência e usuário admin cadastrados com sucesso!",
      });

      setFormData({
        name: "",
        slug: "",
        email: "",
        password: "",
        brand_primary: "#00B878",
        brand_secondary: "#0072CE",
        logo_url: "",
        webhook_url: "",
      });
      setOpen(false);
      onAgencyAdded();
    } catch (error: any) {
      console.error('[ADD_AGENCY] Erro:', error);
      const errorMsg = getErrorMessage(error);
      
      toast({
        title: "Erro ao cadastrar agência",
        description: errorMsg,
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
          Adicionar Agência
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cadastrar Nova Agência</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Agência *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Nome da agência"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL) *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              required
              placeholder="slug-da-agencia"
            />
            <p className="text-xs text-muted-foreground">
              Será usado na URL: /{formData.slug || 'slug-da-agencia'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email do Admin *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="admin@agencia.com"
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand_primary">Cor Primária</Label>
              <Input
                id="brand_primary"
                type="color"
                value={formData.brand_primary}
                onChange={(e) => setFormData({ ...formData, brand_primary: e.target.value })}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand_secondary">Cor Secundária</Label>
              <Input
                id="brand_secondary"
                type="color"
                value={formData.brand_secondary}
                onChange={(e) => setFormData({ ...formData, brand_secondary: e.target.value })}
                className="h-10"
              />
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

          <div className="space-y-2">
            <Label htmlFor="webhook_url">Webhook URL (n8n)</Label>
            <Input
              id="webhook_url"
              type="url"
              value={formData.webhook_url}
              onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
              placeholder="https://seu-n8n.com/webhook/..."
            />
            <p className="text-xs text-muted-foreground">
              URL do webhook n8n para notificações de mudanças de status
            </p>
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
