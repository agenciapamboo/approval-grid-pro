import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MessageSquare, Clock, CheckCircle, XCircle, Send, Loader2 } from "lucide-react";
import { useSupportTickets, Ticket, TicketMessage, TicketStatus } from "@/hooks/useSupportTickets";
import { CreateTicketDialog } from "@/components/support/CreateTicketDialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Aberto",
  in_progress: "Em Andamento",
  waiting_customer: "Aguardando Cliente",
  resolved: "Resolvido",
  closed: "Fechado",
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  open: "bg-blue-500",
  in_progress: "bg-yellow-500",
  waiting_customer: "bg-orange-500",
  resolved: "bg-green-500",
  closed: "bg-gray-500",
};

const AgencyTicketsManager = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  
  const { 
    tickets, 
    messages, 
    loading: ticketsLoading,
    loadTickets, 
    loadMessages,
    addMessage,
    updateTicketStatus
  } = useSupportTickets();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const { data: roleData } = await supabase
        .rpc('get_user_role', { _user_id: user.id });

      if (profileData) {
        const userProfile = { ...profileData, role: roleData || 'client_user' };
        setProfile(userProfile);
        
        if (roleData === 'agency_admin') {
          // Carregar tickets do agency admin
          await loadTickets();
        } else {
          navigate("/dashboard");
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    setSendingMessage(true);
    try {
      await addMessage(selectedTicket.id, newMessage, false);
      setNewMessage("");
      toast.success("Mensagem enviada!");
      // Recarregar mensagens
      await loadMessages(selectedTicket.id);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      await updateTicketStatus(ticketId, newStatus);
      toast.success("Status atualizado!");
      await loadTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const handleSelectTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    await loadMessages(ticket.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const myTickets = tickets.filter(t => t.category !== 'agencia');
  const clientTickets = tickets.filter(t => t.category === 'agencia');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader 
        userName={profile?.name} 
        userRole={profile?.role} 
        onSignOut={() => navigate("/auth")} 
      />

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            Gerenciamento de Tickets
          </h1>
          <p className="text-muted-foreground">
            Gerencie seus tickets e os tickets dos seus clientes
          </p>
        </div>

        <Tabs defaultValue="my-tickets" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my-tickets">
              Meus Tickets ({myTickets.length})
            </TabsTrigger>
            <TabsTrigger value="client-tickets">
              Tickets dos Clientes ({clientTickets.length})
            </TabsTrigger>
          </TabsList>

          {/* Tab: Meus Tickets */}
          <TabsContent value="my-tickets" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Tickets que você abriu para suporte, financeiro ou dúvidas
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Novo Ticket
              </Button>
            </div>

            {ticketsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : myTickets.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Você não possui tickets abertos</p>
                  <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                    Abrir Primeiro Ticket
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {myTickets.map((ticket) => (
                  <Card key={ticket.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                          <CardDescription className="mt-1">
                            {ticket.description}
                          </CardDescription>
                        </div>
                        <Badge className={STATUS_COLORS[ticket.status]}>
                          {STATUS_LABELS[ticket.status]}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                        <Badge variant="outline">{ticket.category}</Badge>
                        <Badge variant="outline">{ticket.priority}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: Tickets dos Clientes */}
          <TabsContent value="client-tickets" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tickets abertos pelos seus clientes que precisam de sua atenção
            </p>

            {ticketsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : clientTickets.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhum ticket de cliente pendente</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lista de Tickets */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Tickets Pendentes</h3>
                  {clientTickets.map((ticket) => (
                    <Card 
                      key={ticket.id} 
                      className={`cursor-pointer transition-all ${
                        selectedTicket?.id === ticket.id ? 'ring-2 ring-primary' : 'hover:shadow-md'
                      }`}
                      onClick={() => handleSelectTicket(ticket)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">{ticket.subject}</CardTitle>
                          <Badge className={STATUS_COLORS[ticket.status]}>
                            {STATUS_LABELS[ticket.status]}
                          </Badge>
                        </div>
                        <CardDescription className="text-sm line-clamp-2">
                          {ticket.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Detalhes do Ticket Selecionado */}
                <div className="lg:sticky lg:top-6 h-fit">
                  {selectedTicket ? (
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>{selectedTicket.subject}</CardTitle>
                            <CardDescription className="mt-2">
                              {selectedTicket.description}
                            </CardDescription>
                          </div>
                          <Badge className={STATUS_COLORS[selectedTicket.status]}>
                            {STATUS_LABELS[selectedTicket.status]}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Atualizar Status */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Status do Ticket</label>
                          <Select
                            value={selectedTicket.status}
                            onValueChange={(value) => handleStatusChange(selectedTicket.id, value as TicketStatus)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Aberto</SelectItem>
                              <SelectItem value="in_progress">Em Andamento</SelectItem>
                              <SelectItem value="waiting_customer">Aguardando Cliente</SelectItem>
                              <SelectItem value="resolved">Resolvido</SelectItem>
                              <SelectItem value="closed">Fechado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Mensagens */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Conversas</label>
                          <div className="border rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto bg-muted/30">
                            {(!messages[selectedTicket.id] || messages[selectedTicket.id].length === 0) ? (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                Nenhuma mensagem ainda
                              </p>
                            ) : (
                              messages[selectedTicket.id].map((msg) => (
                                <div key={msg.id} className="bg-background rounded-lg p-3">
                                  <p className="text-sm">{msg.message}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {format(new Date(msg.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Responder */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Responder</label>
                          <Textarea
                            placeholder="Digite sua resposta..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            rows={3}
                          />
                          <Button 
                            onClick={handleSendMessage} 
                            disabled={sendingMessage || !newMessage.trim()}
                            className="w-full"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            {sendingMessage ? "Enviando..." : "Enviar Resposta"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          Selecione um ticket para ver os detalhes
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <AppFooter />

      <CreateTicketDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
};

export default AgencyTicketsManager;
