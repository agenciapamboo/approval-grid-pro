import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Loader2, Sparkles, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CaptionContextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  contentType: 'post' | 'reels' | 'stories';
  initialTitle?: string;
  onGenerate: (context: CaptionContext) => void;
  loading: boolean;
}

export interface CaptionContext {
  title: string;
  objective: string;
  toneOfVoice: string;
  expectedAction: string;
  contentPillar: string;
  customPrompt?: string; // Prompt personalizado opcional
  templateId?: string; // ID do template de roteiro, legenda ou carrossel selecionado
  templateType?: 'script' | 'caption' | 'carousel'; // Tipo de template selecionado
  slideCount?: number; // Número de slides para carrossel
}

export function CaptionContextDialog({ 
  open, 
  onOpenChange, 
  clientId,
  contentType,
  initialTitle = "",
  onGenerate,
  loading 
}: CaptionContextDialogProps) {
  const [title, setTitle] = useState(initialTitle);
  const [objective, setObjective] = useState("");
  const [toneOfVoice, setToneOfVoice] = useState("");
  const [expectedAction, setExpectedAction] = useState("");
  const [contentPillar, setContentPillar] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [brandTone, setBrandTone] = useState<string | null>(null);
  const [contentPillars, setContentPillars] = useState<string[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templates, setTemplates] = useState<Array<{ id: string; template_name: string; template_content: string }>>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedType, setSelectedType] = useState<'script' | 'caption' | 'carousel'>('script'); // Tipo selecionado: Roteiro, Legenda ou Carrossel
  const [carouselSlideCount, setCarouselSlideCount] = useState<number>(5); // Número de slides para carrossel

  useEffect(() => {
    if (!open || !clientId) return;
    
    const loadBrandTone = async () => {
      setLoadingProfile(true);
      try {
        const { data } = await supabase
          .from('client_ai_profiles')
          .select('tone_of_voice, content_pillars')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (data?.tone_of_voice?.length > 0) {
          setBrandTone(data.tone_of_voice.join(', '));
        }
        if (data?.content_pillars?.length > 0) {
          setContentPillars(data.content_pillars);
        }
      } catch (error) {
        console.error('Error loading brand tone:', error);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadBrandTone();
    setTitle(initialTitle);
  }, [open, clientId, initialTitle, contentType]);

  // Carregar templates quando o tipo selecionado mudar
  useEffect(() => {
    if (!open || !clientId) return;
    
    const loadTemplatesOnTypeChange = async () => {
      setLoadingTemplates(true);
      try {
        // Para carrossel, não carregamos templates (não existe template_type 'carousel' ainda)
        // O usuário pode usar templates de caption se quiser
        if (selectedType === 'carousel') {
          setTemplates([]);
          setLoadingTemplates(false);
          return;
        }

        // Buscar agency_id do cliente
        const { data: clientData } = await supabase
          .from('clients')
          .select('agency_id')
          .eq('id', clientId)
          .single();
        
        if (!clientData?.agency_id) {
          setLoadingTemplates(false);
          return;
        }
        
        // Buscar templates da agência E templates globais (super_admin) do tipo selecionado
        const [agencyTemplatesResult, globalTemplatesResult] = await Promise.all([
          supabase
            .from('ai_text_templates')
            .select('id, template_name, template_content')
            .eq('agency_id', clientData.agency_id)
            .eq('template_type', selectedType)
            .eq('is_active', true)
            .order('template_name'),
          supabase
            .from('ai_text_templates')
            .select('id, template_name, template_content')
            .is('agency_id', null)
            .eq('template_type', selectedType)
            .eq('is_active', true)
            .order('template_name')
        ]);
        
        const allTemplates: Array<{ id: string; template_name: string; template_content: string }> = [];
        if (agencyTemplatesResult.data) {
          allTemplates.push(...agencyTemplatesResult.data);
        }
        if (globalTemplatesResult.data) {
          // Adicionar templates globais, evitando duplicatas
          globalTemplatesResult.data.forEach(t => {
            if (!allTemplates.find(existing => existing.id === t.id)) {
              allTemplates.push(t);
            }
          });
        }
        
        setTemplates(allTemplates);
        // Limpar seleção de template ao mudar o tipo
        setSelectedTemplate("");
      } catch (error) {
        console.error('Error loading templates:', error);
      } finally {
        setLoadingTemplates(false);
      }
    };

    loadTemplatesOnTypeChange();
  }, [selectedType, open, clientId]);

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("Por favor, preencha o título da peça");
      return;
    }

    onGenerate({
      title,
      objective,
      toneOfVoice,
      expectedAction,
      contentPillar,
      customPrompt: customPrompt.trim() || undefined,
      templateId: selectedTemplate || undefined,
      templateType: selectedTemplate ? selectedType : undefined,
      slideCount: selectedType === 'carousel' ? carouselSlideCount : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="bg-green-500 rounded p-1.5">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            Contextualizar Geração de Conteúdo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título da Peça *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Lançamento Produto X, Dia das Mães, Promo Black Friday"
            />
          </div>

          {/* Objetivo */}
          <div className="space-y-2">
            <Label htmlFor="objective">Objetivo da Peça</Label>
            <Select value={objective} onValueChange={setObjective}>
              <SelectTrigger id="objective">
                <SelectValue placeholder="Selecione o objetivo principal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="engagement">Engajamento (curtidas, comentários)</SelectItem>
                <SelectItem value="awareness">Awareness (reconhecimento de marca)</SelectItem>
                <SelectItem value="traffic">Tráfego (cliques para site/loja)</SelectItem>
                <SelectItem value="conversion">Conversão (vendas diretas)</SelectItem>
                <SelectItem value="education">Educação (informar, ensinar)</SelectItem>
                <SelectItem value="entertainment">Entretenimento (diversão)</SelectItem>
                <SelectItem value="community">Comunidade (fortalecer relacionamento)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tom de Voz */}
          <div className="space-y-2">
            <Label htmlFor="tone">Tom de Voz</Label>
            {loadingProfile ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando tom da marca...
              </div>
            ) : (
              <Select value={toneOfVoice} onValueChange={setToneOfVoice}>
                <SelectTrigger id="tone">
                  <SelectValue placeholder="Selecione o tom de voz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Amigável</SelectItem>
                  <SelectItem value="professional">Profissional/Séria</SelectItem>
                  <SelectItem value="institutional">Institucional</SelectItem>
                  {brandTone && (
                    <SelectItem value="brand">
                      Da Marca ({brandTone})
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Pilar de Conteúdo */}
          <div className="space-y-2">
            <Label htmlFor="pillar">Pilar de Conteúdo</Label>
            {loadingProfile ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando pilares...
              </div>
            ) : (
              <Select value={contentPillar} onValueChange={setContentPillar}>
                <SelectTrigger id="pillar">
                  <SelectValue placeholder="Selecione o pilar de conteúdo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="institucional">Institucional</SelectItem>
                  <SelectItem value="promocional">Promocional</SelectItem>
                  <SelectItem value="educativo">Educativo</SelectItem>
                  <SelectItem value="envolvimento">Envolvimento</SelectItem>
                  <SelectItem value="motivacao">Motivação</SelectItem>
                  <SelectItem value="opiniao">Opinião</SelectItem>
                  {contentPillars.length > 0 && contentPillars.map((pillar) => (
                    <SelectItem key={pillar} value={pillar}>
                      {pillar.charAt(0).toUpperCase() + pillar.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Seletor de Tipo: Roteiro, Legenda ou Carrossel */}
          <div className="space-y-3 border rounded-lg p-4">
            <Label>Selecione o tipo de conteúdo</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="script"
                  checked={selectedType === 'script'}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedType('script');
                      setSelectedTemplate("");
                    }
                  }}
                />
                <Label
                  htmlFor="script"
                  className="text-sm font-normal cursor-pointer"
                >
                  Roteiro
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="caption"
                  checked={selectedType === 'caption'}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedType('caption');
                      setSelectedTemplate("");
                    }
                  }}
                />
                <Label
                  htmlFor="caption"
                  className="text-sm font-normal cursor-pointer"
                >
                  Legenda
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="carousel"
                  checked={selectedType === 'carousel'}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedType('carousel');
                      setSelectedTemplate("");
                    }
                  }}
                />
                <Label
                  htmlFor="carousel"
                  className="text-sm font-normal cursor-pointer"
                >
                  Carrossel
                </Label>
              </div>
            </div>

            {/* Configuração de slides para carrossel */}
            {selectedType === 'carousel' && (
              <div className="mt-4 space-y-2 p-3 bg-muted/50 rounded-lg">
                <Label htmlFor="slideCount" className="text-sm font-medium">
                  Número de slides (1-20)
                </Label>
                <Input
                  id="slideCount"
                  type="number"
                  min={1}
                  max={20}
                  value={carouselSlideCount}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 1 && value <= 20) {
                      setCarouselSlideCount(value);
                    }
                  }}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Cada slide terá seu texto individual gerado pela IA
                </p>
              </div>
            )}
          </div>

          {/* Template de Roteiro, Legenda ou Carrossel */}
          {templates.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="template">
                {selectedType === 'script' 
                  ? 'Template de Roteiro' 
                  : selectedType === 'caption'
                  ? 'Template de Legenda'
                  : 'Template de Carrossel'} (opcional)
              </Label>
              {loadingTemplates ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando templates...
                </div>
              ) : (
                <div className="space-y-2">
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger id="template">
                    <SelectValue placeholder={
                      selectedType === 'script' 
                        ? 'Selecione um template de roteiro ou crie novo'
                        : selectedType === 'caption'
                        ? 'Selecione um template de legenda ou crie novo'
                        : 'Selecione um template de carrossel ou crie novo'
                    } />
                  </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sem template (criar novo)</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.template_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Lista de templates com hover para preview */}
                  {templates.length > 0 && (
                    <div className="space-y-1 mt-2">
                      <p className="text-xs text-muted-foreground">Passe o mouse nos templates abaixo para visualizar:</p>
                      <div className="space-y-1 max-h-40 overflow-y-auto border rounded p-2">
                        {templates.map((template) => (
                          <HoverCard key={template.id}>
                            <HoverCardTrigger asChild>
                              <div 
                                className="flex items-center justify-between p-2 rounded cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => setSelectedTemplate(template.id)}
                              >
                                <span className="text-sm">{template.template_name}</span>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-96 max-h-96 overflow-y-auto">
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">{template.template_name}</h4>
                                <div className="text-sm text-muted-foreground whitespace-pre-wrap border-t pt-2">
                                  {template.template_content}
                                </div>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {templates.length === 0 && !loadingTemplates && (
            <div className="text-sm text-muted-foreground p-3 border rounded-lg bg-muted/30">
              Nenhum template de {
                selectedType === 'script' 
                  ? 'roteiro' 
                  : selectedType === 'caption'
                  ? 'legenda'
                  : 'carrossel'
              } cadastrado. 
              Você pode criar templates em <strong>Admin → Templates de Texto e Roteiros</strong>.
            </div>
          )}

          {/* Ação Esperada */}
          <div className="space-y-2">
            <Label htmlFor="action">Ação Esperada do Público</Label>
            <Textarea
              id="action"
              value={expectedAction}
              onChange={(e) => setExpectedAction(e.target.value)}
              placeholder="Ex: Curtir, Comentar com opinião, Clicar no link, Marcar amigos, Salvar para depois, Compartilhar, Comprar no site"
              rows={3}
            />
          </div>

          {/* Prompt Personalizado (Opcional) */}
          <div className="space-y-2">
            <Label htmlFor="customPrompt" className="text-sm font-medium">
              Prompt Personalizado <span className="text-muted-foreground font-normal">(Opcional)</span>
            </Label>
            <Textarea
              id="customPrompt"
              placeholder="Adicione instruções específicas para a IA. Ex: Use emojis, seja mais informal, foque em benefícios, mencione promoção..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Este campo permite personalizar a geração com instruções adicionais
            </p>
          </div>

          {/* Botões */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !title.trim()}
              className="bg-green-500 hover:bg-green-600"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Gerar Sugestões
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
