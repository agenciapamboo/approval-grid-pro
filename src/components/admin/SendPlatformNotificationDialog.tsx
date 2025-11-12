import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import { createPlatformNotification, PlatformNotificationType, markPlatformNotificationAsRead } from "@/lib/platform-notifications";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface SendPlatformNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendPlatformNotificationDialog({ 
  open, 
  onOpenChange,
  agencyId,
}: SendPlatformNotificationDialogProps & { agencyId?: string }) {
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
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [receivedNotifications, setReceivedNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  useEffect(() => {
    if (open && agencyId) {
      loadClients();
      loadReceivedNotifications();
    }
  }, [open, agencyId]);

  const loadClients = async () => {
    if (!agencyId) return;

    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .eq('agency_id', agencyId)
      .order('name');

    if (data) {
      setClients(data);
    }
  };

  const loadReceivedNotifications = async () => {
    if (!agencyId) return;
    
    setLoadingNotifications(true);
    try {
      const { data, error } = await supabase
        .from('platform_notifications')
        .select('*')
        .eq('target_type', 'agency')
        .eq('target_id', agencyId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setReceivedNotifications(data || []);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const result = await markPlatformNotificationAsRead(notificationId);
      
      if (result.success) {
        toast.success('Notificação marcada como lida');
        loadReceivedNotifications();
      } else {
        toast.error('Erro ao marcar notificação como lida');
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      toast.error('Erro ao marcar notificação como lida');
    }
  };

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
      targetType: targetType === 'all' && agencyId ? 'client_user' : targetType,
      targetId: targetType === 'all' && agencyId ? undefined : targetId,
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
          <DialogTitle>Notificações da Plataforma</DialogTitle>
          <DialogDescription>
            Envie ou visualize notificações do sistema
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="send">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="send">Enviar Notificação</TabsTrigger>
            <TabsTrigger value="received">Notificações Recebidas</TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="space-y-4">
            <div>
              <Label>Destinatário</Label>
              <Select value={targetType} onValueChange={(v: any) => setTargetType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {agencyId ? (
                    <>
                      <SelectItem value="all">Todos os Clientes da Agência</SelectItem>
                      <SelectItem value="client_user">Cliente Específico</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="all">Todos os Clientes</SelectItem>
                      <SelectItem value="agency">Agência Específica</SelectItem>
                      <SelectItem value="creator">Creator Específico</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {targetType !== 'all' && (
              <div>
                <Label>
                  {agencyId 
                    ? 'Cliente' 
                    : targetType === 'agency' 
                      ? 'ID da Agência' 
                      : 'ID do Creator'}
                </Label>
                {agencyId && targetType !== 'agency' && targetType !== 'creator' ? (
                  <Select value={targetId} onValueChange={setTargetId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="ID do destinatário"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                  />
                )}
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
          </TabsContent>

          <TabsContent value="received">
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {loadingNotifications ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : receivedNotifications.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma notificação recebida
                </p>
              ) : (
                receivedNotifications.map((notif) => (
                  <Card key={notif.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{notif.title}</CardTitle>
                        <Badge variant={notif.status === 'read' ? 'outline' : 'default'}>
                          {notif.status === 'read' ? 'Lida' : 'Nova'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{notif.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(notif.created_at), "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                      {notif.status !== 'read' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => markAsRead(notif.id)}
                        >
                          Marcar como lida
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
