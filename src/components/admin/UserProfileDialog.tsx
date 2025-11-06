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
  agency_id?: string;
}

interface ClientData {
  id: string;
  name: string;
  slug?: string;
  cnpj?: string;
  address?: string;
  email?: string;
  whatsapp?: string;
  agencySlug?: string;
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
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [clientLoading, setClientLoading] = useState(false);
  const [agencyData, setAgencyData] = useState<any>(null);
  const [agencyLoading, setAgencyLoading] = useState(false);
  const [agencyStats, setAgencyStats] = useState<{ clientCount: number; contentCount: number }>({ clientCount: 0, contentCount: 0 });

  useEffect(() => {
    if (profile?.client_id) {
      loadClientData();
    }
    if (profile?.agency_id && profile?.role === 'agency_admin') {
      loadAgencyData();
      loadAgencyStats();
    }
  }, [profile?.client_id, profile?.agency_id, profile?.role]);

  const loadClientData = async () => {
    if (!profile?.client_id) return;

    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, slug, cnpj, address, email, whatsapp, notify_email, notify_whatsapp, agency_id, agencies!inner(slug)")
        .eq("id", profile.client_id)
        .single();

      if (error) throw error;

      if (data) {
        setClientData({
          id: data.id,
          name: data.name,
          slug: data.slug || "",
          cnpj: data.cnpj || "",
          address: data.address || "",
          email: data.email || "",
          whatsapp: data.whatsapp || "",
          agencySlug: (data.agencies as any)?.slug || "",
        });
        setNotificationPreferences({
          notify_email: data.notify_email ?? true,
          notify_whatsapp: data.notify_whatsapp ?? false,
        });
      }
    } catch (error) {
      console.error("Erro ao carregar dados do cliente:", error);
    }
  };

  const loadAgencyData = async () => {
    if (!profile?.agency_id) return;

    setAgencyLoading(true);
    try {
      const { data, error } = await supabase
        .from("agencies")
        .select("id, name, slug, email, whatsapp, plan, plan_renewal_date, brand_primary, brand_secondary, logo_url")
        .eq("id", profile.agency_id)
        .single();

      if (error) throw error;
      setAgencyData(data);
    } catch (error) {
      console.error("Erro ao carregar dados da agência:", error);
    } finally {
      setAgencyLoading(false);
    }
  };

  const loadAgencyStats = async () => {
    if (!profile?.agency_id) return;

    try {
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id")
        .eq("agency_id", profile.agency_id);

      if (clientsError) throw clientsError;

      const { count: contentCount, error: contentsError } = await supabase
        .from("contents")
        .select("id", { count: 'exact', head: true })
        .in("client_id", clients?.map(c => c.id) || []);

      if (contentsError) throw contentsError;

      setAgencyStats({
        clientCount: clients?.length || 0,
        contentCount: contentCount || 0,
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas da agência:", error);
    }
  };

  const handleSaveClientData = async () => {
    if (!profile?.client_id || !clientData) return;

    setClientLoading(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({
          name: clientData.name,
          slug: clientData.slug,
          cnpj: clientData.cnpj,
          address: clientData.address,
          email: clientData.email,
          whatsapp: clientData.whatsapp,
        })
        .eq("id", profile.client_id);

      if (error) throw error;

      toast({
        title: "Dados atualizados",
        description: "Os dados da empresa foram atualizados com sucesso.",
      });
      
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar dados da empresa",
        variant: "destructive",
      });
    } finally {
      setClientLoading(false);
    }
  };

  const handleSaveAgencyData = async () => {
    if (!profile?.agency_id || !agencyData) return;

    setAgencyLoading(true);
    try {
      const { error } = await supabase
        .from("agencies")
        .update({
          name: agencyData.name,
          slug: agencyData.slug,
          email: agencyData.email,
          whatsapp: agencyData.whatsapp,
        })
        .eq("id", profile.agency_id);

      if (error) throw error;

      toast({
        title: "Dados atualizados",
        description: "Os dados da agência foram atualizados com sucesso.",
      });
      
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar dados da agência",
        variant: "destructive",
      });
    } finally {
      setAgencyLoading(false);
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
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Minha Conta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dados da Agência - Para agency_admin - MOVED TO TOP */}
          {profile?.agency_id && profile?.role === 'agency_admin' && agencyData && (
            <>
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground">Dados da Agência</h3>
                  <form onSubmit={(e) => { e.preventDefault(); handleSaveAgencyData(); }} className="space-y-3">
                    <div>
                      <Label htmlFor="agency_name">Nome da Agência</Label>
                      <Input
                        id="agency_name"
                        value={agencyData.name}
                        onChange={(e) => setAgencyData({ ...agencyData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="agency_slug">Slug da Agência</Label>
                      <Input
                        id="agency_slug"
                        value={agencyData.slug}
                        onChange={(e) => setAgencyData({ ...agencyData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                        placeholder="minha-agencia"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        URL base: https://aprovacriativos.com.br/{agencyData.slug}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="agency_email">Email</Label>
                        <Input
                          id="agency_email"
                          type="email"
                          value={agencyData.email || ''}
                          onChange={(e) => setAgencyData({ ...agencyData, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="agency_whatsapp">WhatsApp</Label>
                        <Input
                          id="agency_whatsapp"
                          value={agencyData.whatsapp || ''}
                          onChange={(e) => setAgencyData({ ...agencyData, whatsapp: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="logo_url">Logo URL</Label>
                      <Input
                        id="logo_url"
                        value={agencyData.logo_url || ''}
                        onChange={(e) => setAgencyData({ ...agencyData, logo_url: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="brand_primary">Cor Primária</Label>
                        <Input
                          id="brand_primary"
                          type="color"
                          value={agencyData.brand_primary || '#2563eb'}
                          onChange={(e) => setAgencyData({ ...agencyData, brand_primary: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="brand_secondary">Cor Secundária</Label>
                        <Input
                          id="brand_secondary"
                          type="color"
                          value={agencyData.brand_secondary || '#8b5cf6'}
                          onChange={(e) => setAgencyData({ ...agencyData, brand_secondary: e.target.value })}
                        />
                      </div>
                    </div>
                    <Button type="submit" size="sm" disabled={agencyLoading}>
                      {agencyLoading ? "Salvando..." : "Salvar Dados da Agência"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground">Plano e Estatísticas</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Plano Atual</Label>
                      <p className="text-sm font-medium">{agencyData.plan || 'Não definido'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Renovação</Label>
                      <p className="text-sm font-medium">
                        {agencyData.plan_renewal_date 
                          ? formatDate(agencyData.plan_renewal_date)
                          : 'Não definido'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Total de Clientes</Label>
                      <p className="text-xl font-semibold">{agencyStats.clientCount}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Total de Conteúdos</Label>
                      <p className="text-xl font-semibold">{agencyStats.contentCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Dados Cadastrais - Para usuários não-clientes */}
          {!profile?.client_id && !profile?.agency_id && (
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
          )}

          {/* Dados da Empresa - Para clientes */}
          {profile?.client_id && clientData && (
            <Card>
              <CardContent className="pt-6 space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground">Dados da Empresa</h3>
                <form onSubmit={(e) => { e.preventDefault(); handleSaveClientData(); }} className="space-y-3">
                  <div>
                    <Label htmlFor="company_name">Nome da Empresa</Label>
                    <Input
                      id="company_name"
                      value={clientData.name}
                      onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="client_slug">Slug do Cliente</Label>
                    <Input
                      id="client_slug"
                      value={clientData.slug}
                      onChange={(e) => setClientData({ ...clientData, slug: e.target.value })}
                      placeholder="meu-cliente"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      O slug é usado para gerar links de aprovação com tokens de acesso temporário (validade de 7 dias)
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={clientData.cnpj}
                      onChange={(e) => setClientData({ ...clientData, cnpj: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      value={clientData.address}
                      onChange={(e) => setClientData({ ...clientData, address: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="client_email">Email</Label>
                    <Input
                      id="client_email"
                      type="email"
                      value={clientData.email}
                      onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <Input
                      id="whatsapp"
                      value={clientData.whatsapp}
                      onChange={(e) => setClientData({ ...clientData, whatsapp: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <Button type="submit" size="sm" disabled={clientLoading}>
                    {clientLoading ? "Salvando..." : "Salvar Dados da Empresa"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Plano */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">Plano</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Plano Atual</Label>
                  <span className="font-semibold">{getPlanLabel(profile?.plan)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Renovação</Label>
                  <span className="font-medium text-sm">{formatDate(profile?.plan_renewal_date)}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    window.location.href = '/minha-assinatura';
                  }}
                >
                  Gerenciar Plano
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preferências de Notificação - Para clientes */}
          {profile?.client_id && (
            <Card>
              <CardContent className="pt-6 space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground">Preferências de Notificação</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify_email" className="flex-1">Email</Label>
                    <Switch
                      id="notify_email"
                      checked={notificationPreferences.notify_email}
                      onCheckedChange={(checked) => 
                        setNotificationPreferences({ ...notificationPreferences, notify_email: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify_whatsapp" className="flex-1">WhatsApp</Label>
                    <Switch
                      id="notify_whatsapp"
                      checked={notificationPreferences.notify_whatsapp}
                      onCheckedChange={(checked) => 
                        setNotificationPreferences({ ...notificationPreferences, notify_whatsapp: checked })
                      }
                    />
                  </div>
                  <Button onClick={handleSavePreferences} size="sm" disabled={prefsLoading}>
                    {prefsLoading ? "Salvando..." : "Salvar Preferências"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Alterar Senha */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">Alterar Senha</h3>
              <form onSubmit={handlePasswordChange} className="space-y-3">
                <div>
                  <Label htmlFor="current_password">Senha Atual</Label>
                  <Input
                    id="current_password"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="new_password">Nova Senha</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Mínimo 8 caracteres, incluindo maiúscula, minúscula, número e caractere especial
                  </p>
                </div>
                <div>
                  <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" size="sm" disabled={passwordLoading}>
                  {passwordLoading ? "Alterando..." : "Alterar Senha"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
