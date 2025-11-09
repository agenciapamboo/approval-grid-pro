import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSupportTickets, Ticket, TicketStatus } from "@/hooks/useSupportTickets";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle, Clock, AlertCircle, XCircle, ArrowLeft } from "lucide-react";

const STATUS_LABELS: Record<TicketStatus, string> = {
  'open': 'Aberto',
  'in_progress': 'Em Progresso',
  'waiting_customer': 'Aguardando Cliente',
  'resolved': 'Resolvido',
  'closed': 'Fechado',
};

export default function SupportTicketsAdmin() {
  const navigate = useNavigate();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [filterStatus, setFilterStatus] = useState<TicketStatus | "all">("all");

  const { tickets, messages, loading, loadTickets, loadMessages, addMessage, updateTicketStatus, assignTicket } = useSupportTickets();

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
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      
      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </div>
          
          <h1 className="text-3xl font-bold mb-6">Gerenciar Tickets de Suporte</h1>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Lista de Tickets */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Tickets</CardTitle>
                  <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mx-auto"></div>
                    </div>
                  ) : tickets.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhum ticket encontrado
                    </p>
                  ) : (
                    tickets.map((ticket) => (
                      <Card
                        key={ticket.id}
                        className={`cursor-pointer transition-all ${
                          selectedTicket?.id === ticket.id ? 'border-primary shadow-md' : 'hover:shadow'
                        }`}
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-sm line-clamp-1">
                              {ticket.subject}
                            </CardTitle>
                            {getStatusBadge(ticket.status)}
                          </div>
                          <CardDescription className="text-xs">
                            #{ticket.id.substring(0, 8)} • {formatDistanceToNow(new Date(ticket.created_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Detalhes do Ticket */}
            <div className="lg:col-span-2">
              {selectedTicket ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle>{selectedTicket.subject}</CardTitle>
                        <CardDescription>
                          Ticket #{selectedTicket.id.substring(0, 8)} • Categoria: {selectedTicket.category}
                        </CardDescription>
                      </div>
                      {getStatusBadge(selectedTicket.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm font-medium mb-2">Descrição:</p>
                      <p className="text-sm">{selectedTicket.description}</p>
                    </div>

                    <div>
                      <h3 className="font-medium mb-3">Ações</h3>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus('in_progress')}
                          disabled={selectedTicket.status === 'in_progress'}
                        >
                          Em Progresso
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus('waiting_customer')}
                          disabled={selectedTicket.status === 'waiting_customer'}
                        >
                          Aguardando Cliente
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus('resolved')}
                          disabled={selectedTicket.status === 'resolved'}
                        >
                          Resolver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus('closed')}
                          disabled={selectedTicket.status === 'closed'}
                        >
                          Fechar
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium mb-3">Mensagens</h3>
                      <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
                        {messages[selectedTicket.id]?.map((msg) => (
                          <div key={msg.id} className="bg-muted/50 p-3 rounded-lg">
                            <p className="text-sm">{msg.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(msg.created_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                              {msg.is_internal && <Badge variant="outline" className="ml-2 text-xs">Interna</Badge>}
                            </p>
                          </div>
                        ))}
                      </div>

                      {selectedTicket.status !== 'closed' && (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Digite sua resposta..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            rows={4}
                          />
                          <div className="flex justify-end">
                            <Button onClick={handleSendMessage}>
                              Enviar Resposta
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-[400px]">
                    <p className="text-muted-foreground">
                      Selecione um ticket para ver os detalhes
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <AppFooter />
    </div>
  );
}
