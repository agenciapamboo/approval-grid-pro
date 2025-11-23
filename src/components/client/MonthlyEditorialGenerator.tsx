import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, TrendingUp, Calendar, Target, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, addWeeks, addDays, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MonthlyEditorialGeneratorProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EditorialLine {
  content_pillars: string[];
  weekly_themes: Array<{
    week: number;
    theme: string;
    description: string;
  }>;
  post_frequency: string;
  recommended_times: string[];
  content_mix: {
    educational: number;
    promotional: number;
    entertainment: number;
    user_generated: number;
  };
}

export function MonthlyEditorialGenerator({ clientId, open, onOpenChange }: MonthlyEditorialGeneratorProps) {
  const { toast } = useToast();
  const [period, setPeriod] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [editorialLine, setEditorialLine] = useState<EditorialLine | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const getPeriodDates = (selectedPeriod: string) => {
    const now = new Date();
    switch (selectedPeriod) {
      case "next_week":
        return {
          start: addWeeks(now, 1),
          end: addDays(addWeeks(now, 1), 6),
          name: "Próxima Semana"
        };
      case "next_fortnight":
        return {
          start: addWeeks(now, 1),
          end: addDays(addWeeks(now, 1), 13),
          name: "Próxima Quinzena"
        };
      case "current_month":
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
          name: "Mês Atual"
        };
      case "next_month":
        const nextMonth = addMonths(now, 1);
        return {
          start: startOfMonth(nextMonth),
          end: endOfMonth(nextMonth),
          name: "Próximo Mês"
        };
      default:
        return null;
    }
  };

  const handleGenerate = async () => {
    if (!period) {
      toast({
        title: "Selecione um período",
        description: "Escolha o período para gerar a linha editorial",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('generate-monthly-editorial', {
        body: { clientId, period }
      });

      if (error) throw error;

      if (data.limitReached) {
        toast({
          title: "Limite de IA atingido",
          description: "Você atingiu o limite mensal de usos de IA. Considere fazer upgrade do plano.",
          variant: "destructive"
        });
        return;
      }

      setEditorialLine(data.editorialLine);
      setFromCache(data.fromCache || false);

      toast({
        title: data.fromCache ? "Linha Editorial (cache)" : "Linha Editorial Gerada",
        description: data.fromCache 
          ? "Resultado obtido do cache - não contabilizado"
          : "Linha editorial criada com sucesso",
      });
    } catch (error) {
      console.error('Erro ao gerar linha editorial:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar a linha editorial",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const periodDates = period ? getPeriodDates(period) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle>Linha Editorial Mensal</DialogTitle>
              <DialogDescription>
                Gere uma estratégia de conteúdo personalizada com IA
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seletor de Período */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Período</label>
            <Select value={period} onValueChange={setPeriod} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="next_week">Próxima Semana</SelectItem>
                <SelectItem value="next_fortnight">Próxima Quinzena</SelectItem>
                <SelectItem value="current_month">Mês Atual</SelectItem>
                <SelectItem value="next_month">Próximo Mês</SelectItem>
              </SelectContent>
            </Select>
            {periodDates && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(periodDates.start, "dd/MM/yyyy", { locale: ptBR })} até{" "}
                {format(periodDates.end, "dd/MM/yyyy", { locale: ptBR })}
              </p>
            )}
          </div>

          {/* Botão Gerar */}
          {!editorialLine && (
            <Button onClick={handleGenerate} disabled={!period || loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Gerar Linha Editorial
                </>
              )}
            </Button>
          )}

          {/* Resultado */}
          {editorialLine && (
            <div className="space-y-4">
              {fromCache && (
                <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                  Cache • Não contabilizado
                </Badge>
              )}

              {/* Pilares de Conteúdo */}
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Target className="h-4 w-4 text-primary" />
                    Pilares de Conteúdo
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editorialLine.content_pillars.map((pillar, i) => (
                      <Badge key={i} variant="outline">{pillar}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Temas Semanais */}
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4 text-primary" />
                    Temas Semanais
                  </div>
                  {editorialLine.weekly_themes.map((theme) => (
                    <div key={theme.week} className="border-l-2 border-primary/20 pl-3 py-2">
                      <p className="font-medium text-sm">Semana {theme.week}: {theme.theme}</p>
                      <p className="text-xs text-muted-foreground">{theme.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Frequência e Horários */}
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4 text-primary" />
                    Frequência e Horários
                  </div>
                  <p className="text-sm">
                    <span className="font-medium">Frequência:</span> {editorialLine.post_frequency}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm font-medium">Horários recomendados:</span>
                    {editorialLine.recommended_times.map((time, i) => (
                      <Badge key={i} variant="outline">{time}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Mix de Conteúdo */}
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="text-sm font-medium">Mix de Conteúdo</div>
                  <div className="space-y-2">
                    {Object.entries(editorialLine.content_mix).map(([type, percentage]) => (
                      <div key={type} className="flex items-center gap-2">
                        <div className="w-32 text-sm capitalize">{type.replace('_', ' ')}</div>
                        <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="w-12 text-sm text-right">{percentage}%</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Botão Nova Geração */}
              <Button 
                onClick={() => {
                  setEditorialLine(null);
                  setPeriod("");
                }} 
                variant="outline" 
                className="w-full"
              >
                Gerar Novo Período
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
