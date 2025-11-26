import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { CreateContentWrapper } from "@/components/content/CreateContentWrapper";
import { ContentDetailsDialog } from "@/components/content/ContentDetailsDialog";
import { RequestDetailsDialog } from "@/components/calendar/RequestDetailsDialog";
import { HistoricalEventsDialog } from "@/components/calendar/HistoricalEventsDialog";
import { DayContentsDialog } from "@/components/calendar/DayContentsDialog";
import { CreateContentClientSelector } from "@/components/calendar/CreateContentClientSelector";
import type { HistoricalEvent } from "@/hooks/useHistoricalEvents";
import { loadEventsCache, hasEventsForDate } from "@/hooks/useHistoricalEvents";
import { useClientLocations } from "@/hooks/useClientLocations";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { DayView } from "./DayView";
import { useToast } from "@/hooks/use-toast";

interface Content {
  id: string;
  title: string;
  date: string;
  status: string;
  type: string;
  client_id: string;
  clients?: {
    name: string;
  };
  itemType?: 'content' | 'creative_request' | 'adjustment_request';
  requestType?: string;
  reason?: string;
}

interface AgencyCalendarProps {
  agencyId: string;
  clientId?: string | null;
  onClientSelectionChange?: (clientId: string | null) => void;
}

const CLIENT_COLOR_PALETTE = [
  '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899',
  '#EF4444', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

export function AgencyCalendar({ agencyId, clientId = null, onClientSelectionChange }: AgencyCalendarProps) {
  const { toast } = useToast();
  const [contents, setContents] = useState<Content[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(clientId);
  const [clientColors, setClientColors] = useState<Record<string, string>>({});
  const [showCreateContent, setShowCreateContent] = useState(false);
  const [selectedDateForCreation, setSelectedDateForCreation] = useState<Date | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showHistoricalEvents, setShowHistoricalEvents] = useState(false);
  const [selectedDateForIdeas, setSelectedDateForIdeas] = useState<Date | null>(null);
  const [selectedEventTitle, setSelectedEventTitle] = useState<string>("");
  const [eventsCacheLoaded, setEventsCacheLoaded] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Content | null>(null);
  const [showRequestDetails, setShowRequestDetails] = useState(false);
  const [showDayContents, setShowDayContents] = useState(false);
  const [selectedDayForView, setSelectedDayForView] = useState<Date | null>(null);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [creationClientId, setCreationClientId] = useState<string | null>(null);

  // Hook de localizações dos clientes
  const { cities, states, regions, loading: locationsLoading } = useClientLocations(agencyId);

  useEffect(() => {
    loadClients();
  }, [agencyId]);

  useEffect(() => {
    setSelectedClient(clientId ?? null);
  }, [clientId]);

  useEffect(() => {
    onClientSelectionChange?.(selectedClient);
  }, [selectedClient, onClientSelectionChange]);

  useEffect(() => {
    loadContents();
  }, [agencyId, selectedClient]);

  // Carregar cache de eventos no mount
  useEffect(() => {
    loadEventsCache().then(() => setEventsCacheLoaded(true));
  }, []);

  // Função para verificar se dia tem eventos (com localizações)
  const dayHasEvents = useCallback((date: Date) => {
    if (!eventsCacheLoaded) return false;
    return hasEventsForDate(date, cities, states, regions);
  }, [eventsCacheLoaded, cities, states, regions]);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('agency_id', agencyId)
        .order('name');

      if (error) throw error;
      setClients(data || []);
      
      if (data) {
        const colorMap: Record<string, string> = {};
        data.forEach((client, index) => {
          colorMap[client.id] = CLIENT_COLOR_PALETTE[index % CLIENT_COLOR_PALETTE.length];
        });
        setClientColors(colorMap);
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const loadRequests = async () => {
    try {
      if (!agencyId) {
        console.warn('[loadRequests] agencyId não definido');
        return [];
      }

      const { data: creativeNotifications, error: creativeError } = await supabase
        .from("notifications")
        .select(`
          *,
          clients (
            id,
            name
          )
        `)
        .eq("event", "novojob")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false });

      if (creativeError) throw creativeError;

      const creativeRequests: Content[] = (creativeNotifications || []).map((notif: any) => {
        const requestDate = notif.payload?.deadline 
          ? new Date(notif.payload.deadline).toISOString()
          : notif.created_at;

        return {
          id: notif.id,
          title: notif.payload?.title || 'Nova Solicitação',
          date: requestDate,
          status: notif.payload?.job_status || 'pending',
          type: 'creative_request',
          itemType: 'creative_request',
          client_id: notif.client_id,
          clients: notif.clients ? { name: notif.clients.name } : undefined,
          requestType: notif.payload?.type,
        };
      });

      const { data: clientsList, error: clientsError } = await supabase
        .from("clients")
        .select("id, name")
        .eq("agency_id", agencyId);

      if (clientsError) throw clientsError;

      if (!clientsList || clientsList.length === 0) {
        return creativeRequests;
      }

      const clientIds = clientsList.map((c) => c.id);
      const clientMap = new Map(clientsList.map((c) => [c.id, c]));

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: contentsList } = await supabase
        .from("contents")
        .select("id, title, client_id, date")
        .in("client_id", clientIds)
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (!contentsList || contentsList.length === 0) {
        return creativeRequests;
      }

      const contentIds = contentsList.map((c) => c.id);
      const contentMap = new Map(contentsList.map((c) => [c.id, c]));

      const { data: adjustmentComments, error: adjustmentError } = await supabase
        .from("comments")
        .select("*")
        .in("content_id", contentIds)
        .eq("is_adjustment_request", true)
        .order("created_at", { ascending: false });

      if (adjustmentError) throw adjustmentError;

      const adjustmentRequests: Content[] = (adjustmentComments || []).map((comment: any) => {
        const content = contentMap.get(comment.content_id);
        const client = clientMap.get(content?.client_id);

        const requestDate = content?.date || comment.created_at;

        return {
          id: comment.id,
          title: `Ajuste: ${content?.title || 'Conteúdo'}`,
          date: requestDate,
          status: 'adjustment_pending',
          type: 'adjustment_request',
          itemType: 'adjustment_request',
          client_id: content?.client_id || '',
          clients: client ? { name: client.name } : undefined,
          reason: comment.adjustment_reason || 'Não especificado',
        };
      });

      return [...creativeRequests, ...adjustmentRequests];
    } catch (error) {
      console.error("Erro ao carregar solicitações:", error);
      return [];
    }
  };

  const loadContents = async () => {
    try {
      let query = supabase
        .from('contents')
        .select(`
          id,
          title,
          date,
          status,
          type,
          client_id,
          clients (name)
        `)
        .eq('is_content_plan', false)
        .order('date', { ascending: true });

      if (selectedClient) {
        query = query.eq('client_id', selectedClient);
      } else {
        const { data: clientIds } = await supabase
          .from('clients')
          .select('id')
          .eq('agency_id', agencyId);

        if (clientIds && clientIds.length > 0) {
          query = query.in('client_id', clientIds.map(c => c.id));
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const contentsWithType = (data || []).map(content => ({
        ...content,
        itemType: 'content' as const
      }));

      const requests = await loadRequests();

      const filteredRequests = selectedClient
        ? requests.filter(req => req.client_id === selectedClient)
        : requests;

      const combined = [...contentsWithType, ...filteredRequests];

      combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setContents(combined);
    } catch (error) {
      console.error('Erro ao carregar conteúdos:', error);
      setContents([]);
    }
  };

  const handleDayClick = (date: Date) => {
    setSelectedDateForCreation(date);
    
    if (selectedClient) {
      setCreationClientId(selectedClient);
      setShowCreateContent(true);
    } else if (clients.length === 1) {
      setCreationClientId(clients[0].id);
      setShowCreateContent(true);
    } else if (clients.length > 1) {
      setShowClientSelector(true);
    } else {
      toast({
        title: "Nenhum cliente encontrado",
        description: "Cadastre um cliente antes de criar conteúdos.",
        variant: "destructive"
      });
    }
  };

  const handleContentClick = (contentId: string) => {
    const item = contents.find(c => c.id === contentId);
    
    if (item?.itemType === 'creative_request' || item?.itemType === 'adjustment_request') {
      setSelectedRequest(item);
      setShowRequestDetails(true);
    } else {
      setSelectedContentId(contentId);
      setShowDetailsDialog(true);
    }
  };

  const handleViewAllContents = (date: Date) => {
    setSelectedDayForView(date);
    setShowDayContents(true);
  };

  const handleClientSelected = (clientId: string) => {
    setCreationClientId(clientId);
    setShowClientSelector(false);
    setShowCreateContent(true);
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'month') {
      setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
    } else {
      setCurrentDate(prev => direction === 'next' ? addDays(prev, 1) : subDays(prev, 1));
    }
  };

  const getNavigationTitle = () => {
    if (viewMode === 'month') {
      return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
    } else if (viewMode === 'week') {
      return format(currentDate, "'Semana de' d 'de' MMMM", { locale: ptBR });
    } else {
      return format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
    }
  };

  const handleContentReschedule = async (contentId: string, newDate: Date) => {
    try {
      const content = contents.find(c => c.id === contentId);
      if (!content) return;

      const originalDate = new Date(content.date);
      
      const updatedDate = new Date(newDate);
      updatedDate.setHours(originalDate.getHours());
      updatedDate.setMinutes(originalDate.getMinutes());
      updatedDate.setSeconds(originalDate.getSeconds());

      const { error } = await supabase
        .from('contents')
        .update({ date: updatedDate.toISOString() })
        .eq('id', contentId);

      if (error) throw error;

      toast({
        title: "Conteúdo reagendado",
        description: `Movido para ${format(updatedDate, "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}`,
      });

      await loadContents();
    } catch (error) {
      console.error('Erro ao reagendar conteúdo:', error);
      toast({
        title: "Erro ao reagendar",
        description: "Não foi possível mover o conteúdo. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleViewDayIdeas = (date: Date) => {
    setSelectedDateForIdeas(date);
    setShowHistoricalEvents(true);
  };

  const handleSelectHistoricalEvent = (event: HistoricalEvent) => {
    setSelectedEventTitle(event.title);
    setSelectedDateForCreation(selectedDateForIdeas);
    setShowHistoricalEvents(false);
    setShowCreateContent(true);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8px)] p-2 gap-3">
      {/* Header com controles */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Agenda de Conteúdos</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const today = new Date();
                setSelectedDateForCreation(today);
                
                if (selectedClient) {
                  setCreationClientId(selectedClient);
                  setShowCreateContent(true);
                } else if (clients.length === 1) {
                  setCreationClientId(clients[0].id);
                  setShowCreateContent(true);
                } else if (clients.length > 1) {
                  setShowClientSelector(true);
                } else {
                  toast({
                    title: "Nenhum cliente encontrado",
                    description: "Cadastre um cliente antes de criar conteúdos.",
                    variant: "destructive"
                  });
                }
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Conteúdo
            </Button>
          </div>
        </div>

        {/* Barra de navegação e filtros */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Navegação de período */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleNavigate('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentDate(new Date())}
              >
                Hoje
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleNavigate('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Título do período */}
            <h3 className="text-lg font-semibold capitalize">
              {getNavigationTitle()}
            </h3>
          </div>

          <div className="flex items-center gap-4">
            {/* Filtro de cliente */}
            {!clientId && (
              <Select value={selectedClient || "all"} onValueChange={(value) => setSelectedClient(value === "all" ? null : value)}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Filtrar por cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Seletor de visualização */}
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'month' | 'week' | 'day')}>
              <TabsList>
                <TabsTrigger value="day">Dia</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
                <TabsTrigger value="month">Mês</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Legenda de Cores */}
        {!selectedClient && clients.length > 0 && (
          <div className="flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-md border border-border">
            <span className="text-xs font-medium text-muted-foreground">Clientes:</span>
            <div className="flex flex-wrap gap-2">
              {clients.map((client) => (
                <div 
                  key={client.id} 
                  className="flex items-center gap-1.5"
                >
                  <div 
                    className="w-3 h-3 rounded-full shadow-sm" 
                    style={{ backgroundColor: clientColors[client.id] }}
                  />
                  <span className="text-xs font-medium">{client.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Área do calendário */}
      <Card className="flex-1 min-h-0 overflow-auto">
        {viewMode === 'month' && (
          <MonthView
            currentMonth={currentDate}
            contents={contents}
            clientColors={clientColors}
            onContentClick={handleContentClick}
            onDayClick={handleDayClick}
            onContentReschedule={handleContentReschedule}
            onViewDayIdeas={handleViewDayIdeas}
            hasEventsForDate={dayHasEvents}
            onViewAllContents={handleViewAllContents}
          />
        )}
        {viewMode === 'week' && (
          <WeekView
            currentWeek={currentDate}
            contents={contents}
            clientColors={clientColors}
            onContentClick={handleContentClick}
            onDayClick={handleDayClick}
            onContentReschedule={handleContentReschedule}
            onViewDayIdeas={handleViewDayIdeas}
            hasEventsForDate={dayHasEvents}
            onViewAllContents={handleViewAllContents}
          />
        )}
        {viewMode === 'day' && (
          <DayView
            currentDay={currentDate}
            contents={contents}
            clientColors={clientColors}
            onContentClick={handleContentClick}
            onDayClick={handleDayClick}
            onViewDayIdeas={handleViewDayIdeas}
            hasEventsForDate={dayHasEvents}
          />
        )}
      </Card>

      {/* Dialog de Seleção de Cliente */}
      <CreateContentClientSelector
        open={showClientSelector}
        onOpenChange={setShowClientSelector}
        clients={clients}
        onClientSelected={handleClientSelected}
      />

      {/* Dialog de Criar Conteúdo */}
      {showCreateContent && creationClientId && selectedDateForCreation && (
        <CreateContentWrapper
          clientId={creationClientId}
          onContentCreated={() => {
            setShowCreateContent(false);
            setCreationClientId(null);
            setSelectedEventTitle("");
            loadContents();
          }}
          initialDate={selectedDateForCreation}
          initialTitle={selectedEventTitle}
        />
      )}

      {/* Dialog de Detalhes do Conteúdo */}
      {selectedContentId && (
        <ContentDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          contentId={selectedContentId}
          isAgencyView={true}
          onUpdate={loadContents}
        />
      )}

      {/* Dialog de Detalhes de Solicitação */}
      <RequestDetailsDialog
        open={showRequestDetails}
        onOpenChange={setShowRequestDetails}
        request={selectedRequest}
      />

      {/* Dialog de Visualização Completa do Dia */}
      <DayContentsDialog
        open={showDayContents}
        onOpenChange={setShowDayContents}
        date={selectedDayForView || new Date()}
        contents={selectedDayForView ? contents.filter(c => 
          isSameDay(new Date(c.date), selectedDayForView)
        ) : []}
        clientColors={clientColors}
        onContentClick={handleContentClick}
      />

      {/* Dialog de Dicas de Conteúdo */}
      <HistoricalEventsDialog
        open={showHistoricalEvents}
        onOpenChange={setShowHistoricalEvents}
        date={selectedDateForIdeas || new Date()}
        cities={cities}
        states={states}
        regions={regions}
        clientId={selectedClient}
        clientName={clients.find(c => c.id === selectedClient)?.name || ''}
        onSelectEvent={handleSelectHistoricalEvent}
      />
    </div>
  );
}
