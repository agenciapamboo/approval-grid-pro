import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export const SystemSettingsManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingDocs, setUpdatingDocs] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [originalWebhookUrl, setOriginalWebhookUrl] = useState("");
  const [platformWebhookUrl, setPlatformWebhookUrl] = useState("");
  const [originalPlatformWebhookUrl, setOriginalPlatformWebhookUrl] = useState("");
  const [twoFactorWebhookUrl, setTwoFactorWebhookUrl] = useState("");
  const [originalTwoFactorWebhookUrl, setOriginalTwoFactorWebhookUrl] = useState("");

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Webhook interno
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "internal_webhook_url")
        .single();

      if (error) throw error;

      const url = data?.value || "";
      setWebhookUrl(url);
      setOriginalWebhookUrl(url);

      // Webhook de plataforma
      const { data: platformData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "platform_notifications_webhook_url")
        .single();

      const platformUrl = platformData?.value || "";
      setPlatformWebhookUrl(platformUrl);
      setOriginalPlatformWebhookUrl(platformUrl);

      // Webhook de 2FA
      const { data: twoFactorData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "two_factor_webhook_url")
        .single();

      const twoFactorUrl = twoFactorData?.value || "";
      setTwoFactorWebhookUrl(twoFactorUrl);
      setOriginalTwoFactorWebhookUrl(twoFactorUrl);
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar as configurações.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!webhookUrl.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "A URL do webhook não pode estar vazia.",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("system_settings")
        .update({ 
          value: webhookUrl.trim(),
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq("key", "internal_webhook_url");

      if (error) throw error;

      setOriginalWebhookUrl(webhookUrl.trim());
      toast({
        title: "Configurações salvas",
        description: "O webhook interno foi atualizado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setWebhookUrl(originalWebhookUrl);
  };

  const handleSavePlatformWebhook = async () => {
    if (!platformWebhookUrl.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "A URL do webhook não pode estar vazia.",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("system_settings")
        .update({ 
          value: platformWebhookUrl.trim(),
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq("key", "platform_notifications_webhook_url");

      if (error) throw error;

      setOriginalPlatformWebhookUrl(platformWebhookUrl.trim());
      toast({
        title: "Configurações salvas",
        description: "O webhook de notificações foi atualizado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao salvar webhook de plataforma:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar o webhook de plataforma.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSave2FAWebhook = async () => {
    if (!twoFactorWebhookUrl.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "A URL do webhook não pode estar vazia.",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("system_settings")
        .update({ 
          value: twoFactorWebhookUrl.trim(),
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq("key", "two_factor_webhook_url");

      if (error) throw error;

      setOriginalTwoFactorWebhookUrl(twoFactorWebhookUrl.trim());
      toast({
        title: "Configurações salvas",
        description: "O webhook de 2FA foi atualizado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao salvar webhook de 2FA:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar o webhook de 2FA.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDocs = async () => {
    setUpdatingDocs(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-docs');

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Documentação atualizada",
          description: `${data.stats.total_events} eventos documentados (${data.stats.client_events} clientes, ${data.stats.internal_events} internos)`,
        });
        console.log('✅ Documentação atualizada:', data);
      } else {
        throw new Error('Falha ao atualizar documentação');
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar documentação:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível atualizar a documentação",
      });
    } finally {
      setUpdatingDocs(false);
    }
  };

  const hasChanges = webhookUrl !== originalWebhookUrl;
  const hasPlatformChanges = platformWebhookUrl !== originalPlatformWebhookUrl;
  const has2FAChanges = twoFactorWebhookUrl !== originalTwoFactorWebhookUrl;

  return (
    <Card>
        <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Webhooks & Documentação
        </CardTitle>
        <CardDescription>
          Configure os webhooks do sistema e atualize a documentação automática
        </CardDescription>
        </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Webhook Interno */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-1">Webhook Interno (N8N)</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Recebe notificações internas do sistema (erros, bloqueios de IP, relatórios)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="webhook-url">URL do Webhook</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  placeholder="https://webhook.example.com/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  className="flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Salvar Webhook Interno
                    </>
                  )}
                </Button>
                {hasChanges && (
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* Webhook de Notificações de Clientes */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-1">Webhook de Notificações de Clientes</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Recebe notificações da plataforma para agências/creators (vencimentos, alertas, anúncios)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform-webhook-url">URL do Webhook (N8N)</Label>
                <Input
                  id="platform-webhook-url"
                  type="url"
                  placeholder="https://n8n.pamboocriativos.com.br/webhook-test/..."
                  value={platformWebhookUrl}
                  onChange={(e) => setPlatformWebhookUrl(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSavePlatformWebhook}
                  disabled={!hasPlatformChanges || saving}
                  className="flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Salvar Webhook de Clientes
                    </>
                  )}
                </Button>
                {hasPlatformChanges && (
                  <Button
                    variant="outline"
                    onClick={() => setPlatformWebhookUrl(originalPlatformWebhookUrl)}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* Webhook de Códigos 2FA */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-1">Webhook de Códigos 2FA</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  URL do webhook N8N para envio de códigos de autenticação de 2 fatores via email/WhatsApp
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="2fa-webhook-url">URL do Webhook (N8N)</Label>
                <Input
                  id="2fa-webhook-url"
                  type="url"
                  placeholder="https://webhook.pamboocriativos.com.br/webhook/..."
                  value={twoFactorWebhookUrl}
                  onChange={(e) => setTwoFactorWebhookUrl(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSave2FAWebhook}
                  disabled={!has2FAChanges || saving}
                  className="flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Salvar Webhook 2FA
                    </>
                  )}
                </Button>
                {has2FAChanges && (
                  <Button
                    variant="outline"
                    onClick={() => setTwoFactorWebhookUrl(originalTwoFactorWebhookUrl)}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* Documentação Automática */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-1">Documentação Automática</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Atualize os documentos de eventos (EVENTOS_NOTIFICACAO.md) e configuração do N8N (CONFIGURACAO_N8N.md) com base nas definições atuais do sistema.
                </p>
                <Button 
                  onClick={handleUpdateDocs} 
                  disabled={updatingDocs}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  {updatingDocs ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Atualizando documentação...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Atualizar Documentação
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
