import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Pencil } from "lucide-react";

interface Agency {
  id: string;
  name: string;
  slug: string;
  brand_primary?: string;
  brand_secondary?: string;
  logo_url?: string;
  webhook_url?: string;
  email?: string;
  whatsapp?: string;
  plan?: string;
  plan_renewal_date?: string;
  plan_type?: 'monthly' | 'annual' | null;
  last_payment_date?: string;
}

interface EditAgencyDialogProps {
  agency: Agency;
  onAgencyUpdated: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function EditAgencyDialog({ agency, onAgencyUpdated, open: controlledOpen, onOpenChange, trigger }: EditAgencyDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: agency.name,
    slug: agency.slug,
    brand_primary: agency.brand_primary || "#2563eb",
    brand_secondary: agency.brand_secondary || "#8b5cf6",
    logo_url: agency.logo_url || "",
    webhook_url: agency.webhook_url || "",
    email: agency.email || "",
    whatsapp: agency.whatsapp || "",
    plan: agency.plan || "free",
    plan_type: agency.plan_type || "monthly" as 'monthly' | 'annual',
    last_payment_date: agency.last_payment_date || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Encrypt sensitive data
      const updateData: any = {
        name: formData.name,
        slug: formData.slug,
        brand_primary: formData.brand_primary,
        brand_secondary: formData.brand_secondary,
        logo_url: formData.logo_url || null,
        plan: formData.plan,
        plan_type: formData.plan_type,
        last_payment_date: formData.last_payment_date || null,
      };

      if (formData.email) {
        const { data: emailEnc } = await supabase.rpc('encrypt_social_token', {
          token: formData.email
        });
        updateData.email_encrypted = emailEnc;
      }

      if (formData.whatsapp) {
        const { data: whatsappEnc } = await supabase.rpc('encrypt_social_token', {
          token: formData.whatsapp
        });
        updateData.whatsapp_encrypted = whatsappEnc;
      }

      if (formData.webhook_url) {
        const { data: webhookEnc } = await supabase.rpc('encrypt_social_token', {
          token: formData.webhook_url
        });
        updateData.webhook_url_encrypted = webhookEnc;
      }

      const { error } = await supabase
        .from("agencies")
        .update(updateData)
        .eq("id", agency.id);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Agência atualizada com sucesso.",
      });

      setOpen(false);
      onAgencyUpdated();
    } catch (error) {
      console.error("Error updating agency:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar a agência.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button variant="outline" size="sm">
            <Pencil className="w-4 h-4 mr-2" />
            Editar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Agência</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Agência</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug (identificador único)</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              required
              pattern="[a-z0-9-]+"
              title="Apenas letras minúsculas, números e hífens"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contato@agencia.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              type="tel"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              placeholder="+55 11 99999-9999"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plan">Plano</Label>
              <Input
                id="plan"
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                placeholder="free"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan_type">Tipo de Renovação</Label>
              <select
                id="plan_type"
                value={formData.plan_type}
                onChange={(e) => setFormData({ ...formData, plan_type: e.target.value as 'monthly' | 'annual' })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="monthly">Mensal</option>
                <option value="annual">Anual</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_payment_date">Data do Último Pagamento</Label>
            <Input
              id="last_payment_date"
              type="date"
              value={formData.last_payment_date ? formData.last_payment_date.split('T')[0] : ''}
              onChange={(e) => setFormData({ ...formData, last_payment_date: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              A data de renovação será calculada automaticamente com base no tipo de plano
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand_primary">Cor Primária</Label>
              <div className="flex gap-2">
                <Input
                  id="brand_primary"
                  type="color"
                  value={formData.brand_primary}
                  onChange={(e) => setFormData({ ...formData, brand_primary: e.target.value })}
                  className="w-12 h-10 p-1"
                />
                <Input
                  type="text"
                  value={formData.brand_primary}
                  onChange={(e) => setFormData({ ...formData, brand_primary: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand_secondary">Cor Secundária</Label>
              <div className="flex gap-2">
                <Input
                  id="brand_secondary"
                  type="color"
                  value={formData.brand_secondary}
                  onChange={(e) => setFormData({ ...formData, brand_secondary: e.target.value })}
                  className="w-12 h-10 p-1"
                />
                <Input
                  type="text"
                  value={formData.brand_secondary}
                  onChange={(e) => setFormData({ ...formData, brand_secondary: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo_url">URL do Logo (opcional)</Label>
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

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
