import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BriefingForm } from "@/components/client/BriefingForm";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, RefreshCw, Target, TrendingUp, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import AccessGate from "@/components/auth/AccessGate";

export default function ClientBriefing() {
  const { clientId } = useParams<{ clientId: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [clientId]);

  async function loadData() {
    if (!clientId) return;

    // Buscar perfil existente
    const { data: profileData } = await (supabase as any)
      .from('client_ai_profiles')
      .select('*, briefing_templates(*)')
      .eq('client_id', clientId)
      .single();

    if (profileData) {
      setProfile(profileData);
      setTemplate(profileData.briefing_templates);
    } else {
      // Buscar template ativo padrão
      const { data: templateData } = await (supabase as any)
        .from('briefing_templates')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (templateData) {
        setTemplate(templateData);
        setShowForm(true);
      }
    }

    setLoading(false);
  }

  const handleProfileGenerated = (newProfile: any) => {
    setProfile({ ai_generated_profile: newProfile });
    setShowForm(false);
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
                <h1 className="text-3xl font-bold">Briefing Inteligente</h1>
                <p className="text-muted-foreground">
                  {profile ? "Seu perfil de IA" : "Crie seu perfil com Inteligência Artificial"}
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
              onProfileGenerated={handleProfileGenerated}
            />
          ) : profile ? (
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
          ) : (
            <Card className="glass">
              <CardContent className="text-center py-12">
                <Sparkles className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum perfil encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  Crie um briefing para gerar seu perfil de IA
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
