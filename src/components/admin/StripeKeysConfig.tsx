import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Save, Loader2, CheckCircle, AlertTriangle, Info, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface StripeKeysConfigProps {}

export function StripeKeysConfig({}: StripeKeysConfigProps) {
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"live" | "test" | "unknown">("unknown");

  // Fetch current Stripe configuration
  const { data: currentConfig, isLoading: loadingConfig, refetch: refetchConfig } = useQuery({
    queryKey: ["stripe-keys-config"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-stripe-config');
      if (error) throw error;
      return data || { mode: 'unknown', hasSecretKey: false, hasWebhookSecret: false };
    },
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (currentConfig) {
      setMode(currentConfig.mode || "unknown");
      // Don't populate actual values for security - user needs to re-enter
      // But we can show masked versions
    }
  }, [currentConfig]);

  // Note: We don't mask keys in the form for security reasons
  // Users need to re-enter them each time

  const validateSecretKey = (key: string): { valid: boolean; mode?: "live" | "test"; error?: string } => {
    if (!key || key.trim().length === 0) {
      return { valid: false, error: "Chave secreta é obrigatória" };
    }

    if (!key.startsWith("sk_")) {
      return { valid: false, error: "Chave secreta do Stripe deve começar com 'sk_'" };
    }

    if (key.startsWith("sk_live_")) {
      return { valid: true, mode: "live" };
    } else if (key.startsWith("sk_test_")) {
      return { valid: true, mode: "test" };
    }

    return { valid: false, error: "Formato de chave secreta inválido" };
  };

  const validateWebhookSecret = (secret: string): { valid: boolean; error?: string } => {
    if (!secret || secret.trim().length === 0) {
      return { valid: false, error: "Webhook secret é obrigatório" };
    }

    if (!secret.startsWith("whsec_")) {
      return { valid: false, error: "Webhook secret do Stripe deve começar com 'whsec_'" };
    }

    return { valid: true };
  };

  const handleSave = async () => {
    // Validate secret key
    const secretKeyValidation = validateSecretKey(stripeSecretKey);
    if (!secretKeyValidation.valid) {
      toast.error(secretKeyValidation.error || "Chave secreta inválida");
      return;
    }

    // Validate webhook secret
    const webhookValidation = validateWebhookSecret(stripeWebhookSecret);
    if (!webhookValidation.valid) {
      toast.error(webhookValidation.error || "Webhook secret inválido");
      return;
    }

    setSaving(true);
    try {
      // Validate keys with Stripe API
      const { data, error } = await supabase.functions.invoke('validate-stripe-keys', {
        body: {
          secretKey: stripeSecretKey,
          webhookSecret: stripeWebhookSecret,
        },
      });

      if (error) {
        throw new Error(error.message || "Erro ao validar chaves");
      }

      if (!data?.valid) {
        throw new Error(data?.error || "Chaves inválidas");
      }

      // Save configuration instructions
      toast.success(
        "Chaves validadas com sucesso! Atualize as variáveis de ambiente no Lovable Dashboard.",
        { duration: 8000 }
      );

      // Show instructions
      toast.info(
        `Modo detectado: ${data.mode?.toUpperCase()}. Configure STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET no Lovable Dashboard.`,
        { duration: 10000 }
      );

      // Update mode
      if (data.mode) {
        setMode(data.mode);
      }

      // Clear sensitive fields for security
      setStripeSecretKey("");
      setStripeWebhookSecret("");
      refetchConfig();
    } catch (error: any) {
      console.error("Error saving Stripe keys:", error);
      toast.error(error.message || "Erro ao salvar configurações do Stripe");
    } finally {
      setSaving(false);
    }
  };

  const copyInstructions = () => {
    const instructions = `
CONFIGURAÇÃO DAS VARIÁVEIS DE AMBIENTE DO STRIPE NO LOVABLE:

1. Acesse o Lovable Dashboard
2. Vá em Settings > Environment Variables
3. Configure as seguintes variáveis:

STRIPE_SECRET_KEY=${stripeSecretKey || '[SUA_CHAVE_SECRETA_AQUI]'}
STRIPE_WEBHOOK_SECRET=${stripeWebhookSecret || '[SEU_WEBHOOK_SECRET_AQUI]'}

IMPORTANTE:
- Use chaves de produção (sk_live_*) para ambiente de produção
- Use chaves de teste (sk_test_*) apenas para desenvolvimento
- Sempre mantenha as chaves secretas seguras e nunca as compartilhe
    `.trim();

    navigator.clipboard.writeText(instructions);
    toast.success("Instruções copiadas para a área de transferência!");
  };

  const secretKeyValidation = stripeSecretKey ? validateSecretKey(stripeSecretKey) : null;
  const webhookValidation = stripeWebhookSecret ? validateWebhookSecret(stripeWebhookSecret) : null;

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Configuração de Chaves do Stripe</AlertTitle>
        <AlertDescription>
          As variáveis de ambiente do Stripe são gerenciadas no Lovable Dashboard. Use esta página para validar suas chaves antes de configurá-las. Após validar, você precisará atualizar as variáveis de ambiente manualmente no Lovable Dashboard.
        </AlertDescription>
      </Alert>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status Atual</CardTitle>
          <CardDescription>Configuração atual do Stripe detectada</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Modo Stripe:</span>
            {mode === "live" ? (
              <Badge variant="default" className="bg-green-600">
                LIVE MODE (Produção)
              </Badge>
            ) : mode === "test" ? (
              <Badge variant="warning" className="bg-orange-500">
                TEST MODE (Teste)
              </Badge>
            ) : (
              <Badge variant="outline">Desconhecido</Badge>
            )}
          </div>

          {loadingConfig ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando configuração...
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                {currentConfig?.hasSecretKey ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                )}
                <span>
                  STRIPE_SECRET_KEY: {currentConfig?.hasSecretKey ? "Configurada" : "Não configurada"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {currentConfig?.hasWebhookSecret ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                )}
                <span>
                  STRIPE_WEBHOOK_SECRET: {currentConfig?.hasWebhookSecret ? "Configurado" : "Não configurado"}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle>Validar e Configurar Chaves</CardTitle>
          <CardDescription>
            Digite suas chaves do Stripe para validá-las antes de configurá-las no Lovable Dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stripe Secret Key */}
          <div className="space-y-2">
            <Label htmlFor="stripe-secret-key">
              STRIPE_SECRET_KEY <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="stripe-secret-key"
                type={showSecretKey ? "text" : "password"}
                value={stripeSecretKey}
                onChange={(e) => setStripeSecretKey(e.target.value)}
                placeholder="sk_live_... ou sk_test_..."
                className={secretKeyValidation && !secretKeyValidation.valid ? "border-destructive" : ""}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowSecretKey(!showSecretKey)}
              >
                {showSecretKey ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {secretKeyValidation && (
              <div className="flex items-center gap-2 text-sm">
                {secretKeyValidation.valid ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">
                      Chave válida - Modo: {secretKeyValidation.mode?.toUpperCase()}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-destructive">{secretKeyValidation.error}</span>
                  </>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Chave secreta do Stripe. Use sk_live_* para produção ou sk_test_* para testes.
            </p>
          </div>

          {/* Stripe Webhook Secret */}
          <div className="space-y-2">
            <Label htmlFor="stripe-webhook-secret">
              STRIPE_WEBHOOK_SECRET <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="stripe-webhook-secret"
                type={showWebhookSecret ? "text" : "password"}
                value={stripeWebhookSecret}
                onChange={(e) => setStripeWebhookSecret(e.target.value)}
                placeholder="whsec_..."
                className={webhookValidation && !webhookValidation.valid ? "border-destructive" : ""}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
              >
                {showWebhookSecret ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {webhookValidation && (
              <div className="flex items-center gap-2 text-sm">
                {webhookValidation.valid ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">Webhook secret válido</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-destructive">{webhookValidation.error}</span>
                  </>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Secret de assinatura do webhook do Stripe. Obtido ao criar um endpoint de webhook no Stripe Dashboard.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={saving || !secretKeyValidation?.valid || !webhookValidation?.valid}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Validar Chaves
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={copyInstructions}
              disabled={!stripeSecretKey || !stripeWebhookSecret}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Copiar Instruções
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Como Configurar no Lovable Dashboard</CardTitle>
          <CardDescription>Passos para atualizar as variáveis de ambiente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Acesse o Lovable Dashboard e vá em Settings</li>
            <li>Navegue até Environment Variables</li>
            <li>Adicione ou atualize as seguintes variáveis:
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li><code className="bg-muted px-1 py-0.5 rounded">STRIPE_SECRET_KEY</code> - Sua chave secreta do Stripe</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">STRIPE_WEBHOOK_SECRET</code> - Secret do webhook do Stripe</li>
              </ul>
            </li>
            <li>Salve as alterações e aguarde alguns minutos para que as alterações sejam aplicadas</li>
            <li>Volte a esta página e clique em "Atualizar" para verificar se as configurações foram aplicadas</li>
          </ol>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Importante</AlertTitle>
            <AlertDescription>
              As variáveis de ambiente não são atualizadas automaticamente através desta interface. 
              Você precisa configurá-las manualmente no Lovable Dashboard após validar as chaves aqui.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

