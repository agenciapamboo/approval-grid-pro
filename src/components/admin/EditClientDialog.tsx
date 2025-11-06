import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Share2 } from "lucide-react";
import { SocialAccountsDialog } from "./SocialAccountsDialog";

interface Client {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  agency_id: string;
  email?: string | null;
  cnpj?: string | null;
  plan_renewal_date?: string | null;
  website?: string | null;
  whatsapp?: string | null;
  address?: string | null;
}

interface EditClientDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditClientDialog({ client, open, onOpenChange, onSuccess }: EditClientDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [socialDialogOpen, setSocialDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    email: "",
    cnpj: "",
    plan_renewal_date: "",
    website: "",
    whatsapp: "",
    address: "",
    monthly_creatives: 0,
    note: "",
    password: "",
  });
  const [notificationPreferences, setNotificationPreferences] = useState({
    notify_email: true,
    notify_whatsapp: false,
    notify_webhook: true,
  });

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || "",
        slug: client.slug || "",
        email: client.email || "",
        cnpj: client.cnpj || "",
        plan_renewal_date: client.plan_renewal_date 
          ? new Date(client.plan_renewal_date).toISOString().split('T')[0]
          : "",
        website: client.website || "",
        whatsapp: client.whatsapp || "",
        address: client.address || "",
        monthly_creatives: (client as any).monthly_creatives || 0,
        note: "",
        password: "",
      });

      // Inicializa preferências a partir do cliente
      setNotificationPreferences({
        notify_email: (client as any).notify_email ?? true,
        notify_whatsapp: (client as any).notify_whatsapp ?? false,
        notify_webhook: true, // Webhook sempre ativo
      });
    }
  }, [client]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    setLoading(true);
    try {
      // Update client data
      const { error: updateError } = await supabase
        .from("clients")
        .update({
          name: formData.name,
          slug: formData.slug,
          email: formData.email || null,
          cnpj: formData.cnpj || null,
          plan_renewal_date: formData.plan_renewal_date || null,
          website: formData.website || null,
          whatsapp: formData.whatsapp || null,
          address: formData.address || null,
          monthly_creatives: formData.monthly_creatives,
          notify_email: notificationPreferences.notify_email,
          notify_whatsapp: notificationPreferences.notify_whatsapp,
          notify_webhook: notificationPreferences.notify_webhook,
        })
        .eq("id", client.id);

      if (updateError) throw updateError;

      // Update password if provided
      if (formData.password.trim()) {
        // Get user by email
        const { data: userData } = await supabase
          .from("profiles")
          .select("id")
          .eq("client_id", client.id)
          .single();

        if (userData) {
          const { error: passwordError } = await supabase.auth.admin.updateUserById(
            userData.id,
            { password: formData.password }
          );

          if (passwordError) {
            console.error("Erro ao atualizar senha:", passwordError);
            toast({
              title: "Aviso",
              description: "Dados atualizados, mas não foi possível alterar a senha",
              variant: "destructive",
            });
          }
        }
      }

      // Insert note if provided
      if (formData.note.trim()) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        const { error: noteError } = await supabase
          .from("client_notes")
          .insert({
            client_id: client.id,
            note: formData.note.trim(),
            created_by: user.id,
          });

        if (noteError) throw noteError;
      }


      toast({
        title: "Sucesso",
        description: "Dados do cliente atualizados com sucesso!",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar cliente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!client) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Editar Cliente</DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSocialDialogOpen(true)}
                type="button"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Redes Sociais
              </Button>
            </div>
          </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL) *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              placeholder="slug-do-cliente"
              required
            />
            <p className="text-xs text-muted-foreground">
              O slug será usado para gerar links de aprovação com tokens de acesso temporário (7 dias)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contato@cliente.com.br"
              required
            />
            <p className="text-xs text-muted-foreground">
              Este email será usado para o cliente fazer login no sistema
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Nova Senha (deixe em branco para manter)</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              value={formData.cnpj}
              onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
              placeholder="00.000.000/0000-00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan_renewal_date">Data de Vencimento</Label>
            <Input
              id="plan_renewal_date"
              type="date"
              value={formData.plan_renewal_date}
              onChange={(e) => setFormData({ ...formData, plan_renewal_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Site</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://exemplo.com.br"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Rua, número, bairro, cidade - Estado"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthly_creatives">Criativos por Mês</Label>
            <Input
              id="monthly_creatives"
              type="number"
              min="0"
              value={formData.monthly_creatives}
              onChange={(e) => setFormData({ ...formData, monthly_creatives: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Nova Observação</Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Digite uma observação sobre o cliente..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              A observação será registrada com data e hora automaticamente
            </p>
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <h3 className="font-semibold">Preferências de Notificação</h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="notify_email" className="flex flex-col gap-1">
                <span>E-mail</span>
                <span className="text-xs text-muted-foreground font-normal">
                  Receber notificações por e-mail
                </span>
              </Label>
              <Switch
                id="notify_email"
                checked={notificationPreferences.notify_email}
                onCheckedChange={(checked) =>
                  setNotificationPreferences({ ...notificationPreferences, notify_email: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notify_whatsapp" className="flex flex-col gap-1">
                <span>WhatsApp</span>
                <span className="text-xs text-muted-foreground font-normal">
                  Receber notificações por WhatsApp
                </span>
              </Label>
              <Switch
                id="notify_whatsapp"
                checked={notificationPreferences.notify_whatsapp}
                onCheckedChange={(checked) =>
                  setNotificationPreferences({ ...notificationPreferences, notify_whatsapp: checked })
                }
              />
            </div>

            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">Webhook</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  Sempre Ativo
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Os webhooks são sempre enviados para integração com sistemas externos, independente das outras configurações. As preferências de email e WhatsApp são incluídas no payload.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {client && (
      <SocialAccountsDialog
        clientId={client.id}
        open={socialDialogOpen}
        onOpenChange={setSocialDialogOpen}
      />
    )}
  </>
  );
}
