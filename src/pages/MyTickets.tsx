import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSupportTickets, Ticket, TicketStatus, TicketCategory } from "@/hooks/useSupportTickets";
import { CreateTicketDialog } from "@/components/support/CreateTicketDialog";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MessageSquare, ChevronDown, Send, XCircle, CheckCircle, ArrowLeft, Loader2, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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

const MyTickets = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [filterStatus, setFilterStatus] = useState<TicketStatus | "all">("all");
  const [filterCategory, setFilterCategory] = useState<TicketCategory | "all">("all");

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

  useEffect(() => {
    if (!loading) {
      const filters: any = {};
      if (filterStatus !== "all") filters.status = filterStatus;
      if (filterCategory !== "all") filters.category = filterCategory;
      loadTickets(filters);
    }
  }, [filterStatus, filterCategory, loading]);

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
        setProfile({ ...profileData, role: roleData || 'client_user' });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

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
    toast.success("Mensagem enviada!");
  };

  const handleCloseTicket = async (ticketId: string) => {
    await updateTicketStatus(ticketId, 'closed');
    loadTickets();
    toast.success("Ticket fechado!");
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
                <MessageSquare className="h-8 w-8" />
                Meus Tickets
              </h1>
              <p className="text-muted-foreground">Acompanhe suas solicitações de suporte</p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <MessageSquare className="mr-2 h-4 w-4" />
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

          {ticketsLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Carregando tickets...</p>
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
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
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
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Fechar Ticket
                                  </Button>
                                )}
                                <Button onClick={() => handleSendMessage(ticket.id)}>
                                  <Send className="h-4 w-4 mr-2" />
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
      </main>

      <AppFooter />
    </div>
  );
};

export default MyTickets;
