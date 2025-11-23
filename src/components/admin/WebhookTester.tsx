import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play, CheckCircle2, XCircle, Webhook } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface WebhookDefinition {
  id: string;
  name: string;
  description: string;
  key: string;
  event: string;
  payload: any;
}

export function WebhookTester() {
  const { toast } = useToast();
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { success: boolean; message?: string; timestamp: Date }>>({});

  const webhooks: WebhookDefinition[] = [
    {
      id: "internal",
      name: "Webhook Interno",
      description: "Notificações internas do sistema (erros, bloqueios de IP, relatórios)",
      key: "internal_webhook_url",
      event: "test.internal",
      payload: {
        type: "test",
        subject: "Teste de Webhook Interno",
        message: "Este é um teste do webhook interno do sistema",
        source: "webhook_tester",
        timestamp: new Date().toISOString(),
      },
    },
    {
      id: "platform",
      name: "Webhook de Notificações de Clientes",
      description: "Notificações da plataforma para agências/creators (vencimentos, alertas, anúncios)",
      key: "platform_notifications_webhook_url",
      event: "test.platform",
      payload: {
        event: "test.platform",
        notification_id: "test-" + Date.now(),
        channel: "webhook",
        message: "Este é um teste do webhook de notificações de clientes",
        timestamp: new Date().toISOString(),
      },
    },
    {
      id: "2fa",
      name: "Webhook de Códigos 2FA",
      description: "URL do webhook N8N para envio de códigos de autenticação de 2 fatores",
      key: "two_factor_webhook_url",
      event: "test.2fa",
      payload: {
        type: "2fa_code",
        code: "123456",
        user_email: "teste@exemplo.com",
        timestamp: new Date().toISOString(),
      },
    },
    {
      id: "agency",
      name: "Webhook de Notificações de Agências",
      description: "Notificações de status de criativos, solicitações de ajuste e solicitações de criativo",
      key: "agency_notifications_webhook_url",
      event: "test.agency",
      payload: {
        event: "content.approved",
        content_id: "test-content-" + Date.now(),
        client_id: "test-client-" + Date.now(),
        agency_id: "test-agency-" + Date.now(),
        content: {
          id: "test-content-" + Date.now(),
          title: "Teste de Webhook",
          type: "feed",
          status: "approved",
        },
        client: {
          id: "test-client-" + Date.now(),
          name: "Cliente Teste",
        },
        agency: {
          id: "test-agency-" + Date.now(),
          name: "Agência Teste",
        },
        timestamp: new Date().toISOString(),
      },
    },
  ];

  const testWebhook = async (webhook: WebhookDefinition) => {
    setTesting(webhook.id);
    
    try {
      // Buscar a URL do webhook
      const { data: setting, error: fetchError } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", webhook.key)
        .single();

      if (fetchError || !setting?.value) {
        throw new Error(`Webhook não configurado. Configure a URL do webhook nas configurações.`);
      }

      const webhookUrl = setting.value;

      // Enviar requisição de teste
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhook.payload),
      });

      const isSuccess = response.ok;
      const result = isSuccess
        ? { success: true, message: `Webhook enviado com sucesso! Status: ${response.status}`, timestamp: new Date() }
        : { success: false, message: `Falha ao enviar webhook. Status: ${response.status}`, timestamp: new Date() };

      setResults((prev) => ({ ...prev, [webhook.id]: result }));

      if (isSuccess) {
        toast({
          title: "✅ Webhook testado com sucesso",
          description: `O webhook "${webhook.name}" foi enviado com sucesso.`,
        });
      } else {
        const text = await response.text().catch(() => "");
        toast({
          variant: "destructive",
          title: "❌ Erro ao testar webhook",
          description: `Status ${response.status}: ${text.substring(0, 100)}`,
        });
      }
    } catch (error: any) {
      const errorMessage = error.message || "Erro desconhecido ao testar webhook";
      setResults((prev) => ({
        ...prev,
        [webhook.id]: { success: false, message: errorMessage, timestamp: new Date() },
      }));
      
      toast({
        variant: "destructive",
        title: "Erro ao testar webhook",
        description: errorMessage,
      });
    } finally {
      setTesting(null);
    }
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
      <CardContent className="space-y-4">
        {webhooks.map((webhook) => {
          const result = results[webhook.id];
          const isTesting = testing === webhook.id;

          return (
            <div
              key={webhook.id}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{webhook.name}</h4>
                    {result && (
                      <Badge
                        variant={result.success ? "default" : "destructive"}
                        className={result.success ? "bg-green-500" : ""}
                      >
                        {result.success ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        {result.success ? "Sucesso" : "Erro"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{webhook.description}</p>
                  {result && (
                    <div className="mt-2">
                      <Alert variant={result.success ? "default" : "destructive"} className="py-2">
                        <AlertTitle className="text-xs">
                          {result.timestamp.toLocaleTimeString()} - {result.message}
                        </AlertTitle>
                      </Alert>
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => testWebhook(webhook)}
                  disabled={isTesting}
                  variant="outline"
                  size="sm"
                  className="ml-4"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Testar
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

