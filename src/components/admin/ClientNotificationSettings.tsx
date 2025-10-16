import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";

interface ClientNotificationSettingsProps {
  clientId: string;
}

export function ClientNotificationSettings({ clientId }: ClientNotificationSettingsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    notify_email: true,
    notify_whatsapp: false,
  });

  useEffect(() => {
    loadPreferences();
  }, [clientId]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("notify_email, notify_whatsapp")
        .eq("id", clientId)
        .single();

      if (error) throw error;

      if (data) {
        setPreferences({
          notify_email: data.notify_email ?? true,
          notify_whatsapp: data.notify_whatsapp ?? false,
        });
      }
    } catch (error) {
      console.error("Erro ao carregar preferências:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({
          notify_email: preferences.notify_email,
          notify_whatsapp: preferences.notify_whatsapp,
        })
        .eq("id", clientId);

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
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Preferências de Notificação
        </CardTitle>
        <CardDescription>
          Configure como deseja receber notificações sobre seus conteúdos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <Label htmlFor="notify_email" className="flex flex-col gap-1">
            <span>Notificações por E-mail</span>
            <span className="text-xs text-muted-foreground font-normal">
              Receba atualizações sobre aprovações e rejeições por e-mail
            </span>
          </Label>
          <Switch
            id="notify_email"
            checked={preferences.notify_email}
            onCheckedChange={(checked) =>
              setPreferences({ ...preferences, notify_email: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="notify_whatsapp" className="flex flex-col gap-1">
            <span>Notificações por WhatsApp</span>
            <span className="text-xs text-muted-foreground font-normal">
              Receba atualizações sobre aprovações e rejeições via WhatsApp
            </span>
          </Label>
          <Switch
            id="notify_whatsapp"
            checked={preferences.notify_whatsapp}
            onCheckedChange={(checked) =>
              setPreferences({ ...preferences, notify_whatsapp: checked })
            }
          />
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-4">
            ℹ️ Independente das suas preferências, os webhooks sempre serão enviados para integração com sistemas externos.
          </p>
          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? "Salvando..." : "Salvar Preferências"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
