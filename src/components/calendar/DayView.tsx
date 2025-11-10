import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface Content {
  id: string;
  title: string;
  date: string;
  status: string;
  type: string;
  client_id: string;
  clients?: { name: string };
}

interface DayViewProps {
  currentDay: Date;
  contents: Content[];
  clientColors: Record<string, string>;
  onContentClick: (contentId: string) => void;
  onViewDayIdeas: (date: Date) => void;
  hasEventsForDate: (date: Date) => boolean;
}

export function DayView({ 
  currentDay, 
  contents, 
  clientColors, 
  onContentClick,
  onViewDayIdeas,
  hasEventsForDate
}: DayViewProps) {
  
  const dayHasEvents = hasEventsForDate(currentDay);
  
  const getContentsForDay = () => {
    return contents.filter(content => 
      isSameDay(new Date(content.date), currentDay)
    ).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  const dayContents = getContentsForDay();

  // Gerar horários (00:00 até 23:00)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getContentsForHour = (hour: number) => {
    return dayContents.filter(content => {
      const contentHour = new Date(content.date).getHours();
      return contentHour === hour;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">
              {format(currentDay, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {dayContents.length} {dayContents.length === 1 ? 'conteúdo agendado' : 'conteúdos agendados'}
            </p>
          </div>
          
          {/* Botão "Dicas de Conteúdo" - só aparece se houver eventos */}
          {dayHasEvents && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDayIdeas(currentDay)}
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              💡 Dicas de Conteúdo
            </Button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        {hours.map(hour => {
          const hourContents = getContentsForHour(hour);
          
          return (
            <div key={hour} className="flex border-b border-border min-h-[80px]">
              {/* Horário */}
              <div className="w-20 p-2 text-sm text-muted-foreground font-medium flex-shrink-0">
                {String(hour).padStart(2, '0')}:00
              </div>
              
              {/* Conteúdos */}
              <div className="flex-1 p-2 space-y-2">
                {hourContents.map(content => (
                  <Card
                    key={content.id}
                    className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onContentClick(content.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-1 h-full rounded-full flex-shrink-0"
                        style={{ backgroundColor: clientColors[content.client_id] || '#6B7280' }}
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-medium">{content.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(content.date), "HH:mm")}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {content.type === 'feed' ? 'Feed' : 
                             content.type === 'story' ? 'Story' : 
                             content.type === 'reel' ? 'Reel' : 
                             content.type}
                          </Badge>
                        </div>
                        
                        {content.clients && (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full shadow-sm" 
                              style={{ backgroundColor: clientColors[content.client_id] }}
                            />
                            <p className="text-sm text-muted-foreground">
                              {content.clients.name}
                            </p>
                          </div>
                        )}
                        
                        <Badge variant={
                          content.status === 'approved' ? 'success' : 
                          content.status === 'in_review' ? 'warning' :
                          content.status === 'changes_requested' ? 'destructive' :
                          'outline'
                        }>
                          {content.status === 'approved' ? 'Aprovado' : 
                           content.status === 'in_review' ? 'Em Revisão' :
                           content.status === 'changes_requested' ? 'Ajustes Solicitados' :
                           'Rascunho'}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
