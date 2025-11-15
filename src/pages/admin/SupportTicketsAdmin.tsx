import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSupportTickets, Ticket, TicketStatus } from "@/hooks/useSupportTickets";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle, Clock, AlertCircle, XCircle, Send } from "lucide-react";
import AccessGate from "@/components/auth/AccessGate";
import { AppLayout } from "@/components/layout/AppLayout";

const STATUS_LABELS: Record<TicketStatus, string> = {
  'open': 'Aberto',
  'in_progress': 'Em Progresso',
  'waiting_customer': 'Aguardando Cliente',
  'resolved': 'Resolvido',
  'closed': 'Fechado',
};

export default function SupportTicketsAdmin() {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [filterStatus, setFilterStatus] = useState<TicketStatus | "all">("all");

  const { tickets, messages, loading, loadTickets, loadMessages, addMessage, updateTicketStatus } = useSupportTickets();

  useEffect(() => {
    const filters: any = {};
    if (filterStatus !== "all") filters.status = filterStatus;
    loadTickets(filters);
  }, [filterStatus]);

  useEffect(() => {
    if (selectedTicket) {
      loadMessages(selectedTicket.id);
    }
  }, [selectedTicket]);

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;
    
    await addMessage(selectedTicket.id, newMessage, false);
    setNewMessage("");
    await loadMessages(selectedTicket.id);
  };

  const handleUpdateStatus = async (status: TicketStatus) => {
    if (!selectedTicket) return;
    await updateTicketStatus(selectedTicket.id, status);
    loadTickets();
  };

  const getStatusIcon = (status: TicketStatus) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4" />;
      case 'closed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    const variants: Record<TicketStatus, any> = {
      'open': 'destructive',
      'in_progress': 'default',
      'waiting_customer': 'secondary',
      'resolved': 'outline',
      'closed': 'outline',
    };
    return (
      <Badge variant={variants[status]} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {STATUS_LABELS[status]}
      </Badge>
    );
  };

  return (
    <AccessGate allow={['super_admin']}>
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Tickets de Suporte</h1>
            <p className="text-muted-foreground mt-2">Gerencie os tickets de suporte do sistema</p>
          </div>

          <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)} className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="open">Abertos</TabsTrigger>
              <TabsTrigger value="in_progress">Em Progresso</TabsTrigger>
              <TabsTrigger value="waiting_customer">Aguardando Cliente</TabsTrigger>
              <TabsTrigger value="resolved">Resolvidos</TabsTrigger>
              <TabsTrigger value="closed">Fechados</TabsTrigger>
            </TabsList>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Lista de Tickets */}
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle>Tickets</CardTitle>
                  <CardDescription>{tickets.length} tickets encontrados</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-2">
                      {tickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className={`p-3 border rounded cursor-pointer hover:bg-accent transition-colors ${
                            selectedTicket?.id === ticket.id ? 'bg-accent' : ''
                          }`}
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium text-sm">{ticket.subject}</h3>
                            {getStatusBadge(ticket.status)}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{ticket.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(ticket.created_at!), { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Detalhes do Ticket */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Detalhes do Ticket</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedTicket ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg">{selectedTicket.subject}</h3>
                        <p className="text-sm text-muted-foreground">{selectedTicket.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {getStatusBadge(selectedTicket.status)}
                          <Badge variant="outline">{selectedTicket.priority}</Badge>
                          <Badge variant="outline">{selectedTicket.category}</Badge>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Alterar Status</label>
                        <Select value={selectedTicket.status} onValueChange={(v) => handleUpdateStatus(v as TicketStatus)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Aberto</SelectItem>
                            <SelectItem value="in_progress">Em Progresso</SelectItem>
                            <SelectItem value="waiting_customer">Aguardando Cliente</SelectItem>
                            <SelectItem value="resolved">Resolvido</SelectItem>
                            <SelectItem value="closed">Fechado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Mensagens</h4>
                        <ScrollArea className="h-[300px] border rounded p-3">
                          <div className="space-y-3">
                            {Array.isArray(messages) && messages.map((msg) => (
                              <div key={msg.id} className={`p-2 rounded ${msg.is_internal ? 'bg-muted' : 'bg-accent'}`}>
                                <p className="text-sm">{msg.message}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDistanceToNow(new Date(msg.created_at!), { addSuffix: true, locale: ptBR })}
                                </p>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nova Mensagem</label>
                        <Textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Digite sua mensagem..."
                          rows={3}
                        />
                        <Button onClick={handleSendMessage} className="w-full">
                          <Send className="h-4 w-4 mr-2" />
                          Enviar Mensagem
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Selecione um ticket para ver os detalhes
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </Tabs>
        </div>
      </AppLayout>
    </AccessGate>
  );
}
