import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, RefreshCw, Users, Target, MessageSquare, Hash, Clock4 } from "lucide-react";

interface ClientProfileCardProps {
  profile: {
    profile_summary?: string;
    target_persona?: any;
    content_pillars?: string[];
    tone_of_voice?: string[];
    keywords?: string[];
    editorial_line?: string;
    post_frequency?: string;
    best_posting_times?: string[];
    content_mix?: Record<string, number>;
  };
  creativesCount: number;
  monthlyLimit?: number;
  clientName?: string;
  onRefreshBriefing?: () => void;
  onEnrichEditorial?: () => void;
  onGenerateEditorialBase?: () => void;
  generatingEditorialBase?: boolean;
}

export function ClientProfileCard({
  profile,
  creativesCount,
  monthlyLimit,
  clientName,
  onRefreshBriefing,
  onEnrichEditorial,
  onGenerateEditorialBase,
  generatingEditorialBase,
}: ClientProfileCardProps) {
  const creativeProgress = monthlyLimit
    ? Math.min(100, Math.round((creativesCount / monthlyLimit) * 100))
    : null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Perfil do Cliente */}
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Perfil do Cliente
          </CardTitle>
          <CardDescription>
            {clientName ? `Dados estratégicos de ${clientName}` : "Informações estratégicas geradas por IA"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {profile.profile_summary && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Resumo</h4>
              <p className="text-sm text-muted-foreground">{profile.profile_summary}</p>
            </div>
          )}

          {profile.content_pillars && profile.content_pillars.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Pilares de Conteúdo
              </h4>
              <div className="flex flex-wrap gap-2">
                {profile.content_pillars.map((pillar, i) => (
                  <Badge key={i} variant="outline">{pillar}</Badge>
                ))}
              </div>
            </div>
          )}

          {profile.tone_of_voice && profile.tone_of_voice.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Tom de Voz
              </h4>
              <div className="flex flex-wrap gap-2">
                {profile.tone_of_voice.map((tone, i) => (
                  <Badge key={i} variant="outline">{tone}</Badge>
                ))}
              </div>
            </div>
          )}

          {profile.keywords && profile.keywords.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Palavras-chave
              </h4>
              <div className="flex flex-wrap gap-2">
                {profile.keywords.slice(0, 10).map((keyword, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{keyword}</Badge>
                ))}
              </div>
            </div>
          )}

          {onRefreshBriefing && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefreshBriefing}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refazer Briefing
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Linha Editorial */}
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-500" />
            Linha Editorial
          </CardTitle>
          <CardDescription>
            Estratégia de conteúdo e publicações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {profile.editorial_line && (
            <div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {profile.editorial_line}
              </p>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold mb-1">Frequência</h4>
            {monthlyLimit ? (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {Math.ceil(monthlyLimit / 4)} vezes por semana
                </p>
                <p className="text-xs text-muted-foreground">
                  {monthlyLimit} criativos por mês
                </p>
              </div>
            ) : profile.post_frequency ? (
              <p className="text-sm text-muted-foreground">{profile.post_frequency}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Não configurado</p>
            )}
          </div>

          {profile.best_posting_times && profile.best_posting_times.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-1 flex items-center gap-2">
                <Clock4 className="h-4 w-4" />
                Melhores Horários
              </h4>
              <div className="flex flex-wrap gap-2">
                {profile.best_posting_times.map((time, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{time}</Badge>
                ))}
              </div>
            </div>
          )}

          {profile.content_mix && Object.keys(profile.content_mix).length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-1">Mix de Conteúdo</h4>
              <div className="space-y-2">
                {Object.entries(profile.content_mix).map(([type, percentage]) => (
                  <div key={type} className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wide w-24">{type}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-10 text-right">{percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t">
            {monthlyLimit && creativeProgress !== null ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Criativos no mês</span>
                  <span className="font-semibold text-foreground">
                    {creativesCount}/{monthlyLimit}
                  </span>
                </div>
                <Progress value={creativeProgress} className="h-2" />
              </div>
            ) : (
              <span className="text-sm">
                Criativos cadastrados: <span className="text-primary font-semibold">{creativesCount}</span>
              </span>
            )}
          </div>

          {onGenerateEditorialBase && (
            <Button
              onClick={onGenerateEditorialBase}
              disabled={generatingEditorialBase}
              className="w-full bg-primary/90 hover:bg-primary"
              size="sm"
            >
              {generatingEditorialBase ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                  Gerando base...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Linha Editorial Base
                </>
              )}
            </Button>
          )}

          {onEnrichEditorial && (
            <Button
              onClick={onEnrichEditorial}
              className="w-full bg-green-500 hover:bg-green-600"
              size="sm"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Enriquecer Linha Editorial
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
