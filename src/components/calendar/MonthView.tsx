import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ContentPill } from "./ContentPill";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import { Lightbulb } from 'lucide-react';


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
  onContentReschedule: (contentId: string, newDate: Date) => Promise<void>;
  onViewDayIdeas: (date: Date) => void;
}

const MAX_VISIBLE_CONTENTS = 3;

export function MonthView({ 
  currentMonth, 
  contents, 
  clientColors, 
  onContentClick, 
  onDayClick,
  onContentReschedule,
  onViewDayIdeas
}: MonthViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeContent, setActiveContent] = useState<Content | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const content = contents.find(c => c.id === active.id);
    setActiveId(active.id as string);
    setActiveContent(content || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      setActiveContent(null);
      return;
    }

    const newDate = new Date(over.id as string);
    const contentId = active.id as string;
    
    if (contentId && newDate) {
      await onContentReschedule(contentId, newDate);
    }
    
    setActiveId(null);
    setActiveContent(null);
  };
  
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[]}
    >
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
        <div className="flex-1 grid grid-cols-7 auto-rows-fr gap-px bg-border overflow-hidden">
          {days.map((day) => {
            const dayContents = getContentsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isDayToday = isToday(day);
            
            return (
            <DayCell
              key={day.toISOString()}
              day={day}
              dayContents={dayContents}
              isCurrentMonth={isCurrentMonth}
              isDayToday={isDayToday}
              clientColors={clientColors}
              onContentClick={onContentClick}
              onDayClick={onDayClick}
              onViewDayIdeas={onViewDayIdeas}
              activeId={activeId}
            />
            );
          })}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeContent && (
          <div
            className="text-xs px-2 py-1 rounded shadow-lg"
            style={{ 
              backgroundColor: clientColors[activeContent.client_id] || '#6B7280',
              color: 'white',
              textShadow: '0 1px 2px rgba(0,0,0,0.2)',
              cursor: 'grabbing'
            }}
          >
            <span className="font-medium">{format(new Date(activeContent.date), 'HH:mm')}</span>
            {' '}
            {activeContent.title}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function DayCell({ 
  day, 
  dayContents, 
  isCurrentMonth, 
  isDayToday, 
  clientColors, 
  onContentClick, 
  onDayClick,
  onViewDayIdeas,
  activeId 
}: {
  day: Date;
  dayContents: Content[];
  isCurrentMonth: boolean;
  isDayToday: boolean;
  clientColors: Record<string, string>;
  onContentClick: (id: string) => void;
  onDayClick: (date: Date) => void;
  onViewDayIdeas: (date: Date) => void;
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: day.toISOString(),
  });

  const visibleContents = dayContents.slice(0, MAX_VISIBLE_CONTENTS);
  const hiddenCount = dayContents.length - MAX_VISIBLE_CONTENTS;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-background p-1.5 flex flex-col cursor-pointer hover:bg-accent/5 transition-colors overflow-hidden relative group",
        !isCurrentMonth && "bg-muted/30",
        isOver && "ring-2 ring-primary ring-inset bg-primary/5"
      )}
      onClick={() => onDayClick(day)}
    >
      {/* Número do dia e botão de ideias */}
      <div className="flex items-center justify-between mb-1">
        <span className={cn(
          "text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full",
          isDayToday && "bg-primary text-primary-foreground",
          !isCurrentMonth && "text-muted-foreground"
        )}>
          {format(day, 'd')}
        </span>
        
        {/* Botão "Aconteceu Neste Dia" - aparece ao hover */}
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded"
          onClick={(e) => {
            e.stopPropagation();
            onViewDayIdeas(day);
          }}
          title="Ver ideias do dia"
        >
          <Lightbulb className="h-3.5 w-3.5 text-primary" />
        </button>
      </div>
      
      {/* Lista de conteúdos com scroll */}
      <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {visibleContents.map(content => (
          <ContentPill
            key={content.id}
            content={content}
            clientColor={clientColors[content.client_id] || '#6B7280'}
            onClick={onContentClick}
            isDragging={activeId === content.id}
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
}
