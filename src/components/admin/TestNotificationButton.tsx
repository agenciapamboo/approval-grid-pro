import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { sendTestNotification } from "@/lib/testNotification";
import { sendTest2FACode } from "@/lib/test2FAWebhook";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { useState } from "react";

export const TestNotificationButton = () => {
  const [webhookType, setWebhookType] = useState<"internal" | "platform" | "agency" | "2fa">("internal");
  
  const handleTest = async () => {
    toast.info(`Enviando notificação de teste para webhook ${webhookType}...`);
    
    let result;
    
    if (webhookType === "2fa") {
      result = await sendTest2FACode();
    } else {
      result = await sendTestNotification();
    }
    
    if (result.success) {
      toast.success(`Notificação de teste enviada com sucesso!`);
      console.log("Resposta:", result.data);
      if (webhookType === "2fa" && result.payload) {
        console.log("Payload 2FA:", result.payload);
      }
    } else {
      toast.error(typeof result.error === 'string' ? result.error : "Erro ao enviar notificação de teste");
      console.error("Erro:", result.error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="webhook-type">Tipo de Webhook</Label>
        <Select value={webhookType} onValueChange={(v: any) => setWebhookType(v)}>
          <SelectTrigger id="webhook-type">
            <SelectValue placeholder="Selecione o tipo de webhook" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="internal">Webhook Interno (Erros/Alertas)</SelectItem>
            <SelectItem value="platform">Webhook de Plataforma (Notificações)</SelectItem>
            <SelectItem value="agency">Webhook Agência-Cliente</SelectItem>
            <SelectItem value="2fa">Webhook 2FA (Códigos de Autenticação)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Button onClick={handleTest} variant="outline" size="sm" className="w-full">
        <Send className="mr-2 h-4 w-4" />
        Testar Webhook
      </Button>
    </div>
  );
};
