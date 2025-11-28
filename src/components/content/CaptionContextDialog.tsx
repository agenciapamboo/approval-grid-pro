import { useState, useEffect } from "react";
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
  const [templates, setTemplates] = useState<Array<{ id: string; template_name: string; template_content: string }>>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
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

  // Carregar templates quando o tipo selecionado mudar
  useEffect(() => {
    if (!open || !clientId) return;
    
    /**
     * Carrega templates da tabela ai_text_templates
     * 
     * IMPORTANTE: Inicialmente não haverá templates cadastrados por agência.
     * Apenas templates do sistema (globais, com agency_id = NULL) são buscados.
     * 
     * NOTA: Existe um sistema de cache separado que armazena legendas criadas por agência
     * para machine learning e reaproveitamento com conteúdo editado - isso é diferente
     * dos templates de estrutura cadastrados pelo Super Admin.
     * 
     * Lógica de busca:
     * - Todos os usuários: Busca apenas templates globais do sistema (agency_id = NULL)
     * - Templates são cadastrados pelo Super Admin e ficam disponíveis para todos
     * 
     * Tabela: ai_text_templates
     * Campos utilizados:
     * - id: UUID do template
     * - template_name: Nome do template
     * - template_content: Conteúdo do template
     * - agency_id: NULL (sempre NULL para templates do sistema)
     * - template_type: 'script' | 'caption' | 'carousel'
     * - is_active: true para templates ativos
     */
    const loadTemplatesOnTypeChange = async () => {
      setLoadingTemplates(true);
      try {
        console.log('[CaptionContextDialog] 🔍 Carregando templates do sistema para tipo:', selectedType);
        
        // Verificar autenticação
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('[CaptionContextDialog] ⚠️ Usuário não autenticado');
          setLoadingTemplates(false);
          return;
        }

        // BUSCAR APENAS TEMPLATES GLOBAIS DO SISTEMA (agency_id = NULL)
        // Templates são cadastrados pelo Super Admin e ficam disponíveis para todos
        console.log('[CaptionContextDialog] 🔍 Buscando templates globais do sistema na tabela ai_text_templates');
        console.log('[CaptionContextDialog] 🔍 Tipo selecionado:', selectedType);
        console.log('[CaptionContextDialog] 🔍 Query: SELECT id, template_name, template_content, agency_id, template_type FROM ai_text_templates WHERE agency_id IS NULL AND template_type = ? AND is_active = true');
        
        const { data, error } = await supabase
          .from('ai_text_templates') // TABELA: ai_text_templates
          .select('id, template_name, template_content, agency_id, template_type')
          .is('agency_id', null) // Apenas templates globais do sistema
          .eq('template_type', selectedType)
          .eq('is_active', true)
          .order('template_name');
        
        console.log('[CaptionContextDialog] 📊 Resultado da query:', { 
          hasError: !!error, 
          error: error, 
          dataLength: data?.length || 0,
          data: data 
        });
        
        if (error) {
          console.error('[CaptionContextDialog] ❌ Erro ao buscar templates:', error);
          console.error('[CaptionContextDialog] ❌ Detalhes do erro:', JSON.stringify(error, null, 2));
          setTemplates([]);
        } else {
          console.log('[CaptionContextDialog] ✅ Templates do sistema encontrados:', data?.length || 0);
          if (data && data.length > 0) {
            console.log('[CaptionContextDialog] 📋 Templates encontrados:', data.map(t => ({ 
              name: t.template_name, 
              id: t.id,
              type: t.template_type,
              agency_id: t.agency_id
            })));
          } else {
            console.log('[CaptionContextDialog] ⚠️ Nenhum template do sistema encontrado para o tipo:', selectedType);
            console.log('[CaptionContextDialog] 🔍 Verificando se existem templates na tabela sem filtros...');
            
            // Debug: Verificar se existem templates na tabela (sem filtros)
            const { data: allTemplatesDebug, error: debugError } = await supabase
              .from('ai_text_templates')
              .select('id, template_name, template_type, agency_id')
              .limit(10);
            
            console.log('[CaptionContextDialog] 🔍 DEBUG - Todos os templates na tabela (primeiros 10):', {
              hasError: !!debugError,
              error: debugError,
              count: allTemplatesDebug?.length || 0,
              templates: allTemplatesDebug
            });
            
            // Debug: Verificar templates globais especificamente
            const { data: globalTemplatesDebug, error: globalDebugError } = await supabase
              .from('ai_text_templates')
              .select('id, template_name, template_type, agency_id')
              .is('agency_id', null)
              .limit(10);
            
            console.log('[CaptionContextDialog] 🔍 DEBUG - Templates globais (agency_id IS NULL):', {
              hasError: !!globalDebugError,
              error: globalDebugError,
              count: globalTemplatesDebug?.length || 0,
              templates: globalTemplatesDebug
            });
            
            // Debug: Verificar templates do tipo selecionado
            const { data: typeTemplatesDebug, error: typeDebugError } = await supabase
              .from('ai_text_templates')
              .select('id, template_name, template_type, agency_id')
              .eq('template_type', selectedType)
              .limit(10);
            
            console.log('[CaptionContextDialog] 🔍 DEBUG - Templates do tipo', selectedType + ':', {
              hasError: !!typeDebugError,
              error: typeDebugError,
              count: typeTemplatesDebug?.length || 0,
              templates: typeTemplatesDebug
            });
            
            console.log('[CaptionContextDialog] 💡 Templates devem ser cadastrados pelo Super Admin em Admin → Templates de Texto e Roteiros');
          }
          setTemplates((data || []) as Array<{ id: string; template_name: string; template_content: string }>);
        }
        setSelectedTemplate("");
        
      } catch (error) {
        console.error('[CaptionContextDialog] ❌ Erro geral ao carregar templates:', error);
        setTemplates([]);
      } finally {
        setLoadingTemplates(false);
        console.log('[CaptionContextDialog] ✅ Carregamento de templates finalizado');
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
            {loadingTemplates ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando templates...
              </div>
            ) : templates.length === 0 ? (
              <div className="text-sm text-muted-foreground p-3 border rounded-lg bg-muted/30">
                Nenhum template de {
                  selectedType === 'script' 
                    ? 'roteiro' 
                    : selectedType === 'caption'
                    ? 'legenda'
                    : 'carrossel'
                } cadastrado. Os templates são cadastrados pelo <strong>Super Admin</strong> e ficam disponíveis para uso.
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
