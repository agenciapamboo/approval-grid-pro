import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  videoDurationSeconds?: number; // Duração do vídeo em segundos para roteiro
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
  type TemplateOption = {
    id: string;
    template_name: string;
    template_content: string;
    template_type: 'script' | 'caption' | 'carousel';
  };
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const isDebug = typeof import.meta !== "undefined" ? Boolean(import.meta.env?.DEV) : process.env.NODE_ENV !== "production";
  const [selectedType, setSelectedType] = useState<'script' | 'caption' | 'carousel'>('script'); // Tipo selecionado: Roteiro, Legenda ou Carrossel
  const [carouselSlideCount, setCarouselSlideCount] = useState<number>(5); // Número de slides para carrossel
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number>(60); // Duração do vídeo em segundos para roteiro

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

  const loadTemplates = useCallback(async () => {
    if (!open || !clientId) return;

    setLoadingTemplates(true);
    setTemplateError(null);

    try {
      const normalizedType = selectedType.toLowerCase();
      const typesToSearch = normalizedType === 'carousel'
        ? ['carousel', 'script']
        : [normalizedType];

      if (isDebug) {
        console.log('[CaptionContextDialog] 🔍 Buscando templates', { typesToSearch, clientId });
      }

      const { data, error } = await supabase
        .from('ai_text_templates')
        .select('id, template_name, template_content, template_type, agency_id')
        .is('agency_id', null)
        .in('template_type', typesToSearch)
        .eq('is_active', true)
        .order('template_name');

      if (error) {
        throw error;
      }

      const sanitizedTemplates = (data || []).map((template) => ({
        id: template.id,
        template_name: template.template_name,
        template_content: template.template_content,
        template_type: template.template_type as TemplateOption['template_type'],
      }));

      setTemplates(sanitizedTemplates);
      setSelectedTemplate("");

      if (isDebug) {
        console.log('[CaptionContextDialog] ✅ Templates encontrados:', sanitizedTemplates);
      }

      if (sanitizedTemplates.length === 0 && isDebug) {
        console.warn('[CaptionContextDialog] ⚠️ Nenhum template encontrado para os tipos:', typesToSearch);
      }
    } catch (error: any) {
      console.error('[CaptionContextDialog] ❌ Erro ao carregar templates:', error);
      setTemplates([]);
      setTemplateError(error?.message || 'Erro ao carregar templates. Tente novamente mais tarde.');
    } finally {
      setLoadingTemplates(false);
    }
  }, [clientId, open, selectedType, isDebug]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

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
      videoDurationSeconds: selectedType === 'script' ? videoDurationSeconds : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="bg-green-500 rounded p-1.5">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            Contextualizar Geração de Conteúdo
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 max-h-[calc(90vh-200px)]">
          <div className="space-y-4 pr-4">
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

          {/* Objetivo e Tom de Voz na mesma linha */}
          <div className="grid grid-cols-2 gap-4">
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

            {/* Configuração de duração do vídeo para roteiro */}
            {selectedType === 'script' && (
              <div className="mt-4 space-y-2 p-3 bg-muted/50 rounded-lg">
                <Label htmlFor="videoDuration" className="text-sm font-medium">
                  Duração do vídeo (segundos)
                </Label>
                <Input
                  id="videoDuration"
                  type="number"
                  min={15}
                  max={180}
                  value={videoDurationSeconds}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 15 && value <= 180) {
                      setVideoDurationSeconds(value);
                    }
                  }}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Duração do vídeo em segundos (15-180s)
                </p>
              </div>
            )}
          </div>

          {/* Template de Roteiro, Legenda ou Carrossel */}
          <div className="space-y-2">
            <Label htmlFor="template">
              {selectedType === 'script' 
                ? 'Template de Roteiro' 
                : selectedType === 'caption'
                ? 'Template de Legenda'
                : 'Template de Carrossel'} (opcional)
            </Label>
            {templateError ? (
              <div className="text-sm text-red-600 bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-2">
                <p>{templateError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadTemplates}
                  disabled={loadingTemplates}
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  Tentar novamente
                </Button>
              </div>
            ) : loadingTemplates ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando templates...
              </div>
            ) : templates.length === 0 ? (
              <div className="text-sm text-muted-foreground p-3 border rounded-lg bg-muted/30 space-y-2">
                <p>
                  Nenhum template de {
                    selectedType === 'script' 
                      ? 'roteiro' 
                      : selectedType === 'caption'
                      ? 'legenda'
                      : 'carrossel ou roteiro'
                  } cadastrado. Os templates são cadastrados pelo <strong>Super Admin</strong> e ficam disponíveis para uso.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadTemplates}
                  disabled={loadingTemplates}
                  className="w-fit"
                >
                  Recarregar templates
                </Button>
                <p className="text-xs text-muted-foreground">
                  Dica: ao selecionar carrossel listamos também templates do tipo roteiro.
                </p>
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
                        : 'Selecione um template de carrossel ou roteiro'
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
                            <div>
                              <span className="text-sm font-medium block">{template.template_name}</span>
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                {template.template_type === 'script' ? 'Roteiro' : template.template_type === 'caption' ? 'Legenda' : 'Carrossel'}
                              </span>
                            </div>
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
              </div>
            )}
          </div>

          {/* Ação Esperada */}
          <div className="space-y-2">
            <Label htmlFor="action">Ação Esperada do Público</Label>
            <Input
              id="action"
              value={expectedAction}
              onChange={(e) => setExpectedAction(e.target.value)}
              placeholder="Ex: Curtir, Comentar com opinião, Clicar no link, Marcar amigos, Salvar para depois, Compartilhar, Comprar no site"
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

          </div>
        </ScrollArea>

        {/* Botões fixos na parte inferior */}
        <div className="flex gap-2 justify-end pt-4 border-t mt-4">
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
      </DialogContent>
    </Dialog>
  );
}
