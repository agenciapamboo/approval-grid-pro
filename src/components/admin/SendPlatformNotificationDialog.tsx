import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { createPlatformNotification, PlatformNotificationType } from "@/lib/platform-notifications";

interface SendPlatformNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendPlatformNotificationDialog({ 
  open, 
  onOpenChange 
}: SendPlatformNotificationDialogProps) {
  const [targetType, setTargetType] = useState<'all' | 'agency' | 'creator'>('all');
  const [targetId, setTargetId] = useState('');
  const [notificationType, setNotificationType] = useState<PlatformNotificationType>('general_announcement');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [sendInApp, setSendInApp] = useState(true);
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'critical'>('normal');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title || !message) {
      toast.error('Preencha título e mensagem');
      return;
    }

    if (targetType !== 'all' && !targetId) {
      toast.error('Selecione um destinatário');
      return;
    }

    setLoading(true);

    const result = await createPlatformNotification({
      targetType,
      targetId: targetType === 'all' ? undefined : targetId,
      notificationType,
      title,
      message,
      actionUrl: actionUrl || undefined,
      sendEmail,
      sendWhatsApp,
      sendInApp,
      priority
    });

    setLoading(false);

    if (result.success) {
      toast.success('Notificação criada com sucesso!');
      onOpenChange(false);
      setTitle('');
      setMessage('');
      setActionUrl('');
      setTargetType('all');
      setTargetId('');
    } else {
      toast.error('Erro ao criar notificação');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar Notificação da Plataforma</DialogTitle>
          <DialogDescription>
            Envie comunicações do sistema para agências ou creators
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Destinatário</Label>
            <Select value={targetType} onValueChange={(v: any) => setTargetType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Clientes</SelectItem>
                <SelectItem value="agency">Agência Específica</SelectItem>
                <SelectItem value="creator">Creator Específico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {targetType !== 'all' && (
            <div>
              <Label>ID do {targetType === 'agency' ? 'Agência' : 'Creator'}</Label>
              <Input
                placeholder="ID do destinatário"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
              />
            </div>
          )}

          <div>
            <Label>Tipo de Notificação</Label>
            <Select value={notificationType} onValueChange={(v: any) => setNotificationType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general_announcement">Anúncio Geral</SelectItem>
                <SelectItem value="system_update">Atualização do Sistema</SelectItem>
                <SelectItem value="new_feature">Nova Funcionalidade</SelectItem>
                <SelectItem value="resource_alert">Alerta de Recursos</SelectItem>
                <SelectItem value="payment_reminder">Lembrete de Pagamento</SelectItem>
                <SelectItem value="plan_renewal">Renovação de Plano</SelectItem>
                <SelectItem value="maintenance">Manutenção</SelectItem>
                <SelectItem value="critical_alert">Alerta Crítico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Título</Label>
            <Input
              placeholder="Título da notificação"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <Label>Mensagem</Label>
            <Textarea
              placeholder="Conteúdo da notificação..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
            />
          </div>

          <div>
            <Label>Link de Ação (opcional)</Label>
            <Input
              placeholder="/my-subscription"
              value={actionUrl}
              onChange={(e) => setActionUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Caminho relativo ou URL completa para ação
            </p>
          </div>

          <div>
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Canais de Envio</Label>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="send-email" 
                  checked={sendEmail}
                  onCheckedChange={(checked) => setSendEmail(!!checked)}
                />
                <Label htmlFor="send-email">Email</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="send-whatsapp" 
                  checked={sendWhatsApp}
                  onCheckedChange={(checked) => setSendWhatsApp(!!checked)}
                />
                <Label htmlFor="send-whatsapp">WhatsApp</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="send-in-app" 
                  checked={sendInApp}
                  onCheckedChange={(checked) => setSendInApp(!!checked)}
                />
                <Label htmlFor="send-in-app">Painel (In-App)</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              <Send className="mr-2 h-4 w-4" />
              {loading ? 'Enviando...' : 'Enviar Notificação'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
