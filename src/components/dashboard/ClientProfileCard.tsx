import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Users, Target, MessageSquare, Hash } from "lucide-react";

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
  };
  creativesCount: number;
  onRefreshBriefing?: () => void;
  onEnrichEditorial?: () => void;
}

export function ClientProfileCard({
  profile,
  creativesCount,
  onRefreshBriefing,
  onEnrichEditorial,
}: ClientProfileCardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Perfil do Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Perfil do Cliente
          </CardTitle>
          <CardDescription>
            Informações estratégicas geradas por IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-500" />
            Linha Editorial
          </CardTitle>
          <CardDescription>
            Estratégia de conteúdo e publicações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.editorial_line && (
            <div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {profile.editorial_line.slice(0, 300)}...
              </p>
            </div>
          )}

          {profile.post_frequency && (
            <div>
              <h4 className="text-sm font-semibold mb-1">Frequência</h4>
              <p className="text-sm text-muted-foreground">{profile.post_frequency}</p>
            </div>
          )}

          {profile.best_posting_times && profile.best_posting_times.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-1">Melhores Horários</h4>
              <div className="flex flex-wrap gap-2">
                {profile.best_posting_times.map((time, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{time}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 border-t">
            <p className="text-sm font-semibold">
              Criativos Cadastrados: <span className="text-primary">{creativesCount}</span>
            </p>
          </div>

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
