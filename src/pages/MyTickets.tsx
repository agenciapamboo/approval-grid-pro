import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSupportTickets, Ticket, TicketStatus, TicketCategory } from "@/hooks/useSupportTickets";
import { CreateTicketDialog } from "@/components/support/CreateTicketDialog";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const STATUS_LABELS: Record<TicketStatus, string> = {
  'open': 'Aberto',
  'in_progress': 'Em Progresso',
  'waiting_customer': 'Aguardando Cliente',
  'resolved': 'Resolvido',
  'closed': 'Fechado',
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  'suporte': 'Suporte',
  'duvidas': 'Dúvidas',
  'financeiro': 'Financeiro',
  'agencia': 'Agência',
};

export default function MyTickets() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [filterStatus, setFilterStatus] = useState<TicketStatus | "all">("all");
  const [filterCategory, setFilterCategory] = useState<TicketCategory | "all">("all");

  const { tickets, messages, loading, loadTickets, loadMessages, addMessage, updateTicketStatus } = useSupportTickets();

  useEffect(() => {
    const filters: any = {};
    if (filterStatus !== "all") filters.status = filterStatus;
    if (filterCategory !== "all") filters.category = filterCategory;
    loadTickets(filters);
  }, [filterStatus, filterCategory]);

  const handleExpandTicket = async (ticketId: string) => {
    if (expandedTicket === ticketId) {
      setExpandedTicket(null);
    } else {
      setExpandedTicket(ticketId);
      await loadMessages(ticketId);
    }
  };

  const handleSendMessage = async (ticketId: string) => {
    if (!newMessage.trim()) return;
    
    await addMessage(ticketId, newMessage);
    setNewMessage("");
    await loadMessages(ticketId);
  };

  const handleCloseTicket = async (ticketId: string) => {
    await updateTicketStatus(ticketId, 'closed');
    loadTickets();
  };

  const getStatusBadge = (status: TicketStatus) => {
    const variants: Record<TicketStatus, any> = {
      'open': 'default',
      'in_progress': 'secondary',
      'waiting_customer': 'outline',
      'resolved': 'outline',
      'closed': 'outline',
    };
    return <Badge variant={variants[status]}>{STATUS_LABELS[status]}</Badge>;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Meus Tickets</h1>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Ticket
          </Button>
        </div>

        <div className="flex gap-4 mb-6">
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as any)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Categorias</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Nenhum ticket encontrado</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              Criar Primeiro Ticket
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Card key={ticket.id}>
                <Collapsible 
                  open={expandedTicket === ticket.id}
                  onOpenChange={() => handleExpandTicket(ticket.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                          {getStatusBadge(ticket.status)}
                          <Badge variant="outline">{CATEGORY_LABELS[ticket.category]}</Badge>
                        </div>
                        <CardDescription>
                          #{ticket.id.substring(0, 8)} • {formatDistanceToNow(new Date(ticket.created_at), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </CardDescription>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          {expandedTicket === ticket.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </CardHeader>

                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      <div className="bg-muted p-4 rounded-lg">
                        <p className="text-sm font-medium mb-2">Descrição:</p>
                        <p className="text-sm">{ticket.description}</p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          <h3 className="font-medium">Mensagens</h3>
                        </div>

                        {messages[ticket.id]?.map((msg) => (
                          <div key={msg.id} className="bg-muted/50 p-3 rounded-lg">
                            <p className="text-sm">{msg.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(msg.created_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </p>
                          </div>
                        ))}

                        {ticket.status !== 'closed' && (
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Digite sua mensagem..."
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              rows={3}
                            />
                            <div className="flex gap-2 justify-end">
                              {ticket.status === 'resolved' && (
                                <Button
                                  variant="outline"
                                  onClick={() => handleCloseTicket(ticket.id)}
                                >
                                  Fechar Ticket
                                </Button>
                              )}
                              <Button onClick={() => handleSendMessage(ticket.id)}>
                                Enviar Mensagem
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        )}

        <CreateTicketDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </div>
    </div>
  );
}
