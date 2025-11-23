import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Sparkles, Plus, Trash2, GripVertical } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface BriefingField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'radio' | 'checkbox';
  placeholder?: string;
  options?: string[];
  required: boolean;
}

interface BriefingTemplateEditorProps {
  templateId?: string;
  onSaved?: () => void;
}

export function BriefingTemplateEditor({ templateId, onSaved }: BriefingTemplateEditorProps) {
  const queryClient = useQueryClient();
  const [templateType, setTemplateType] = useState<'client_profile' | 'editorial_line'>('client_profile');
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [fields, setFields] = useState<BriefingField[]>([
    {
      id: "business_type",
      label: "Tipo de negócio",
      type: "select",
      options: ["Varejo", "Serviços", "Indústria", "Digital", "Outro"],
      required: true
    }
  ]);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Prompts pré-configurados por tipo
  const defaultPrompts = {
    client_profile: `Você é um estrategista de marketing digital. Analise as respostas do briefing e crie um perfil detalhado do cliente incluindo:
- Resumo do negócio
- Persona do público-alvo (faixa etária, interesses, dores)
- Pilares de conteúdo (3-5 pilares)
- Tom de voz (3-5 características)
- Palavras-chave principais`,
    
    editorial_line: `Você é um planejador de conteúdo para redes sociais. Use o PERFIL DO CLIENTE e as respostas do briefing para criar uma linha editorial estruturada:
- Objetivo principal da comunicação
- Frequência de posts recomendada
- Melhores horários para postar
- Mix de conteúdo (% educacional, promocional, entretenimento)
- Temas prioritários para os próximos 30 dias`
  };

  const addField = () => {
    const newField: BriefingField = {
      id: `field_${Date.now()}`,
      label: "Novo campo",
      type: "text",
      required: false
    };
    setFields([...fields, newField]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<BriefingField>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    setFields(updated);
  };

  const handleSave = async () => {
    if (!name.trim() || !systemPrompt.trim()) {
      toast.error("Preencha nome e system prompt");
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const payload = {
        template_type: templateType,
        name,
        description,
        fields: { fields },
        system_prompt: systemPrompt,
        is_active: isActive,
        created_by: userData.user?.id
      };

      const { error } = templateId
        ? await (supabase as any).from('briefing_templates').update(payload).eq('id', templateId)
        : await (supabase as any).from('briefing_templates').insert(payload);

      if (error) throw error;

      toast.success(templateId ? "Template atualizado!" : "Template criado!");
      queryClient.invalidateQueries({ queryKey: ['briefing-templates'] });
      onSaved?.();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error("Erro ao salvar template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-green-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            Informações do Template
          </CardTitle>
          <CardDescription>
            Configure nome, descrição e status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="type">Tipo do Template</Label>
            <Select value={templateType} onValueChange={(value: any) => {
              setTemplateType(value);
              setSystemPrompt(defaultPrompts[value as 'client_profile' | 'editorial_line']);
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client_profile">Perfil do Cliente</SelectItem>
                <SelectItem value="editorial_line">Linha Editorial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="name">Nome do Template</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Briefing Padrão de Redes Sociais"
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva quando usar este template"
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="active">Template ativo</Label>
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Campos do Formulário</CardTitle>
          <CardDescription>
            Arraste para reordenar, clique para editar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-3 p-4 border rounded-lg bg-card">
              <GripVertical className="h-5 w-5 text-muted-foreground mt-1 cursor-move" />
              
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Label</Label>
                    <Input
                      value={field.label}
                      onChange={(e) => updateField(index, { label: e.target.value })}
                      placeholder="Nome do campo"
                    />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select
                      value={field.type}
                      onValueChange={(value: any) => updateField(index, { type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="textarea">Área de texto</SelectItem>
                        <SelectItem value="select">Seleção única</SelectItem>
                        <SelectItem value="multiselect">Múltipla escolha</SelectItem>
                        <SelectItem value="radio">Radio buttons</SelectItem>
                        <SelectItem value="checkbox">Checkbox</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(field.type === 'select' || field.type === 'multiselect' || field.type === 'radio') && (
                  <div>
                    <Label>Opções (uma por linha)</Label>
                    <Textarea
                      value={field.options?.join('\n') || ''}
                      onChange={(e) => updateField(index, { 
                        options: e.target.value.split('\n').filter(Boolean) 
                      })}
                      placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                      rows={3}
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Switch
                    checked={field.required}
                    onCheckedChange={(checked) => updateField(index, { required: checked })}
                  />
                  <Label>Campo obrigatório</Label>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeField(index)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button onClick={addField} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Campo
          </Button>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>System Prompt da IA</CardTitle>
          <CardDescription>
            Instruções para a IA processar as respostas. Seja específico e conciso para reduzir custos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Exemplo: Você é um estrategista de marketing digital. Analise as respostas do briefing e crie um perfil detalhado do cliente, incluindo persona, linha editorial e pilares de conteúdo."
            rows={8}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-2">
            💡 Prompts curtos gastam menos tokens e reduzem custos. Seja direto e objetivo.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onSaved}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : templateId ? "Atualizar Template" : "Criar Template"}
        </Button>
      </div>
    </div>
  );
}
