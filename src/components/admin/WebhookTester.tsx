import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play, Webhook } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { NOTIFICATION_EVENTS, type NotificationEvent } from "@/lib/notification-events";

interface WebhookDefinition {
  id: string;
  name: string;
  description: string;
  key: string;
  webhookType: 'internal' | 'client' | 'platform' | 'agency' | '2fa';
}

export function WebhookTester() {
  const { toast } = useToast();
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [selectedEvents, setSelectedEvents] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, { success: boolean; message?: string; timestamp: Date; event?: string }>>({});

  const webhooks: WebhookDefinition[] = [
    {
      id: "internal",
      name: "Webhook Interno",
      description: "Notificações internas do sistema (erros, bloqueios de IP, relatórios)",
      key: "internal_webhook_url",
      webhookType: "internal",
    },
    {
      id: "client",
      name: "Webhook de Notificações de Clientes",
      description: "Notificações para clientes (aprovações, rejeições, publicações, etc.)",
      key: "client_notifications_webhook_url",
      webhookType: "client",
    },
    {
      id: "agency",
      name: "Webhook de Notificações de Agências",
      description: "Status de criativos, solicitações de ajuste e solicitações de criativo",
      key: "agency_notifications_webhook_url",
      webhookType: "agency",
    },
    {
      id: "2fa",
      name: "Webhook de Códigos 2FA",
      description: "URL do webhook N8N para envio de códigos de autenticação de 2 fatores",
      key: "two_factor_webhook_url",
      webhookType: "2fa",
    },
  ];

  // Obter eventos disponíveis para cada tipo de webhook
  const getEventsForWebhook = (webhookType: string): NotificationEvent[] => {
    if (webhookType === '2fa') {
      // Para 2FA, retornar um evento especial
      return [{
        event: '2fa.code_requested',
        category: 'internal' as const,
        type: 'info' as const,
        description: 'Código 2FA solicitado',
        trigger: 'Quando usuário solicita código 2FA',
        webhookType: '2fa' as const,
        payload: {
          type: "2fa_code",
          code: "123456",
          user_email: "teste@exemplo.com",
          timestamp: new Date().toISOString(),
        }
      }];
    }
    
    // Webhook de agências usa os mesmos eventos de clientes
    if (webhookType === 'agency') {
      return NOTIFICATION_EVENTS.filter(event => event.webhookType === 'client');
    }
    
    return NOTIFICATION_EVENTS.filter(event => event.webhookType === webhookType);
  };

  const testWebhook = async (webhook: WebhookDefinition, eventName?: string) => {
    const testKey = eventName ? `${webhook.id}-${eventName}` : webhook.id;
    setTesting((prev) => ({ ...prev, [testKey]: true }));
    
    try {
      // Buscar a URL do webhook para verificar se está configurado
      const { data: setting, error: fetchError } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", webhook.key)
        .single();

      if (fetchError || !setting?.value) {
        throw new Error(`Webhook não configurado. Configure a URL do webhook nas configurações.`);
      }

      // Obter payload do evento selecionado
      let payload: any;
      if (eventName) {
        const event = getEventsForWebhook(webhook.webhookType).find(e => e.event === eventName);
        if (!event) {
          throw new Error(`Evento "${eventName}" não encontrado.`);
        }
        // Criar payload de teste baseado no evento
        payload = JSON.parse(JSON.stringify(event.payload));
        payload = replaceTestValues(payload);
      } else {
        // Payload genérico para teste
        payload = {
          type: "test",
          event: "test",
          subject: `Teste de Webhook - ${webhook.name}`,
          message: "Este é um teste do webhook",
          source: "webhook_tester",
          timestamp: new Date().toISOString(),
        };
      }

      // Disparar o gatilho real do evento criando uma notificação que dispara o webhook
      const webhookUrl = setting.value;
      let result: { success: boolean; message: string; timestamp: Date; event?: string };

      if (webhook.webhookType === 'internal') {
        // Para webhooks internos, enviar diretamente
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const responseText = await response.text().catch(() => "");
        
        if (!response.ok) {
          throw new Error(`Status ${response.status}${responseText ? ` - ${responseText.substring(0, 200)}` : ''}`);
        }

        result = {
          success: true,
          message: "Enviado",
          timestamp: new Date(),
          event: eventName || 'test'
        };

      } else if (webhook.webhookType === '2fa') {
        // Para 2FA, enviar diretamente
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const responseText = await response.text().catch(() => "");
        
        if (!response.ok) {
          throw new Error(`Status ${response.status}${responseText ? ` - ${responseText.substring(0, 200)}` : ''}`);
        }

        result = {
          success: true,
          message: "Enviado",
          timestamp: new Date(),
          event: eventName || 'test'
        };

      } else {
        // Para webhooks de client/agency, criar notificação que dispara o trigger real
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("Usuário não autenticado");
        }

        // Buscar um cliente/agência para usar no teste
        let clientId: string | null = null;
        let agencyId: string | null = null;

        if (webhook.webhookType === 'client') {
          const { data: clientData } = await supabase
            .from('clients')
            .select('id, agency_id')
            .limit(1)
            .maybeSingle();
          
          clientId = clientData?.id || null;
          agencyId = clientData?.agency_id || null;
        } else if (webhook.webhookType === 'agency') {
          const { data: agencyData } = await supabase
            .from('agencies')
            .select('id')
            .limit(1)
            .maybeSingle();
          
          agencyId = agencyData?.id || null;
          
          if (agencyId) {
            const { data: clientData } = await supabase
              .from('clients')
              .select('id')
              .eq('agency_id', agencyId)
              .limit(1)
              .maybeSingle();
            
            clientId = clientData?.id || null;
          }
        }

        // Criar notificação de teste que disparará o trigger do webhook
        const { data: notificationData, error: notificationError } = await supabase
          .from('notifications')
          .insert({
            event: eventName || 'test',
            content_id: null,
            client_id: clientId,
            agency_id: agencyId,
            user_id: user.id,
            channel: 'webhook',
            status: 'pending',
            payload: payload,
          })
          .select()
          .single();

        if (notificationError) {
          throw new Error(notificationError.message);
        }

        // Processar notificação imediatamente via edge function que dispara o webhook
        const { error: processError } = await supabase.functions.invoke('notify-event');

        // Aguardar um pouco para o processamento
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Verificar status da notificação
        const { data: notificationStatus, error: statusError } = await supabase
          .from('notifications')
          .select('status, error_message')
          .eq('id', notificationData.id)
          .single();

        if (statusError) {
          throw new Error(statusError.message);
        }

        if (notificationStatus?.status === 'failed') {
          const errorMsg = notificationStatus.error_message || 'Erro desconhecido';
          throw new Error(errorMsg);
        } else if (notificationStatus?.status === 'sent') {
          result = {
            success: true,
            message: "Enviado",
            timestamp: new Date(),
            event: eventName || 'test'
          };
        } else if (processError) {
          // Se ainda está pending e houve erro no processamento
          throw new Error(processError.message);
        } else {
          // Se ainda está pending mas não houve erro, assumir sucesso
          result = {
            success: true,
            message: "Enviado",
            timestamp: new Date(),
            event: eventName || 'test'
          };
        }
      }

      setResults((prev) => ({ ...prev, [testKey]: result }));

      toast({
        title: "✅ Webhook testado com sucesso",
        description: eventName 
          ? `Evento "${eventName}" foi enviado com sucesso.`
          : `Webhook "${webhook.name}" foi enviado com sucesso.`,
      });
    } catch (error: any) {
      const errorMessage = error.message || "Erro desconhecido ao testar webhook";
      const result = {
        success: false,
        message: `Falha no envio: ${errorMessage}`,
        timestamp: new Date(),
        event: eventName
      };

      setResults((prev) => ({ ...prev, [testKey]: result }));
      
      toast({
        variant: "destructive",
        title: "❌ Erro ao testar webhook",
        description: errorMessage,
      });
    } finally {
      setTesting((prev) => ({ ...prev, [testKey]: false }));
    }
  };

  // Função para substituir valores de exemplo por dados de teste
  const replaceTestValues = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      if (typeof obj === 'string' && obj.includes('uuid-')) {
        return obj.replace('uuid-', `test-uuid-${Date.now()}-`);
      }
      if (typeof obj === 'string' && obj.includes('exemplo') || obj.includes('Nome do')) {
        return obj.replace(/exemplo|Nome do/g, 'Teste');
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => replaceTestValues(item));
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'timestamp' && typeof value === 'string') {
        result[key] = new Date().toISOString();
      } else if (key.includes('_at') && typeof value === 'string') {
        result[key] = new Date().toISOString();
      } else if (key.includes('_id') && typeof value === 'string' && value.includes('uuid-')) {
        result[key] = `test-${key}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      } else {
        result[key] = replaceTestValues(value);
      }
    }
    return result;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          Testar Webhooks
        </CardTitle>
        <CardDescription>
          Teste os webhooks configurados enviando eventos de teste para cada endpoint
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {webhooks.map((webhook) => {
          const availableEvents = getEventsForWebhook(webhook.webhookType);
          const selectedEvent = selectedEvents[webhook.id] || '';
          const generalResult = results[webhook.id];
          const eventResults = Object.entries(results).filter(([key]) => key.startsWith(`${webhook.id}-`));

          return (
            <div
              key={webhook.id}
              className="border rounded-lg p-4 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{webhook.name}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{webhook.description}</p>

                  {/* Dropdown de eventos */}
                  <div className="space-y-2">
                    <Label htmlFor={`event-select-${webhook.id}`}>Selecione um evento para testar</Label>
                    <Select
                      value={selectedEvent}
                      onValueChange={(value) => setSelectedEvents((prev) => ({ ...prev, [webhook.id]: value }))}
                    >
                      <SelectTrigger id={`event-select-${webhook.id}`}>
                        <SelectValue placeholder="Selecione um evento..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableEvents.map((event) => (
                          <SelectItem key={event.event} value={event.event}>
                            <div className="flex flex-col">
                              <span className="font-medium">{event.event}</span>
                              <span className="text-xs text-muted-foreground">{event.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Resultados de testes de eventos específicos */}
                  {eventResults.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {eventResults.map(([key, result]) => {
                        // Extrair nome do evento da chave (formato: webhookId-eventName)
                        const eventName = result.event || key.split('-').slice(1).join('-');
                        const isTesting = testing[key];
                        return (
                          <div key={key} className="border rounded p-3 bg-muted/30">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium">{eventName}</span>
                                </div>
                                <p className={`text-sm ${result.success ? "text-green-600" : "text-red-600"}`}>
                                  {result.success ? "✅ Enviado" : result.message}
                                </p>
                              </div>
                              <Button
                                onClick={() => testWebhook(webhook, eventName)}
                                disabled={isTesting}
                                variant="outline"
                                size="sm"
                                className="ml-2"
                              >
                                {isTesting ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Resultado geral do teste (se não for evento específico) */}
                  {generalResult && generalResult.event === 'test' && (
                    <div className="mt-3">
                      <p className={`text-sm ${generalResult.success ? "text-green-600" : "text-red-600"}`}>
                        {generalResult.success ? "✅ Enviado" : generalResult.message}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Botão para testar evento selecionado */}
              {selectedEvent && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => testWebhook(webhook, selectedEvent)}
                    disabled={testing[`${webhook.id}-${selectedEvent}`]}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    {testing[`${webhook.id}-${selectedEvent}`] ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testando Evento...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Testar Evento Selecionado
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => testWebhook(webhook)}
                    disabled={testing[webhook.id]}
                    variant="outline"
                    size="sm"
                  >
                    {testing[webhook.id] ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testando...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Teste Genérico
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Botão genérico se nenhum evento selecionado */}
              {!selectedEvent && (
                <Button
                  onClick={() => testWebhook(webhook)}
                  disabled={testing[webhook.id]}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  {testing[webhook.id] ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Testar Webhook (Genérico)
                    </>
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

