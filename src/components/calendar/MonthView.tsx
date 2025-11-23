import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ContentPill } from "./ContentPill";
import { cn } from "@/lib/utils";
import { useState, useRef, useLayoutEffect } from "react";
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
  hasEventsForDate: (date: Date) => boolean;
  onViewAllContents: (date: Date) => void;
}

export function MonthView({ 
  currentMonth, 
  contents, 
  clientColors, 
  onContentClick, 
  onDayClick,
  onContentReschedule,
  onViewDayIdeas,
  hasEventsForDate,
  onViewAllContents
}: MonthViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeContent, setActiveContent] = useState<Content | null>(null);
  const [rowHeightPx, setRowHeightPx] = useState(120);
  const [contentPillHeight, setContentPillHeight] = useState(32); // Altura estimada de cada ContentPill em px
  
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const dayCellRef = useRef<HTMLDivElement>(null);

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
  
  // Calcular número de semanas
  const weeks = Math.ceil(days.length / 7);

  // Calcular altura dinâmica baseada na proporção 4:5 (altura > largura, formato vertical)
  useLayoutEffect(() => {
    const calculateRowHeight = () => {
      if (!containerRef.current || !headerRef.current) return;
      
      // Aguardar o próximo frame para garantir que o grid foi renderizado
      requestAnimationFrame(() => {
        if (!containerRef.current || !headerRef.current) return;
        
        // Calcular largura disponível para cada dia (grid de 7 colunas, menos gaps)
        const containerWidth = containerRef.current.clientWidth;
        const gapSize = 1; // gap-px = 1px entre células
        const totalColumnGaps = 6 * gapSize; // 6 gaps entre 7 colunas
        const dayWidth = (containerWidth - totalColumnGaps) / 7;
        
        // Calcular altura baseada na proporção 4:5 (altura:largura)
        // Proporção 4:5 significa: largura:altura = 4:5
        // Portanto: altura = largura * (5/4) = largura * 1.25
        // Isso garante formato vertical (altura maior que largura)
        let proportionalHeight = dayWidth * 1.25;
        
        // Verificar espaço vertical disponível para limitar se necessário
        const containerHeight = containerRef.current.clientHeight;
        const headerHeight = headerRef.current.clientHeight;
        const rowGapPixels = Math.max(weeks - 1, 0) * gapSize; // gap entre linhas
        const availableHeight = containerHeight - headerHeight - rowGapPixels;
        const maxHeightPerWeek = availableHeight / weeks;
        
        // Usar a menor entre altura proporcional e altura disponível
        let calculatedHeight = Math.min(proportionalHeight, maxHeightPerWeek);
        
        // GARANTIR formato vertical: altura sempre maior que largura
        // Se a altura calculada for menor ou igual à largura, forçar formato vertical
        if (calculatedHeight <= dayWidth) {
          // Usar porcentagem maior que largura para manter formato vertical
          calculatedHeight = dayWidth * 1.15; // 15% maior que largura (formato vertical)
        }
        
        // Garantir altura mínima, mas sempre maior que a largura
        const minHeight = Math.max(120, dayWidth * 1.1); // Mínimo: 10% maior que largura
        let finalHeight = Math.max(minHeight, calculatedHeight);
        
        // Última verificação crítica: garantir que altura seja SEMPRE maior que largura
        if (finalHeight <= dayWidth) {
          finalHeight = dayWidth * 1.2; // Forçar 20% maior que largura se ainda estiver igual ou menor
        }
        
        setRowHeightPx(finalHeight);
      });
    };

    const resizeObserver = new ResizeObserver(calculateRowHeight);
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    // Calcular imediatamente e também após um pequeno delay para garantir que o DOM está pronto
    calculateRowHeight();
    const timeoutId = setTimeout(calculateRowHeight, 100);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [weeks]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[]}
    >
      <div ref={containerRef} className="flex flex-col h-full">
        {/* Header com dias da semana - responsivo */}
        <div ref={headerRef} className="grid grid-cols-7 border-b border-border">
          {[
            { full: "Domingo", short: "Dom", initial: "D" },
            { full: "Segunda", short: "Seg", initial: "S" },
            { full: "Terça", short: "Ter", initial: "T" },
            { full: "Quarta", short: "Qua", initial: "Q" },
            { full: "Quinta", short: "Qui", initial: "Q" },
            { full: "Sexta", short: "Sex", initial: "S" },
            { full: "Sábado", short: "Sáb", initial: "S" }
          ].map(day => (
            <div key={day.full} className="p-2 text-center font-medium text-sm text-muted-foreground">
              <span className="hidden lg:inline">{day.full}</span>
              <span className="hidden md:inline lg:hidden">{day.short}</span>
              <span className="md:hidden">{day.initial}</span>
            </div>
          ))}
        </div>
        
        {/* Grid dos dias - Proporção 4:5 (altura > largura, formato vertical) */}
        <div 
          className="flex-1 grid grid-cols-7 gap-px bg-border" 
          style={{ 
            gridTemplateRows: `repeat(${weeks}, ${rowHeightPx}px)`,
            gridAutoRows: `${rowHeightPx}px`,
            minHeight: `${rowHeightPx * weeks}px`
          }}
        >
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
              hasEventsForDate={hasEventsForDate}
              onViewAllContents={onViewAllContents}
              activeId={activeId}
              dayHeight={rowHeightPx}
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
  hasEventsForDate,
  onViewAllContents,
  activeId,
  dayHeight
}: {
  day: Date;
  dayContents: Content[];
  isCurrentMonth: boolean;
  isDayToday: boolean;
  clientColors: Record<string, string>;
  onContentClick: (id: string) => void;
  onDayClick: (date: Date) => void;
  onViewDayIdeas: (date: Date) => void;
  hasEventsForDate: (date: Date) => boolean;
  onViewAllContents: (date: Date) => void;
  activeId: string | null;
  dayHeight: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: day.toISOString(),
  });

  const dayCellRef = useRef<HTMLDivElement>(null);

  const dayHasEvents = hasEventsForDate(day);

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        dayCellRef.current = node;
      }}
      className={cn(
        "bg-background p-3 flex flex-col cursor-pointer hover:bg-accent/5 transition-colors relative group",
        !isCurrentMonth && "bg-muted/30",
        isOver && "ring-2 ring-primary ring-inset bg-primary/5"
      )}
      style={{
        height: `${dayHeight}px`,
        minHeight: `${dayHeight}px`,
        maxHeight: `${dayHeight}px`
      }}
      onClick={() => onDayClick(day)}
      title="Clique para criar conteúdo"
    >
      {/* Número do dia e botão de ideias */}
      <div className="day-number-container flex items-center justify-between mb-1 flex-shrink-0">
        <span className={cn(
          "text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full",
          isDayToday && "bg-primary text-primary-foreground",
          !isCurrentMonth && "text-muted-foreground"
        )}>
          {format(day, 'd')}
        </span>
        
        {/* Botão "Dicas de Conteúdo" - sempre visível quando houver eventos */}
        {dayHasEvents && (
          <button
            className="p-1 hover:bg-accent rounded transition-all hover:scale-110"
            onClick={(e) => {
              e.stopPropagation();
              onViewDayIdeas(day);
            }}
            title="Dicas de conteúdo"
          >
            <Lightbulb className="h-3.5 w-3.5 text-primary animate-pulse" />
          </button>
        )}
      </div>
      
      {/* Lista de conteúdos com scroll vertical - mostra TODOS os conteúdos */}
      <div 
        className="flex-1 flex flex-col gap-1.5 overflow-y-auto min-h-0"
        style={{
          // Altura disponível = altura total do dia - header (número + botão + padding)
          // Header tem aproximadamente 32px (número do dia) + 12px top + 12px bottom + gap = ~56px
          maxHeight: `${dayHeight - 56}px`
        }}
      >
        {dayContents.map((content) => (
          <div
            key={content.id}
            data-content-pill
            className="flex-shrink-0"
          >
            <ContentPill
              content={content}
              clientColor={clientColors[content.client_id] || '#6B7280'}
              onClick={onContentClick}
              isDragging={activeId === content.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
