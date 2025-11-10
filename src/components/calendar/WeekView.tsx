import { format, startOfWeek, endOfWeek, addDays, isSameDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ContentPill } from "./ContentPill";
import { ChevronDown } from "lucide-react";
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

interface WeekViewProps {
  currentWeek: Date;
  contents: Content[];
  clientColors: Record<string, string>;
  onContentClick: (contentId: string) => void;
  onDayClick: (date: Date) => void;
}

const MAX_VISIBLE_CONTENTS = 8;

export function WeekView({ 
  currentWeek, 
  contents, 
  clientColors, 
  onContentClick,
  onDayClick 
}: WeekViewProps) {
  
  const generateWeekDays = () => {
    const start = startOfWeek(currentWeek, { locale: ptBR });
    const end = endOfWeek(currentWeek, { locale: ptBR });
    
    const days: Date[] = [];
    let day = start;
    
    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }
    
    return days;
  };

  const getContentsForDay = (dayDate: Date) => {
    return contents.filter(content => 
      isSameDay(new Date(content.date), dayDate)
    ).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  const days = generateWeekDays();
  const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  return (
    <div className="flex flex-col h-full">
      {/* Grid da semana */}
      <div className="flex-1 grid grid-cols-7 gap-px bg-border">
        {days.map((day, index) => {
          const dayContents = getContentsForDay(day);
          const visibleContents = dayContents.slice(0, MAX_VISIBLE_CONTENTS);
          const hiddenCount = dayContents.length - MAX_VISIBLE_CONTENTS;
          const isDayToday = isToday(day);
          
          return (
            <div
              key={day.toISOString()}
              className="bg-background p-2 flex flex-col cursor-pointer hover:bg-accent/5 transition-colors min-h-[400px]"
              onClick={() => onDayClick(day)}
            >
              {/* Header do dia */}
              <div className="mb-3 text-center pb-2 border-b border-border">
                <div className="text-xs text-muted-foreground font-medium">
                  {weekDays[index]}
                </div>
                <div className={cn(
                  "text-2xl font-bold mt-1",
                  isDayToday && "text-primary"
                )}>
                  {format(day, 'd')}
                </div>
              </div>
              
              {/* Lista de conteúdos com scroll */}
              <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                {visibleContents.map(content => (
                  <ContentPill
                    key={content.id}
                    content={content}
                    clientColor={clientColors[content.client_id] || '#6B7280'}
                    onClick={onContentClick}
                  />
                ))}
              </div>
              
              {/* Indicador de mais conteúdos */}
              {hiddenCount > 0 && (
                <div className="flex items-center justify-center gap-1 text-xs text-primary hover:underline mt-2 py-1">
                  <span>+{hiddenCount} mais</span>
                  <ChevronDown className="h-3 w-3" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
