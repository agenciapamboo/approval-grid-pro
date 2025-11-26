import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Sparkles, CheckCircle2 } from "lucide-react";

interface BriefingField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'radio' | 'checkbox';
  placeholder?: string;
  options?: string[];
  required: boolean;
}

interface BriefingFormProps {
  templateId: string;
  clientId: string;
  briefingType?: 'client_profile' | 'editorial_line';
  onProfileGenerated?: (profile: any) => void;
}

export function BriefingForm({ templateId, clientId, briefingType = 'client_profile', onProfileGenerated }: BriefingFormProps) {
  const [template, setTemplate] = useState<any>(null);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  async function loadTemplate() {
    const { data, error } = await (supabase as any)
      .from('briefing_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      console.error('Error loading template:', error);
      toast.error("Erro ao carregar template");
      return;
    }

    setTemplate(data);
    setLoading(false);
  }

  const handleFieldChange = (fieldId: string, value: any) => {
    setResponses({ ...responses, [fieldId]: value });
  };

  const calculateProgress = () => {
    if (!template?.fields?.fields) return 0;
    const fields = template.fields.fields as BriefingField[];
    const requiredFields = fields.filter(f => f.required);
    const filledRequired = requiredFields.filter(f => {
      const value = responses[f.id];
      return value && (Array.isArray(value) ? value.length > 0 : value.toString().trim() !== '');
    });
    return (filledRequired.length / requiredFields.length) * 100;
  };

  const handleGenerateProfile = async () => {
    const progress = calculateProgress();
    if (progress < 100) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-client-profile', {
        body: {
          briefingResponses: responses,
          templateId,
          clientId,
          briefingType
        }
      });

      if (error) throw error;

      if (data.error) {
        if (data.error.includes('limit reached')) {
          toast.error("Limite mensal de IA atingido. Faça upgrade do plano.");
        } else {
          toast.error(data.error);
        }
        return;
      }

      toast.success(
        briefingType === 'editorial_line'
          ? "✨ Assistente de IA processou suas informações com sucesso! Sua linha editorial foi gerada."
          : "✨ Assistente de IA processou suas informações com sucesso! Seu perfil foi gerado."
      );
      
      onProfileGenerated?.(data.profile);
    } catch (error) {
      console.error('Error generating profile:', error);
      toast.error("Erro ao gerar perfil");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  if (!template) {
    return <div className="text-center py-8">Template não encontrado</div>;
  }

  const fields = template.fields?.fields as BriefingField[] || [];
  const progress = calculateProgress();

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-green-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            {template.name}
          </CardTitle>
          <CardDescription>{template.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {fields.map((field) => (
        <Card key={field.id} className="glass">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <Label htmlFor={field.id}>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>

              {field.type === 'text' && (
                <Input
                  id={field.id}
                  value={responses[field.id] || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              )}

              {field.type === 'textarea' && (
                <Textarea
                  id={field.id}
                  value={responses[field.id] || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  rows={4}
                  required={field.required}
                />
              )}

              {field.type === 'select' && (
                <Select
                  value={responses[field.id] || ''}
                  onValueChange={(value) => handleFieldChange(field.id, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma opção" />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {field.type === 'radio' && (
                <RadioGroup
                  value={responses[field.id] || ''}
                  onValueChange={(value) => handleFieldChange(field.id, value)}
                >
                  {field.options?.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                      <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {field.type === 'multiselect' && (
                <div className="space-y-2">
                  {field.options?.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${field.id}-${option}`}
                        checked={responses[field.id]?.includes(option) || false}
                        onCheckedChange={(checked) => {
                          const current = responses[field.id] || [];
                          const updated = checked
                            ? [...current, option]
                            : current.filter((v: string) => v !== option);
                          handleFieldChange(field.id, updated);
                        }}
                      />
                      <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
                    </div>
                  ))}
                </div>
              )}

              {field.type === 'checkbox' && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={field.id}
                    checked={responses[field.id] || false}
                    onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
                  />
                  <Label htmlFor={field.id}>{field.label}</Label>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button
          onClick={handleGenerateProfile}
          disabled={generating || progress < 100}
          size="lg"
          className="gap-2"
        >
          {generating ? (
            <>
              <Sparkles className="h-4 w-4 animate-spin" />
              {briefingType === 'editorial_line' ? 'Gerando linha editorial...' : 'Gerando perfil...'}
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              {briefingType === 'editorial_line' ? 'Gerar Linha Editorial com IA' : 'Gerar Perfil com IA'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
