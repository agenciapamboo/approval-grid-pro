import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BriefingForm } from "@/components/client/BriefingForm";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, RefreshCw, Target, TrendingUp, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import AccessGate from "@/components/auth/AccessGate";
import { callApi } from "@/lib/apiClient";
import { toast } from "sonner";

export default function ClientBriefing() {
  const { clientId } = useParams<{ clientId: string }>();
  const [searchParams] = useSearchParams();
  const briefingType = (searchParams.get('type') || 'client_profile') as 'client_profile' | 'editorial_line';
  
  const [profile, setProfile] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [clientId, briefingType]);

  async function loadData() {
    if (!clientId) return;
    setLoading(true);

    const legacyLoad = async () => {
      let profileData = null;
      const { data } = await (supabase as any)
        .from('client_ai_profiles')
        .select('*, briefing_templates(*)')
        .eq('client_id', clientId)
        .single();

      profileData = data;
      let templateToUse = null;
      let shouldShowForm = false;

      if (profileData) {
        if (briefingType === 'editorial_line') {
          if (profileData.briefing_templates?.template_type === 'editorial_line') {
            templateToUse = profileData.briefing_templates;
          } else {
            const { data: editorialTemplate } = await (supabase as any)
              .from('briefing_templates')
              .select('*')
              .eq('template_type', 'editorial_line')
              .eq('is_active', true)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            templateToUse = editorialTemplate;
          }
        } else {
          templateToUse = profileData.briefing_templates;
        }
      } else {
        const { data: templateData } = await (supabase as any)
          .from('briefing_templates')
          .select('*')
          .eq('template_type', briefingType)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (templateData) {
          templateToUse = templateData;
          shouldShowForm = true;
        } else {
          const { data: fallbackTemplate } = await (supabase as any)
            .from('briefing_templates')
            .select('*')
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();

          if (fallbackTemplate) {
            templateToUse = fallbackTemplate;
            shouldShowForm = true;
          }
        }
      }

      return {
        profile: profileData,
        template: templateToUse,
        showForm: shouldShowForm || !profileData,
      };
    };

    try {
      const payload = { clientId, type: briefingType };
      console.log('[ClientBriefing] payload', payload);

      const response = await callApi<{
        profile: any;
        template: any;
        showForm: boolean;
      }>('/api/briefing/getEditorialBriefing', {
        method: "POST",
        payload,
        fallback: legacyLoad,
      });
      console.log('[ClientBriefing] response', response);

      setProfile(response.profile);
      setTemplate(response.template);
      setShowForm(Boolean(response.showForm ?? !response.profile));
    } catch (error) {
      console.error('Error loading briefing data:', error);
      toast.error("Erro ao carregar briefing");
    } finally {
      setLoading(false);
    }
  }

  const handleProfileGenerated = async (newProfile: any) => {
    // Recarregar dados após gerar perfil
    setLoading(true);
    await loadData();
    setShowForm(false);
    setLoading(false);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Sparkles className="h-8 w-8 animate-spin text-green-500" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AccessGate allow={['super_admin', 'agency_admin', 'client_user']}>
      <AppLayout>
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-green-500 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">
                  {briefingType === 'editorial_line' ? 'Briefing Linha Editorial' : 'Briefing Inteligente'}
                </h1>
                <p className="text-muted-foreground">
                  {briefingType === 'editorial_line' 
                    ? (profile?.editorial_line ? "Sua linha editorial" : "Configure sua linha editorial com IA")
                    : (profile ? "Seu perfil de IA" : "Crie seu perfil com Inteligência Artificial")
                  }
                </p>
              </div>
            </div>

            {profile && !showForm && (
              <Button onClick={() => setShowForm(true)} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refazer Briefing
              </Button>
            )}
          </div>

          {showForm ? (
            <BriefingForm
              templateId={template?.id}
              clientId={clientId!}
              briefingType={briefingType}
              onProfileGenerated={handleProfileGenerated}
            />
          ) : profile && briefingType === 'client_profile' ? (
            <div className="space-y-6">
              {/* Resumo */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-500" />
                    Resumo do Perfil
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {profile.ai_generated_profile?.summary}
                  </p>
                </CardContent>
              </Card>

              {/* Persona */}
              {profile.ai_generated_profile?.target_persona && (
                <Card className="glass">
                  <CardHeader>
                    <CardTitle>Persona do Público-Alvo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Faixa Etária</p>
                      <Badge variant="outline">
                        {profile.ai_generated_profile.target_persona.age_range}
                      </Badge>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-sm font-medium mb-2">Interesses</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.ai_generated_profile.target_persona.interests?.map((interest: string) => (
                          <Badge key={interest} variant="outline">{interest}</Badge>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-sm font-medium mb-2">Dores e Desafios</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.ai_generated_profile.target_persona.pain_points?.map((pain: string) => (
                          <Badge key={pain} variant="outline" className="border-destructive text-destructive">
                            {pain}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Estratégia de Conteúdo */}
              {profile.ai_generated_profile?.content_strategy && (
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      Estratégia de Conteúdo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Frequência de Posts</p>
                        <p className="text-muted-foreground">
                          {profile.ai_generated_profile.content_strategy.post_frequency}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Melhores Horários</p>
                        <div className="flex flex-wrap gap-2">
                          {profile.ai_generated_profile.content_strategy.best_times?.map((time: string) => (
                            <Badge key={time}>{time}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-sm font-medium mb-3">Mix de Conteúdo</p>
                      <div className="space-y-2">
                        {Object.entries(profile.ai_generated_profile.content_strategy.content_mix || {}).map(
                          ([type, percentage]: [string, any]) => (
                            <div key={type} className="flex items-center gap-3">
                              <span className="text-sm min-w-[120px] capitalize">{type}</span>
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium min-w-[40px] text-right">{percentage}%</span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Linha Editorial e Pilares */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-green-500" />
                      Linha Editorial
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {profile.editorial_line || profile.ai_generated_profile?.editorial_line}
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardHeader>
                    <CardTitle>Pilares de Conteúdo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(profile.content_pillars || profile.ai_generated_profile?.content_pillars)?.map(
                        (pillar: string, index: number) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span>{pillar}</span>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tom de Voz e Keywords */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="glass">
                  <CardHeader>
                    <CardTitle>Tom de Voz</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(profile.tone_of_voice || profile.ai_generated_profile?.tone_of_voice)?.map(
                        (tone: string) => (
                          <Badge key={tone} variant="outline">{tone}</Badge>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardHeader>
                    <CardTitle>Palavras-Chave</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(profile.keywords || profile.ai_generated_profile?.keywords)?.map(
                        (keyword: string) => (
                          <Badge key={keyword} variant="outline">{keyword}</Badge>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : briefingType === 'editorial_line' && (profile?.editorial_line || profile?.ai_generated_profile?.editorial_line) ? (
            // Exibir linha editorial quando type=editorial_line
            // Priorizar editorial_line direto (gerado pelo formulário de linha editorial)
            // sobre ai_generated_profile.editorial_line (do perfil completo)
            <div className="space-y-6">
              {/* Informações do Formulário do Briefing */}
              {profile?.briefing_responses && (
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Target className="h-5 w-5 text-green-500" />
                      Informações do Briefing
                    </CardTitle>
                    <CardDescription>
                      Dados preenchidos no formulário de linha editorial
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(() => {
                      try {
                        const responses = typeof profile.briefing_responses === 'string' 
                          ? JSON.parse(profile.briefing_responses) 
                          : profile.briefing_responses;
                        
                        if (!responses || typeof responses !== 'object') {
                          return <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>;
                        }
                        
                        // Mapear IDs dos campos para labels legíveis baseado nos campos mencionados pelo usuário
                        const fieldLabels: Record<string, string> = {
                          'business_type': 'Tipo de negócio',
                          'content_pillars': 'Quais pilares principais você gostaria de priorizar nos conteúdos?',
                          'content_frequency': 'Há algum tipo de conteúdo que você deseja produzir com mais frequência?',
                          'monthly_themes': 'Quais temas ou assuntos devem aparecer todos os meses?',
                          'restrictions': 'Existe alguma restrição de temas, estilos ou abordagens que não devem entrar na linha editorial?',
                          'content_balance': 'Qual o nível de equilíbrio ideal entre conteúdo institucional, educativo e comercial?'
                        };
                        
                        // Se tiver template com fields, usar os labels do template
                        const fieldMap = template?.fields 
                          ? new Map(template.fields.map((f: any) => [f.id, f]))
                          : new Map();
                        
                        const fieldsToDisplay = Object.keys(responses).filter(key => {
                          const value = responses[key];
                          return value !== null && value !== undefined && value !== '' && 
                                 (!Array.isArray(value) || value.length > 0);
                        });
                        
                        if (fieldsToDisplay.length === 0) {
                          return <p className="text-sm text-muted-foreground">Nenhum dado preenchido</p>;
                        }
                        
                        return (
                          <div className="grid gap-4 md:grid-cols-2">
                            {fieldsToDisplay.map((fieldId) => {
                              const responseValue = responses[fieldId];
                              const field = fieldMap.get(fieldId);
                              const label = field?.label || fieldLabels[fieldId] || fieldId;
                              
                              let displayValue: any = null;
                              
                              if (Array.isArray(responseValue)) {
                                if (responseValue.length === 0) return null;
                                displayValue = (
                                  <div className="flex flex-wrap gap-2">
                                    {responseValue.map((item: string, idx: number) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {String(item)}
                                      </Badge>
                                    ))}
                                  </div>
                                );
                              } else if (typeof responseValue === 'boolean') {
                                displayValue = (
                                  <Badge variant={responseValue ? "default" : "outline"}>
                                    {responseValue ? 'Sim' : 'Não'}
                                  </Badge>
                                );
                              } else if (typeof responseValue === 'object' && responseValue !== null) {
                                displayValue = (
                                  <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                                    {JSON.stringify(responseValue, null, 2)}
                                  </pre>
                                );
                              } else {
                                displayValue = (
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {String(responseValue)}
                                  </p>
                                );
                              }
                              
                              return (
                                <div key={fieldId} className="space-y-2">
                                  <h4 className="text-sm font-semibold text-foreground">{label}</h4>
                                  <div>
                                    {displayValue}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      } catch (error) {
                        console.error('Error parsing briefing responses:', error);
                        return <p className="text-sm text-muted-foreground">Erro ao carregar dados do briefing</p>;
                      }
                    })()}
                  </CardContent>
                </Card>
              )}
              
              <Card className="glass border-green-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center">
                      <MessageSquare className="h-6 w-6 text-white" />
                    </div>
                    Linha Editorial
                  </CardTitle>
                  <CardDescription>
                    Base editorial gerada com Inteligência Artificial
                    {template?.template_type === 'editorial_line' && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Template: {template.name})
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Exibir linha editorial estruturada se disponível */}
                  {(() => {
                    const editorialData = (template?.template_type === 'editorial_line' || profile?.briefing_templates?.template_type === 'editorial_line')
                      ? (profile.editorial_line || profile.ai_generated_profile?.editorial_line)
                      : (profile.ai_generated_profile?.editorial_line || profile.editorial_line);
                    
                    // Tentar parsear se for JSON (estrutura semanal)
                    let parsedData = null;
                    try {
                      parsedData = typeof editorialData === 'string' ? JSON.parse(editorialData) : editorialData;
                    } catch {
                      parsedData = null;
                    }
                    
                    // Se tiver estrutura semanal, exibir de forma organizada
                    if (parsedData?.monthly_structure) {
                      const structure = parsedData.monthly_structure;
                      return (
                        <div className="space-y-6">
                          {/* Descrição geral */}
                          {parsedData.editorial_line && (
                            <div className="prose prose-sm max-w-none">
                              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                                {parsedData.editorial_line}
                              </p>
                            </div>
                          )}
                          
                          <Separator />
                          
                          {/* Estrutura semanal */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-semibold">Planejamento Mensal</h3>
                              <Badge variant="outline" className="text-sm">
                                Total: {structure.total_creatives} criativos
                              </Badge>
                            </div>
                            
                            <div className="grid gap-4">
                              {structure.weeks?.map((week: any, weekIndex: number) => (
                                <Card key={weekIndex} className="border-l-4 border-l-green-500">
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                      <span className="h-8 w-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">
                                        {week.week_number}
                                      </span>
                                      Semana {week.week_number}
                                      <Badge variant="outline" className="ml-auto">
                                        {week.posts?.length || 0} posts
                                      </Badge>
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-2">
                                      {week.posts?.map((post: any, postIndex: number) => (
                                        <div key={postIndex} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                                          <Badge variant="outline" className="shrink-0">
                                            {post.type}
                                          </Badge>
                                          <p className="text-sm text-muted-foreground flex-1">
                                            {post.description || 'Conteúdo sugerido'}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    // Exibir como texto simples se não tiver estrutura
                    return (
                      <div className="prose prose-sm max-w-none">
                        <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                          {typeof editorialData === 'string' ? editorialData : JSON.stringify(editorialData, null, 2)}
                        </p>
                      </div>
                    );
                  })()}
                  
                  <Separator />
                  
                  <div className="flex justify-end">
                    <Button onClick={() => setShowForm(true)} variant="outline" className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Atualizar Linha Editorial
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Informações adicionais se disponíveis */}
              {(profile.content_pillars?.length > 0 || profile.ai_generated_profile?.content_pillars?.length > 0) && (
                <Card className="glass">
                  <CardHeader>
                    <CardTitle>Pilares de Conteúdo Relacionados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(profile.content_pillars || profile.ai_generated_profile?.content_pillars)?.map(
                        (pillar: string, index: number) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span>{pillar}</span>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {(profile.tone_of_voice?.length > 0 || profile.ai_generated_profile?.tone_of_voice?.length > 0) && (
                <Card className="glass">
                  <CardHeader>
                    <CardTitle>Tom de Voz</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(profile.tone_of_voice || profile.ai_generated_profile?.tone_of_voice)?.map(
                        (tone: string) => (
                          <Badge key={tone} variant="outline">{tone}</Badge>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="glass">
              <CardContent className="text-center py-12">
                <Sparkles className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {briefingType === 'editorial_line' 
                    ? 'Nenhuma linha editorial encontrada' 
                    : 'Nenhum perfil encontrado'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {briefingType === 'editorial_line'
                    ? 'Crie um briefing para gerar sua linha editorial com IA'
                    : 'Crie um briefing para gerar seu perfil de IA'}
                </p>
                <Button onClick={() => setShowForm(true)}>
                  Começar Briefing
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </AppLayout>
    </AccessGate>
  );
}
