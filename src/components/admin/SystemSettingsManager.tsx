import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, RefreshCw } from "lucide-react";

export const SystemSettingsManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [originalWebhookUrl, setOriginalWebhookUrl] = useState("");

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "internal_webhook_url")
        .single();

      if (error) throw error;

      const url = data?.value || "";
      setWebhookUrl(url);
      setOriginalWebhookUrl(url);
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

  const hasChanges = webhookUrl !== originalWebhookUrl;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Configurações do Sistema
        </CardTitle>
        <CardDescription>
          Configure o webhook interno para notificações de sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="webhook-url">URL do Webhook Interno (N8N)</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://webhook.example.com/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Este webhook recebe notificações internas do sistema (erros, bloqueios de IP, relatórios, etc.)
              </p>
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
                    Salvar
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
          </>
        )}
      </CardContent>
    </Card>
  );
};
