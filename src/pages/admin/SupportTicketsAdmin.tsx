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
import AccessGate from "@/components/auth/AccessGate";

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
    <AccessGate allow={['super_admin']}>
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
...
        </main>
        <AppFooter />
      </div>
    </AccessGate>
  );
}
