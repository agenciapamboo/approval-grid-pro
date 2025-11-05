import { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export function AgencyCalendar({ agencyId, clientId = null }: AgencyCalendarProps) {
  const [contents, setContents] = useState<Content[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(clientId);

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

  const modifiers = {
    hasContent: contents.map(c => new Date(c.date)),
  };

  const modifiersStyles = {
    hasContent: {
      fontWeight: 'bold',
      backgroundColor: 'hsl(var(--primary))',
      color: 'white',
      borderRadius: '50%',
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
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
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={ptBR}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedDate ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Selecione uma data'}
          </CardTitle>
          <CardDescription>
            {selectedDateContents.length} {selectedDateContents.length === 1 ? 'publicação' : 'publicações'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {selectedDateContents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma publicação agendada para esta data
              </p>
            ) : (
              selectedDateContents.map((content) => (
                <Card key={content.id} className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm">{content.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {content.type}
                      </Badge>
                    </div>
                    {content.clients && (
                      <p className="text-xs text-muted-foreground">
                        {content.clients.name}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge variant={content.status === 'approved' ? 'success' : 'outline'}>
                        {content.status === 'approved' ? 'Aprovado' : content.status}
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
    </div>
  );
}
