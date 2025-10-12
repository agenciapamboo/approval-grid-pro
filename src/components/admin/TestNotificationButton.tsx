import { Button } from "@/components/ui/button";
import { sendTestNotification } from "@/lib/testNotification";
import { toast } from "sonner";
import { Send } from "lucide-react";

export const TestNotificationButton = () => {
  const handleTest = async () => {
    toast.info("Enviando notificação de teste...");
    
    const result = await sendTestNotification();
    
    if (result.success) {
      toast.success("Notificação de teste enviada com sucesso!");
      console.log("Resposta:", result.data);
    } else {
      toast.error("Erro ao enviar notificação de teste");
      console.error("Erro:", result.error);
    }
  };

  return (
    <Button onClick={handleTest} variant="outline" size="sm">
      <Send className="mr-2 h-4 w-4" />
      Testar Webhook N8N
    </Button>
  );
};
