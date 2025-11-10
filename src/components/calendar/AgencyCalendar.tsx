import { useEffect, useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { CreateContentWrapper } from "@/components/content/CreateContentWrapper";
import { RequestCreativeDialog } from "@/components/admin/RequestCreativeDialog";
import { ContentDetailsDialog } from "@/components/content/ContentDetailsDialog";
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
}

interface AgencyCalendarProps {
  agencyId: string;
  clientId?: string | null; // null = agenda geral, string = agenda de um cliente específico
}

// Paleta de cores para diferentes clientes
const CLIENT_COLOR_PALETTE = [
  '#3B82F6', // Azul vibrante
  '#10B981', // Verde esmeralda
  '#F59E0B', // Âmbar/laranja
  '#8B5CF6', // Roxo
  '#EC4899', // Rosa pink
  '#EF4444', // Vermelho
  '#06B6D4', // Ciano
  '#84CC16', // Lima
  '#F97316', // Laranja queimado
  '#6366F1', // Índigo
];

export function AgencyCalendar({ agencyId, clientId = null }: AgencyCalendarProps) {
  const { toast } = useToast();
  const [contents, setContents] = useState<Content[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(clientId);
  const [clientColors, setClientColors] = useState<Record<string, string>>({});
  const [showCreateContent, setShowCreateContent] = useState(false);
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [selectedDateForCreation, setSelectedDateForCreation] = useState<Date | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    loadClients();
  }, [agencyId]);

  useEffect(() => {
    loadContents();
  }, [agencyId, selectedClient]);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('agency_id', agencyId)
        .order('name');

      if (error) throw error;
      setClients(data || []);
      
      // Atribuir cores aos clientes
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
        .order('date', { ascending: true });

      if (selectedClient) {
        query = query.eq('client_id', selectedClient);
      } else {
        // Buscar todos os conteúdos dos clientes da agência
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
      setContents(data || []);
    } catch (error) {
      console.error('Erro ao carregar conteúdos:', error);
    }
  };

  const getContentsForDate = (date: Date) => {
    return contents.filter(content => 
      isSameDay(new Date(content.date), date)
    );
  };

  const selectedDateContents = selectedDate ? getContentsForDate(selectedDate) : [];

  // Agrupar conteúdos por cliente
  const contentsByClient = useMemo(() => {
    const grouped: Record<string, Date[]> = {};
    contents.forEach(content => {
      if (!grouped[content.client_id]) {
        grouped[content.client_id] = [];
      }
      grouped[content.client_id].push(new Date(content.date));
    });
    return grouped;
  }, [contents]);

  // Criar modifiers para cada cliente
  const modifiers = useMemo(() => {
    const mods: Record<string, Date[]> = {};
    Object.keys(contentsByClient).forEach(clientId => {
      mods[`client_${clientId}`] = contentsByClient[clientId];
    });
    return mods;
  }, [contentsByClient]);

  // Criar estilos por cliente
  const modifiersStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    Object.keys(contentsByClient).forEach(clientId => {
      styles[`client_${clientId}`] = {
        backgroundColor: clientColors[clientId] || 'hsl(var(--primary))',
        color: 'white',
        fontWeight: 'bold',
        borderRadius: '50%',
      };
    });
    return styles;
  }, [contentsByClient, clientColors]);

  const handleDayClick = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedDateForCreation(date || null);
  };

  const handleCardClick = (contentId: string) => {
    setSelectedContentId(contentId);
    setShowDetailsDialog(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Card do Calendário - Coluna esquerda */}
      <Card className="w-full lg:max-h-[calc(100vh-12rem)] lg:overflow-hidden flex flex-col">
        <CardHeader>
          <CardTitle>
            {selectedClient ? 'Agenda do Cliente' : 'Agenda Geral'}
          </CardTitle>
          <CardDescription>
            Visualize as publicações agendadas
          </CardDescription>
          {!clientId && (
            <div className="pt-4">
              <Select value={selectedClient || "all"} onValueChange={(value) => setSelectedClient(value === "all" ? null : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os clientes" />
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
            </div>
          )}
          
          {/* Legenda de Cores por Cliente */}
          {!selectedClient && clients.length > 0 && (
            <div className="pt-4 border-t mt-4">
              <p className="text-sm font-medium mb-3">Legenda de Clientes:</p>
              <div className="flex flex-wrap gap-3">
                {clients.map((client) => (
                  <div 
                    key={client.id} 
                    className="flex items-center gap-2 px-2 py-1 rounded-md border border-border bg-muted/30"
                  >
                    <div 
                      className="w-4 h-4 rounded-full shadow-sm" 
                      style={{ backgroundColor: clientColors[client.id] }}
                    />
                    <span className="text-xs font-medium">{client.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="w-full flex justify-center overflow-y-auto flex-1">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDayClick}
            locale={ptBR}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className="rounded-md border w-full [&>*]:w-full"
          />
        </CardContent>
      </Card>

      {/* Card de Detalhes do Dia - Coluna direita */}
      <Card className="w-full lg:max-h-[calc(100vh-12rem)] lg:overflow-hidden flex flex-col">
        <CardHeader>
          <CardTitle>
            {selectedDate ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Selecione uma data'}
          </CardTitle>
          <CardDescription>
            {selectedDateContents.length} {selectedDateContents.length === 1 ? 'publicação' : 'publicações'}
          </CardDescription>
          
          {/* Botões de ação */}
          {selectedDate && !selectedClient && (
            <div className="flex gap-2 pt-3">
              <Button
                size="sm"
                variant="default"
                onClick={() => setShowCreateContent(true)}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Novo Conteúdo
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCreateRequest(true)}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Nova Solicitação
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="overflow-y-auto flex-1">
          <div className="space-y-3">
            {selectedDateContents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma publicação agendada para esta data
              </p>
            ) : (
              selectedDateContents.map((content) => (
                <Card 
                  key={content.id} 
                  className="p-3 cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all"
                  onClick={() => handleCardClick(content.id)}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm">{content.title}</h4>
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
                        <p className="text-xs text-muted-foreground">
                          {content.clients.name}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
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
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(content.date), "HH:mm")}
                      </span>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Criar Conteúdo */}
      {showCreateContent && (selectedClient || clients[0]) && selectedDateForCreation && (
        <CreateContentWrapper
          clientId={selectedClient || clients[0]?.id || ""}
          onContentCreated={() => {
            setShowCreateContent(false);
            loadContents();
          }}
          initialDate={selectedDateForCreation}
        />
      )}

      {/* Dialog de Nova Solicitação */}
      <RequestCreativeDialog
        open={showCreateRequest}
        onOpenChange={setShowCreateRequest}
        clientId={selectedClient || clients[0]?.id || ""}
        agencyId={agencyId}
        onSuccess={() => {
          loadContents();
          toast({
            title: "Solicitação criada",
            description: "A solicitação de criativo foi registrada com sucesso.",
          });
        }}
        initialDate={selectedDateForCreation}
      />

      {/* Dialog de Detalhes do Conteúdo */}
      {selectedContentId && (
        <ContentDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          contentId={selectedContentId}
          onUpdate={loadContents}
        />
      )}
    </div>
  );
}
