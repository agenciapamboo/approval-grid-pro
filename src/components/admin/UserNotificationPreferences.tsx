import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";

interface UserNotificationPreferencesProps {
  userId: string;
}

export function UserNotificationPreferences({ userId }: UserNotificationPreferencesProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [preferences, setPreferences] = useState({
    notify_email: true,
    notify_whatsapp: false,
    notify_webhook: true,
  });

  useEffect(() => {
    if (open && userId) {
      loadPreferences();
    }
  }, [open, userId]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          notify_email: data.notify_email,
          notify_whatsapp: data.notify_whatsapp,
          notify_webhook: data.notify_webhook,
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
        .from("user_preferences")
        .upsert({
          user_id: userId,
          ...preferences,
        });

      if (error) throw error;

      toast({
        title: "Preferências salvas",
        description: "Suas preferências de notificação foram atualizadas",
      });

      setOpen(false);
    } catch (error) {
      console.error("Erro ao salvar preferências:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar as preferências",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Bell className="h-4 w-4 mr-2" />
          Preferências de Notificação
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preferências de Notificação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="notify_email" className="flex flex-col gap-1">
              <span>E-mail</span>
              <span className="text-xs text-muted-foreground font-normal">
                Receber notificações por e-mail
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
              <span>WhatsApp</span>
              <span className="text-xs text-muted-foreground font-normal">
                Receber notificações por WhatsApp
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

          <div className="flex items-center justify-between">
            <Label htmlFor="notify_webhook" className="flex flex-col gap-1">
              <span>Webhook</span>
              <span className="text-xs text-muted-foreground font-normal">
                Enviar eventos via webhook
              </span>
            </Label>
            <Switch
              id="notify_webhook"
              checked={preferences.notify_webhook}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, notify_webhook: checked })
              }
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar Preferências"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
