import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AIConfiguration() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  const [apiKey, setApiKey] = useState("");
  const [defaultModel, setDefaultModel] = useState("gpt-4o-mini");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokensCaption, setMaxTokensCaption] = useState(500);
  const [maxTokensBriefing, setMaxTokensBriefing] = useState(2000);
  const [promptSkills, setPromptSkills] = useState("");
  const [promptBehavior, setPromptBehavior] = useState("");

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-ai-config');

      if (error) throw error;

      if (data) {
        setHasApiKey(data.hasApiKey || false);
        setDefaultModel(data.default_model || 'gpt-4o-mini');
        setTemperature(data.temperature || 0.7);
        setMaxTokensCaption(data.max_tokens_caption || 500);
        setMaxTokensBriefing(data.max_tokens_briefing || 2000);
        setPromptSkills(data.prompt_skills || '');
        setPromptBehavior(data.prompt_behavior || '');
      }
    } catch (error) {
      console.error('Error loading AI config:', error);
      toast.error('Erro ao carregar configuração de IA');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey || !apiKey.startsWith('sk-')) {
      toast.error('Insira uma chave OpenAI válida (começa com sk-)');
      return;
    }

    try {
      setTesting(true);
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        toast.success('✅ Conexão com OpenAI validada!');
        setHasApiKey(true);
      } else {
        toast.error('❌ Chave OpenAI inválida');
      }
    } catch (error) {
      console.error('Test error:', error);
      toast.error('Erro ao testar conexão');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { data, error } = await supabase.functions.invoke('update-ai-config', {
        body: {
          ...(apiKey && { openai_api_key: apiKey }),
          default_model: defaultModel,
          temperature,
          max_tokens_caption: maxTokensCaption,
          max_tokens_briefing: maxTokensBriefing,
          prompt_skills: promptSkills,
          prompt_behavior: promptBehavior,
        },
      });

      if (error) {
        console.error('Error from Edge Function:', error);
        const errorMessage = (error as any)?.message || (error as any)?.error || 'Erro desconhecido';
        const errorDetails = (error as any)?.details || '';
        throw new Error(errorDetails || errorMessage);
      }

      // Verificar se há erro na resposta
      if (data?.error) {
        throw new Error(data.error || data.details || 'Erro ao salvar configuração');
      }

      if (!data?.success) {
        throw new Error('Resposta inválida da função');
      }

      toast.success('Configuração salva com sucesso!');
      setApiKey(''); // Limpar campo após salvar
      setHasApiKey(data.config?.hasApiKey || false);
      
      // Recarregar configuração para atualizar os valores
      await loadConfig();
    } catch (error: any) {
      console.error('Save error:', error);
      const errorMessage = error?.message || error?.error || 'Erro ao salvar configuração';
      toast.error('Erro ao salvar configuração', {
        description: errorMessage
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass">
        <CardContent className="p-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* OpenAI API Key */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle>Chave OpenAI</CardTitle>
              <CardDescription>Configure sua API key da OpenAI para habilitar recursos de IA</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">OpenAI API Key</Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono"
              />
              <Button
                onClick={handleTestConnection}
                disabled={testing || !apiKey}
                variant="outline"
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Testar"
                )}
              </Button>
            </div>
            {hasApiKey && (
              <div className="flex items-center gap-2 text-sm text-success">
                <Check className="h-4 w-4" />
                Chave configurada e válida
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Modelo */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Configurações de Modelos</CardTitle>
          <CardDescription>Ajuste os parâmetros dos modelos de IA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Modelo Padrão</Label>
            <div className="flex gap-2">
              <Button
                variant={defaultModel === 'gpt-4o-mini' ? 'default' : 'outline'}
                onClick={() => setDefaultModel('gpt-4o-mini')}
                className="flex-1"
              >
                GPT-4o Mini
                <Badge variant="outline" className="ml-2">Econômico</Badge>
              </Button>
              <Button
                variant={defaultModel === 'gpt-4o' ? 'default' : 'outline'}
                onClick={() => setDefaultModel('gpt-4o')}
                className="flex-1"
              >
                GPT-4o
                <Badge variant="outline" className="ml-2">Avançado</Badge>
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Temperature: {temperature}</Label>
            <Slider
              value={[temperature]}
              onValueChange={([value]) => setTemperature(value)}
              min={0}
              max={1}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Menor = mais conservador, Maior = mais criativo
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tokens-caption">Max Tokens (Legendas)</Label>
              <Input
                id="tokens-caption"
                type="number"
                value={maxTokensCaption}
                onChange={(e) => setMaxTokensCaption(Number(e.target.value))}
                min={100}
                max={2000}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tokens-briefing">Max Tokens (Briefing)</Label>
              <Input
                id="tokens-briefing"
                type="number"
                value={maxTokensBriefing}
                onChange={(e) => setMaxTokensBriefing(Number(e.target.value))}
                min={500}
                max={4000}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Prompts */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Configurações de Prompts</CardTitle>
          <CardDescription>Defina habilidades e comportamento padrão da IA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt-skills">Skills (Habilidades)</Label>
            <Textarea
              id="prompt-skills"
              placeholder="Ex: Você é um assistente especializado em marketing digital e criação de conteúdo."
              value={promptSkills}
              onChange={(e) => setPromptSkills(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Define as habilidades e especialização da IA
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt-behavior">Behavior (Comportamento)</Label>
            <Textarea
              id="prompt-behavior"
              placeholder="Ex: Seja criativo, objetivo e sempre mantenha a consistência com a identidade da marca."
              value={promptBehavior}
              onChange={(e) => setPromptBehavior(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Define o comportamento e tom de resposta da IA
            </p>
          </div>

          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <strong>Dica:</strong> Prompts mais curtos e diretos economizam tokens e reduzem custos.
              Evite repetições desnecessárias.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
          className="bg-primary hover:bg-primary-hover"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Salvar Configuração
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
