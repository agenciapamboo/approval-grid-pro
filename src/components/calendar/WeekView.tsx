import { format, startOfWeek, endOfWeek, addDays, isSameDay, isToday } from "date-fns";
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

interface WeekViewProps {
  currentWeek: Date;
  contents: Content[];
  clientColors: Record<string, string>;
  onContentClick: (contentId: string) => void;
  onDayClick: (date: Date) => void;
  onContentReschedule: (contentId: string, newDate: Date) => Promise<void>;
  onViewDayIdeas: (date: Date) => void;
  hasEventsForDate: (date: Date) => boolean;
}

const MAX_VISIBLE_CONTENTS = 8;

export function WeekView({ 
  currentWeek, 
  contents, 
  clientColors, 
  onContentClick, 
  onDayClick,
  onContentReschedule,
  onViewDayIdeas,
  hasEventsForDate
}: WeekViewProps) {
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[]}
    >
      <div className="grid grid-cols-7 gap-px bg-border h-full">
        {days.map((day) => {
          const dayContents = getContentsForDay(day);
          const isDayToday = isToday(day);
          
          return (
            <WeekDayCell
              key={day.toISOString()}
              day={day}
              dayContents={dayContents}
              isDayToday={isDayToday}
              clientColors={clientColors}
              onContentClick={onContentClick}
              onDayClick={onDayClick}
              onViewDayIdeas={onViewDayIdeas}
              hasEventsForDate={hasEventsForDate}
              activeId={activeId}
            />
          );
        })}
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

function WeekDayCell({ 
  day, 
  dayContents, 
  isDayToday, 
  clientColors, 
  onContentClick, 
  onDayClick,
  onViewDayIdeas,
  hasEventsForDate,
  activeId 
}: {
  day: Date;
  dayContents: Content[];
  isDayToday: boolean;
  clientColors: Record<string, string>;
  onContentClick: (id: string) => void;
  onDayClick: (date: Date) => void;
  onViewDayIdeas: (date: Date) => void;
  hasEventsForDate: (date: Date) => boolean;
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: day.toISOString(),
  });

  const dayHasEvents = hasEventsForDate(day);
  const visibleContents = dayContents.slice(0, MAX_VISIBLE_CONTENTS);
  const hiddenCount = dayContents.length - MAX_VISIBLE_CONTENTS;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-background p-2 flex flex-col cursor-pointer hover:bg-accent/5 transition-colors min-h-[400px] relative group",
        isDayToday && "bg-accent/10",
        isOver && "ring-2 ring-primary ring-inset bg-primary/5"
      )}
      onClick={() => onDayClick(day)}
      title="Clique para criar conteúdo"
    >
      {/* Cabeçalho do dia e botão de ideias */}
      <div className="flex flex-col items-center mb-3 pb-2 border-b border-border">
        <div className="w-full flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-muted-foreground uppercase">
            <span className="hidden lg:inline">{format(day, 'EEEE', { locale: ptBR })}</span>
            <span className="hidden md:inline lg:hidden">{format(day, 'EEE', { locale: ptBR })}</span>
            <span className="md:hidden">{format(day, 'EEEEE', { locale: ptBR })}</span>
          </span>
          
          {/* Botão "Dicas de Conteúdo" - só aparece se houver eventos */}
          {dayHasEvents && (
            <button
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded"
              onClick={(e) => {
                e.stopPropagation();
                onViewDayIdeas(day);
              }}
              title="Dicas de conteúdo"
            >
              <Lightbulb className="h-3.5 w-3.5 text-primary" />
            </button>
          )}
        </div>
        <span className={cn(
          "text-2xl font-bold",
          isDayToday && "text-primary"
        )}>
          {format(day, 'd')}
        </span>
      </div>
      
      {/* Lista de conteúdos */}
      <div className="flex-1 overflow-y-auto space-y-2">
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
        <div className="flex items-center justify-center gap-1 text-xs text-primary hover:underline mt-2 py-1">
          <span>+{hiddenCount} mais</span>
          <ChevronDown className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}
