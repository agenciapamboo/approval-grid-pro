import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { createPlatformNotification } from "@/lib/platform-notifications";

export const NotificationSender = () => {
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [targetType, setTargetType] = useState<"all" | "agency" | "team_member" | "client_user" | "creator">("all");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || !title.trim()) {
      toast.error("Preencha título e mensagem");
      return;
    }

    setLoading(true);
    try {
      await createPlatformNotification({
        notificationType: "system_update",
        title,
        message,
        targetType: targetType,
        targetId: null,
        sendEmail: true,
        sendWhatsApp: false,
        sendInApp: true,
        priority: "normal",
      });

      toast.success("Notificação enviada com sucesso!");
      setMessage("");
      setTitle("");
      setTargetType("all");
    } catch (error) {
      console.error("Erro ao enviar notificação:", error);
      toast.error("Erro ao enviar notificação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Título da Notificação</Label>
        <input
          id="title"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Ex: Atualização do sistema"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Mensagem</Label>
        <Textarea
          id="message"
          placeholder="Digite a mensagem da notificação..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="target">Destinatários</Label>
        <Select value={targetType} onValueChange={(v: any) => setTargetType(v)}>
          <SelectTrigger id="target">
            <SelectValue placeholder="Selecione os destinatários" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Usuários</SelectItem>
            <SelectItem value="agency">Agências (Agency Admins)</SelectItem>
            <SelectItem value="team_member">Membros de Equipe (Team Members)</SelectItem>
            <SelectItem value="client_user">Usuários de Clientes (Client Users)</SelectItem>
            <SelectItem value="creator">Creators (Clientes Finais)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleSend} disabled={loading} className="w-full">
        <Send className="mr-2 h-4 w-4" />
        {loading ? "Enviando..." : "Enviar Notificação"}
      </Button>
    </div>
  );
};
