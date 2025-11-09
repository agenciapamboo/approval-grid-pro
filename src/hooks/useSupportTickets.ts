import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sendInternalNotification } from "@/lib/internal-notifications-client";

export type TicketCategory = 'suporte' | 'duvidas' | 'financeiro' | 'agencia';
export type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Ticket {
  id: string;
  user_id: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  assigned_to?: string;
  subject: string;
  description: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
}

// Mapeamento de categorias por role
const AVAILABLE_CATEGORIES: Record<string, TicketCategory[]> = {
  'client_user': ['suporte', 'duvidas', 'agencia'],
  'agency_admin': ['suporte', 'duvidas', 'financeiro'],
  'super_admin': ['suporte', 'duvidas', 'financeiro', 'agencia'],
  'team_member': ['suporte', 'duvidas', 'financeiro', 'agencia'],
};

export function useSupportTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [messages, setMessages] = useState<Record<string, TicketMessage[]>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .order('role')
      .limit(1);

    return roles?.[0]?.role || 'client_user';
  };

  const getAvailableCategories = async (): Promise<TicketCategory[]> => {
    const role = await getUserRole();
    return AVAILABLE_CATEGORIES[role || 'client_user'] || ['suporte', 'duvidas'];
  };

  const createTicket = async (
    category: TicketCategory,
    subject: string,
    description: string,
    priority: TicketPriority = 'normal'
  ) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Validar se o usuário pode criar ticket nesta categoria
      const availableCategories = await getAvailableCategories();
      if (!availableCategories.includes(category)) {
        throw new Error('Você não tem permissão para criar tickets nesta categoria');
      }

      const { data, error } = await supabase
        .from('support_tickets' as any)
        .insert({
          user_id: user.id,
          category,
          subject,
          description,
          priority,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      // Enviar notificação interna
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      if (data && 'id' in data && typeof data.id === 'string') {
        await sendInternalNotification({
          type: 'info',
          subject: `Novo Ticket de Suporte #${(data.id as string).substring(0, 8)}`,
          message: `Um novo ticket foi criado na categoria ${category}`,
          details: {
            ticket_id: data.id,
            subject,
            description,
            category,
            priority,
            status: 'open',
            created_by: {
              user_id: user.id,
              user_name: profile?.name || currentUser?.email || 'Desconhecido',
              user_email: currentUser?.email || ''
            },
            created_at: 'created_at' in data ? (data.created_at as string) : new Date().toISOString()
          },
          source: 'support-tickets-system',
          priority: priority === 'urgent' ? 'critical' : priority === 'high' ? 'high' : 'normal'
        });
      }

      toast({
        title: "Ticket criado com sucesso",
        description: `Seu ticket foi criado.`,
      });

      return { success: true, ticket: data as any };
    } catch (error: any) {
      toast({
        title: "Erro ao criar ticket",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const loadTickets = async (filters?: { status?: TicketStatus; category?: TicketCategory }) => {
    setLoading(true);
    try {
      let query = supabase
        .from('support_tickets' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      const { data, error } = await query;
      if (error) throw error;

      setTickets(data as any || []);
      return { success: true, tickets: data };
    } catch (error: any) {
      toast({
        title: "Erro ao carregar tickets",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('ticket_messages' as any)
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(prev => ({ ...prev, [ticketId]: data as any || [] }));
      return { success: true, messages: data };
    } catch (error: any) {
      toast({
        title: "Erro ao carregar mensagens",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  const addMessage = async (ticketId: string, message: string, isInternal = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('ticket_messages' as any)
        .insert({
          ticket_id: ticketId,
          user_id: user.id,
          message,
          is_internal: isInternal,
        })
        .select()
        .single();

      if (error) throw error;

      // Buscar informações do ticket
      const ticket = tickets.find(t => t.id === ticketId);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      // Enviar notificação interna
      if (ticket && data && 'id' in data && typeof data.id === 'string') {
        await sendInternalNotification({
          type: 'info',
          subject: `Nova resposta no Ticket #${ticketId.substring(0, 8)}`,
          message: 'Uma nova mensagem foi adicionada ao ticket',
          details: {
            ticket_id: ticketId,
            ticket_subject: ticket.subject,
            message_id: data.id,
            message_text: message,
            is_internal: isInternal,
            replied_by: {
              user_id: user.id,
              user_name: profile?.name || currentUser?.email || 'Desconhecido',
              user_email: currentUser?.email || ''
            },
            replied_at: 'created_at' in data ? (data.created_at as string) : new Date().toISOString()
          },
          source: 'support-tickets-system',
          priority: 'normal'
        });
      }

      // Atualizar mensagens localmente
      setMessages(prev => ({
        ...prev,
        [ticketId]: [...(prev[ticketId] || []), data as any],
      }));

      toast({
        title: "Mensagem enviada",
        description: "Sua mensagem foi adicionada ao ticket.",
      });

      return { success: true, message: data };
    } catch (error: any) {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  const updateTicketStatus = async (ticketId: string, status: TicketStatus) => {
    try {
      const updateData: any = { status };
      
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      } else if (status === 'closed') {
        updateData.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('support_tickets' as any)
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;

      // Enviar notificação interna se fechado/resolvido
      if (status === 'resolved' || status === 'closed') {
        const ticket = tickets.find(t => t.id === ticketId);
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', currentUser?.id || '')
          .single();

        if (ticket) {
          const ticketMessages = messages[ticketId] || [];
          const createdAt = new Date(ticket.created_at);
          const closedAt = new Date();
          const resolutionHours = Math.round((closedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60));

          await sendInternalNotification({
            type: 'info',
            subject: `Ticket #${ticketId.substring(0, 8)} foi ${status === 'closed' ? 'fechado' : 'resolvido'}`,
            message: `Ticket ${status === 'closed' ? 'fechado' : 'resolvido'}`,
            details: {
              ticket_id: ticketId,
              ticket_subject: ticket.subject,
              category: ticket.category,
              priority: ticket.priority,
              status,
              created_at: ticket.created_at,
              closed_at: closedAt.toISOString(),
              resolution_time_hours: resolutionHours,
              total_messages: ticketMessages.length,
              closed_by: {
                user_id: currentUser?.id || '',
                user_name: profile?.name || currentUser?.email || 'Sistema',
                user_email: currentUser?.email || ''
              }
            },
            source: 'support-tickets-system',
            priority: 'low'
          });
        }
      }

      // Atualizar ticket localmente
      setTickets(prev => prev.map(t => 
        t.id === ticketId ? { ...t, ...updateData } as any : t
      ));

      toast({
        title: "Ticket atualizado",
        description: `Status alterado para ${status}.`,
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar ticket",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  const assignTicket = async (ticketId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets' as any)
        .update({ assigned_to: userId })
        .eq('id', ticketId);

      if (error) throw error;

      setTickets(prev => prev.map(t => 
        t.id === ticketId ? { ...t, assigned_to: userId } as any : t
      ));

      toast({
        title: "Ticket atribuído",
        description: "Ticket foi atribuído com sucesso.",
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: "Erro ao atribuir ticket",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  return {
    tickets,
    messages,
    loading,
    createTicket,
    loadTickets,
    loadMessages,
    addMessage,
    updateTicketStatus,
    assignTicket,
    getAvailableCategories,
  };
}
