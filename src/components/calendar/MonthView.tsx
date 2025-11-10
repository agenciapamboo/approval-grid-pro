import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday } from "date-fns";
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

interface MonthViewProps {
  currentMonth: Date;
  contents: Content[];
  clientColors: Record<string, string>;
  onContentClick: (contentId: string) => void;
  onDayClick: (date: Date) => void;
}

const MAX_VISIBLE_CONTENTS = 3;

export function MonthView({ 
  currentMonth, 
  contents, 
  clientColors, 
  onContentClick,
  onDayClick 
}: MonthViewProps) {
  
  const generateMonthDays = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const startDay = startOfWeek(start, { locale: ptBR });
    const endDay = endOfWeek(end, { locale: ptBR });
    
    const days: Date[] = [];
    let day = startDay;
    
    while (day <= endDay) {
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

  const days = generateMonthDays();
  const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

  return (
    <div className="flex flex-col h-full">
      {/* Header com dias da semana */}
      <div className="grid grid-cols-7 border-b border-border">
        {weekDays.map(day => (
          <div key={day} className="p-2 text-center font-medium text-sm text-muted-foreground">
            {day}
          </div>
        ))}
      </div>
      
      {/* Grid dos dias */}
      <div className="flex-1 grid grid-cols-7 gap-px bg-border">
        {days.map((day) => {
          const dayContents = getContentsForDay(day);
          const visibleContents = dayContents.slice(0, MAX_VISIBLE_CONTENTS);
          const hiddenCount = dayContents.length - MAX_VISIBLE_CONTENTS;
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isDayToday = isToday(day);
          
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "bg-background min-h-[120px] max-h-[150px] p-1.5 flex flex-col cursor-pointer hover:bg-accent/5 transition-colors",
                !isCurrentMonth && "bg-muted/30"
              )}
              onClick={() => onDayClick(day)}
            >
              {/* Número do dia */}
              <div className="flex items-center justify-center mb-1">
                <span className={cn(
                  "text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                  isDayToday && "bg-primary text-primary-foreground",
                  !isCurrentMonth && "text-muted-foreground"
                )}>
                  {format(day, 'd')}
                </span>
              </div>
              
              {/* Lista de conteúdos com scroll */}
              <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
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
                <div className="flex items-center justify-center gap-1 text-xs text-primary hover:underline mt-1 py-1">
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
