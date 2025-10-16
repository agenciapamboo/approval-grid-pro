import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { z } from "zod";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z
    .string()
    .min(8, "A senha deve ter no mínimo 8 caracteres")
    .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "A senha deve conter pelo menos um número")
    .regex(/[^A-Za-z0-9]/, "A senha deve conter pelo menos um caractere especial"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

interface Profile {
  id: string;
  name: string;
  role: string;
  plan?: string;
  plan_renewal_date?: string;
  client_id?: string;
}

interface UserProfileDialogProps {
  user: any;
  profile: Profile | null;
  onUpdate: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function UserProfileDialog({ user, profile, onUpdate, open: controlledOpen, onOpenChange: controlledOnOpenChange, trigger }: UserProfileDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: profile?.name || "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [notificationPreferences, setNotificationPreferences] = useState({
    notify_email: true,
    notify_whatsapp: false,
  });
  const [prefsLoading, setPrefsLoading] = useState(false);

  useEffect(() => {
    if (profile?.client_id) {
      loadClientPreferences();
    }
  }, [profile?.client_id]);

  const loadClientPreferences = async () => {
    if (!profile?.client_id) return;

    try {
      const { data, error } = await supabase
        .from("clients")
        .select("notify_email, notify_whatsapp")
        .eq("id", profile.client_id)
        .single();

      if (error) throw error;

      if (data) {
        setNotificationPreferences({
          notify_email: data.notify_email ?? true,
          notify_whatsapp: data.notify_whatsapp ?? false,
        });
      }
    } catch (error) {
      console.error("Erro ao carregar preferências:", error);
    }
  };

  const handleSavePreferences = async () => {
    if (!profile?.client_id) return;

    setPrefsLoading(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({
          notify_email: notificationPreferences.notify_email,
          notify_whatsapp: notificationPreferences.notify_whatsapp,
        })
        .eq("id", profile.client_id);

      if (error) throw error;

      toast({
        title: "Preferências atualizadas",
        description: "Suas preferências de notificação foram salvas com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar preferências",
        variant: "destructive",
      });
    } finally {
      setPrefsLoading(false);
    }
  };

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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validation = passwordSchema.safeParse(passwordData);
      
      if (!validation.success) {
        toast({
          title: "Erro de validação",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      setPasswordLoading(true);

      // Primeiro, verifica a senha atual fazendo login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordData.currentPassword,
      });

      if (signInError) {
        toast({
          title: "Erro",
          description: "Senha atual incorreta",
          variant: "destructive",
        });
        return;
      }

      // Atualiza a senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (updateError) throw updateError;

      toast({
        title: "Sucesso",
        description: "Senha alterada com sucesso!",
      });

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao alterar senha",
        variant: "destructive",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="icon" title="Minha Conta">
              <User className="w-4 h-4" />
            </Button>
          )}
        </DialogTrigger>
      )}
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

          {/* Alterar Senha */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">Segurança</h3>
              <form onSubmit={handlePasswordChange} className="space-y-3">
                <div>
                  <Label htmlFor="currentPassword">Senha Atual</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    disabled={passwordLoading}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    disabled={passwordLoading}
                    required
                    minLength={8}
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    disabled={passwordLoading}
                    required
                    minLength={8}
                  />
                </div>
                <Button type="submit" size="sm" disabled={passwordLoading}>
                  {passwordLoading ? "Alterando..." : "Alterar Senha"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Preferências de Notificação - Apenas para clientes */}
          {profile?.client_id && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground">Preferências de Notificação</h3>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify_email" className="flex flex-col gap-1 cursor-pointer">
                    <span>Notificações por E-mail</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      Receba atualizações sobre aprovações e rejeições por e-mail
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
                  <Label htmlFor="notify_whatsapp" className="flex flex-col gap-1 cursor-pointer">
                    <span>Notificações por WhatsApp</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      Receba atualizações sobre aprovações e rejeições via WhatsApp
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

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-4">
                    ℹ️ Independente das suas preferências, os webhooks sempre serão enviados para integração com sistemas externos.
                  </p>
                  <Button onClick={handleSavePreferences} disabled={prefsLoading} size="sm" className="w-full">
                    {prefsLoading ? "Salvando..." : "Salvar Preferências"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
