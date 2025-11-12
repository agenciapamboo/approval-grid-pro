import { useEffect, useState, useMemo, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { z } from "zod";
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from "@/components/ui/kanban";
import { DragOverlay, defaultDropAnimationSideEffects } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent, DropAnimation } from "@dnd-kit/core";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Eye, Calendar, RefreshCw, Send, Plus, X, ChevronDown, ChevronUp, MessageSquare, Paperclip, Upload, FileIcon, ZoomIn, Loader2, CheckCircle2, CalendarIcon, AlertCircle, Hand, Keyboard, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RequestCard } from "./RequestCard";
import { RequestDetailsDialog } from "./RequestDetailsDialog";
import { ContentDetailsDialog } from "./ContentDetailsDialog";
import { CreateContentWrapper } from "./CreateContentWrapper";

interface Content {
  id: string;
  title: string;
  date: string;
  status: string;
  type: string;
  client_id: string;
  owner_user_id: string;
  is_content_plan?: boolean;
  plan_description?: string | null;
  comments_count?: number;
  media_count?: number;
  clients?: {
    name: string;
  };
  profiles?: {
    name: string;
  };
}

interface KanbanColumn {
  id: string;
  column_id: string;
  column_name: string;
  column_color: string;
  column_order: number;
  is_system: boolean;
}

interface CreativeRequestData {
  id: string;
  type: 'creative_request';
  title: string;
  clientName: string;
  clientEmail?: string;
  clientWhatsapp?: string;
  createdAt: string;
  status?: string;
  requestType?: string;
  text?: string;
  caption?: string;
  observations?: string;
  referenceFiles?: string[];
}

interface AdjustmentRequestData {
  id: string;
  type: 'adjustment_request';
  title: string;
  clientName: string;
  createdAt: string;
  contentTitle: string;
  reason: string;
  details: string;
  version: number;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

interface ContentKanbanProps {
  agencyId: string;
}

// Schema de validação para novo creative request
const newRequestSchema = z.object({
  title: z.string().trim().min(3, "Título deve ter no mínimo 3 caracteres").max(100, "Título muito longo"),
  client_id: z.string().uuid("Selecione um cliente"),
  request_type: z.string().min(1, "Selecione o tipo de solicitação"),
  observations: z.string().max(500, "Observações muito longas").optional(),
});

// Helper para calcular status do deadline
const getDeadlineStatus = (contentDate: string) => {
  const now = new Date();
  const deadline = new Date(contentDate);
  const diffInDays = differenceInDays(deadline, now);
  
  if (diffInDays < 0) {
    return { status: 'overdue', color: 'hsl(var(--destructive))', label: 'Atrasado', variant: 'destructive' as const };
  } else if (diffInDays === 0) {
    return { status: 'today', color: 'hsl(var(--warning))', label: 'Hoje', variant: 'warning' as const };
  } else if (diffInDays <= 2) {
    return { status: 'urgent', color: 'hsl(var(--warning))', label: 'Urgente', variant: 'warning' as const };
  } else if (diffInDays <= 7) {
    return { status: 'soon', color: 'hsl(45 100% 50%)', label: 'Próximo', variant: 'outline' as const };
  }
  return { status: 'normal', color: 'hsl(var(--muted-foreground))', label: 'Normal', variant: 'outline' as const };
};

export function ContentKanban({ agencyId }: ContentKanbanProps) {
  const { toast } = useToast();
  const [contents, setContents] = useState<Content[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<(CreativeRequestData | AdjustmentRequestData)[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<{
    type: 'creative_request' | 'adjustment_request';
    data: any;
  } | null>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const [sendingForReview, setSendingForReview] = useState<string | null>(null);
  const [requestTypeFilter, setRequestTypeFilter] = useState<'all' | 'creative' | 'adjustment'>('all');
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  
  // Estados para o formulário inline
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [newRequest, setNewRequest] = useState({
    title: '',
    client_id: '',
    request_type: '',
    observations: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; url: string; size: number; type: string }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  
  // Estados para novo conteúdo
  const [isNewContentOpen, setIsNewContentOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showClientSelector, setShowClientSelector] = useState(false);
  
  // Estados para histórico de dias e filtros
  const [historyDays, setHistoryDays] = useState<number>(30);
  const [hideApproved, setHideApproved] = useState(false);
  const [hideScheduled, setHideScheduled] = useState(false);
  const [hidePublished, setHidePublished] = useState(false);
  
  // Estados para filtro de data
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: new Date()
  });

  // Estados para navegação por teclado
  const [focusedColumn, setFocusedColumn] = useState<number>(0);
  const [focusedCard, setFocusedCard] = useState<number>(0);
  const [keyboardNavigationActive, setKeyboardNavigationActive] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Estados para drag-to-scroll
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 });
  const [scrollLeft, setScrollLeft] = useState(0);
  const kanbanContainerRef = useRef<HTMLDivElement>(null);

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  // Keyboard navigation effect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar se estiver em input/textarea ou dialog aberto
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const getContentsByColumnIndex = (colIndex: number) => {
        const column = columns[colIndex];
        if (!column) return [];
        
        let statusFilter = column.column_id;
        if (column.column_id === 'scheduled') {
          statusFilter = 'approved';
        }
        
        if (column.column_id === 'requests') {
          return [];
        }
        
        return contents.filter((content) => {
          if (column.column_id === 'scheduled') {
            return content.status === 'approved' && new Date(content.date) > new Date();
          }
          return content.status === statusFilter;
        });
      };

      switch(e.key) {
        case 'ArrowRight':
          e.preventDefault();
          setFocusedColumn(prev => Math.min(prev + 1, columns.length - 1));
          setFocusedCard(0);
          setKeyboardNavigationActive(true);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setFocusedColumn(prev => Math.max(prev - 1, 0));
          setFocusedCard(0);
          setKeyboardNavigationActive(true);
          break;
        case 'ArrowDown':
          e.preventDefault();
          const currentColumnContents = getContentsByColumnIndex(focusedColumn);
          setFocusedCard(prev => Math.min(prev + 1, currentColumnContents.length - 1));
          setKeyboardNavigationActive(true);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedCard(prev => Math.max(prev - 1, 0));
          setKeyboardNavigationActive(true);
          break;
        case 'Escape':
          setKeyboardNavigationActive(false);
          break;
        case 'Delete':
          if (!keyboardNavigationActive) return;
          const contentToArchive = getContentsByColumnIndex(focusedColumn)[focusedCard];
          if (contentToArchive && confirm(`Arquivar "${contentToArchive.title}"?`)) {
            handleArchiveContent(contentToArchive.id);
          }
          break;
        case 'Enter':
          if (!keyboardNavigationActive) return;
          const contentToView = getContentsByColumnIndex(focusedColumn)[focusedCard];
          if (contentToView) {
            handleCardClick(contentToView.id);
          }
          break;
        case '?':
          setShowShortcuts(!showShortcuts);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedColumn, focusedCard, columns, contents, keyboardNavigationActive, showShortcuts]);

  useEffect(() => {
    loadAgencyEntitlements();
    loadColumns();
    loadContents();
    loadRequests();
    loadClients();
    
    
    // Realtime updates para colunas
    const columnsChannel = supabase
      .channel('kanban-columns-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kanban_columns',
          filter: `agency_id=eq.${agencyId}`
        },
        () => {
          loadColumns();
        }
      )
      .subscribe();

    // Realtime updates para conteúdos com notificação de aprovação/rejeição
    const contentsChannel = supabase
      .channel('contents-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contents'
        },
        (payload) => {
          const oldRecord = payload.old as Content;
          const newRecord = payload.new as Content;
          
          // Verificar se houve mudança de status para aprovado
          if (oldRecord.status !== 'approved' && newRecord.status === 'approved') {
            toast({
              title: "✅ Conteúdo Aprovado!",
              description: `"${newRecord.title}" foi aprovado pelo cliente`,
              duration: 5000,
            });
          }
          
          // Verificar se houve mudança de status para rejeitado
          if (oldRecord.status !== 'changes_requested' && newRecord.status === 'changes_requested') {
            toast({
              title: "⚠️ Alterações Solicitadas",
              description: `"${newRecord.title}" precisa de ajustes`,
              variant: "destructive",
              duration: 5000,
            });
          }
          
          loadContents();
        }
      )
      .subscribe();

    // Realtime updates para notificações (creative requests)
    const notificationsChannel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `agency_id=eq.${agencyId}`
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    // Realtime updates para comentários (adjustment requests)
    const commentsChannel = supabase
      .channel('comments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments'
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(columnsChannel);
      supabase.removeChannel(contentsChannel);
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [agencyId, dateRange]);

  const loadAgencyEntitlements = async () => {
    try {
      const { data: agency, error: agencyError } = await supabase
        .from("agencies")
        .select("plan")
        .eq("id", agencyId)
        .single();

      if (agencyError) throw agencyError;

      const { data: entitlements, error: entitlementsError } = await supabase
        .from("plan_entitlements")
        .select("history_days")
        .eq("plan", agency.plan)
        .single();

      if (entitlementsError) throw entitlementsError;

      setHistoryDays(entitlements.history_days || 30);
    } catch (error) {
      console.error("Erro ao carregar entitlements:", error);
      setHistoryDays(30);
    }
  };

  const loadColumns = async () => {
    try {
      const { data, error } = await supabase
        .from("kanban_columns")
        .select("*")
        .eq("agency_id", agencyId)
        .order("column_order", { ascending: true });

      if (error) throw error;
      setColumns(data || []);
    } catch (error) {
      console.error("Erro ao carregar colunas:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar as colunas do Kanban.",
      });
    }
  };

  const loadContents = async () => {
    try {
      setLoading(true);
      
      // Buscar clientes da agência
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id")
        .eq("agency_id", agencyId);

      if (clientsError) throw clientsError;

      if (!clients || clients.length === 0) {
        setContents([]);
        setLoading(false);
        return;
      }

      const clientIds = clients.map((c) => c.id);

      // Calcular data de início baseado em historyDays
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - historyDays);
      const endDate = new Date();

      const { data, error } = await supabase
        .from("contents")
        .select(`
          id,
          title,
          date,
          status,
          type,
          client_id,
          owner_user_id,
          is_content_plan,
          plan_description,
          clients (name)
        `)
        .in("client_id", clientIds)
        .gte("date", startDate.toISOString())
        .lte("date", endDate.toISOString())
        .order("date", { ascending: true });

      if (error) throw error;

      // Buscar informações dos donos, comentários e mídias
      if (data && data.length > 0) {
        const contentIds = data.map((c) => c.id);
        const ownerIds = [...new Set(data.map((c) => c.owner_user_id))];
        
        // Buscar profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", ownerIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

        // Buscar contagem de comentários
        const { data: commentsData } = await supabase
          .from("comments")
          .select("content_id")
          .in("content_id", contentIds);

        const commentsCountMap = new Map<string, number>();
        commentsData?.forEach((comment) => {
          const count = commentsCountMap.get(comment.content_id) || 0;
          commentsCountMap.set(comment.content_id, count + 1);
        });

        // Buscar contagem de mídias
        const { data: mediaData } = await supabase
          .from("content_media")
          .select("content_id")
          .in("content_id", contentIds);

        const mediaCountMap = new Map<string, number>();
        mediaData?.forEach((media) => {
          const count = mediaCountMap.get(media.content_id) || 0;
          mediaCountMap.set(media.content_id, count + 1);
        });

        // Não filtrar conteúdos aprovados
        const enrichedContents = data.map((content) => ({
          ...content,
          profiles: profileMap.get(content.owner_user_id),
          comments_count: commentsCountMap.get(content.id) || 0,
          media_count: mediaCountMap.get(content.id) || 0,
        }));

        setContents(enrichedContents as Content[]);
      } else {
        setContents([]);
      }
    } catch (error) {
      console.error("Erro ao carregar conteúdos:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os conteúdos.",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    try {
      // Buscar clientes da agência
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id, name, email, whatsapp")
        .eq("agency_id", agencyId);

      if (clientsError) throw clientsError;

      if (!clients || clients.length === 0) {
        setRequests([]);
        return;
      }

      const clientIds = clients.map((c) => c.id);
      const clientMap = new Map(clients.map((c) => [c.id, c]));

      // Buscar creative requests (notifications com event=novojob)
      const { data: creativeNotifications, error: creativeError } = await supabase
        .from("notifications")
        .select("*")
        .eq("event", "novojob")
        .eq("agency_id", agencyId)
        .in("client_id", clientIds)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (creativeError) throw creativeError;

      const creativeRequests: CreativeRequestData[] = (creativeNotifications || []).map((notif: any) => {
        const client = clientMap.get(notif.client_id);
        return {
          id: notif.id,
          type: 'creative_request' as const,
          title: notif.payload?.title || 'Sem título',
          clientName: client?.name || 'Cliente',
          clientEmail: client?.email,
          clientWhatsapp: client?.whatsapp,
          createdAt: notif.created_at,
          status: notif.payload?.job_status || 'pending',
          requestType: notif.payload?.type,
          text: notif.payload?.text,
          caption: notif.payload?.caption,
          observations: notif.payload?.observations,
          referenceFiles: notif.payload?.reference_files || [],
        };
      });

      // Buscar adjustment requests (comments com is_adjustment_request=true nos últimos 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: contentsList } = await supabase
        .from("contents")
        .select("id, title, client_id")
        .in("client_id", clientIds)
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (contentsList && contentsList.length > 0) {
        const contentIds = contentsList.map((c) => c.id);
        const contentMap = new Map(contentsList.map((c) => [c.id, c]));

        const { data: adjustmentComments, error: adjustmentError } = await supabase
          .from("comments")
          .select("*")
          .in("content_id", contentIds)
          .eq("is_adjustment_request", true)
          .order("created_at", { ascending: false });

        if (!adjustmentError && adjustmentComments) {
          const adjustmentRequests: AdjustmentRequestData[] = adjustmentComments.map((comment: any) => {
            const content = contentMap.get(comment.content_id);
            const client = clientMap.get(content?.client_id);
            return {
              id: comment.id,
              type: 'adjustment_request' as const,
              title: `Ajuste: ${content?.title || 'Conteúdo'}`,
              clientName: client?.name || 'Cliente',
              createdAt: comment.created_at,
              contentTitle: content?.title || 'Sem título',
              reason: comment.adjustment_reason || 'Não especificado',
              details: comment.body || '',
              version: comment.version || 1,
            };
          });

          setRequests([...creativeRequests, ...adjustmentRequests]);
        } else {
          setRequests(creativeRequests);
        }
      } else {
        setRequests(creativeRequests);
      }
    } catch (error) {
      console.error("Erro ao carregar solicitações:", error);
    }
  };

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("agency_id", agencyId)
        .order("name", { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    }
  };

  // Filtrar solicitações baseado nos filtros selecionados
  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      // Filtro de tipo
      if (requestTypeFilter === 'creative' && request.type !== 'creative_request') return false;
      if (requestTypeFilter === 'adjustment' && request.type !== 'adjustment_request') return false;
      
      // Filtro de status (apenas para creative requests)
      if (requestStatusFilter !== 'all' && request.type === 'creative_request') {
        const creativeReq = request as CreativeRequestData;
        if (creativeReq.status !== requestStatusFilter) return false;
      }
      
      return true;
    });
  }, [requests, requestTypeFilter, requestStatusFilter]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setIsDraggingCard(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setIsDraggingCard(false);

    if (!over) return;

    const newStatus = over.id as string;
    const contentId = active.id as string;

    // Mapear column_id para status do banco
    // column_id pode ser: 'draft', 'in_review', 'scheduled' (approved), ou custom_*
    let actualStatus = newStatus;
    
    // Se for 'scheduled', mapear para 'approved'
    if (newStatus === 'scheduled') {
      actualStatus = 'approved';
    }
    
    // Se for coluna customizada, manter como draft (pode ser expandido futuramente)
    if (newStatus.startsWith('custom_')) {
      actualStatus = 'draft';
    }

    try {
      const { error } = await supabase
        .from("contents")
        .update({ status: actualStatus as "draft" | "in_review" | "approved" | "changes_requested" })
        .eq("id", contentId);

      if (error) throw error;

      setContents((prev) =>
        prev.map((content) =>
          content.id === contentId
            ? { ...content, status: actualStatus }
            : content
        )
      );

      toast({
        title: "Status atualizado",
        description: "O status do conteúdo foi atualizado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o status.",
      });
    }
  };

  const activeContent = activeId ? contents.find(c => c.id === activeId) : null;

  const handleSendForReview = async (contentId: string, contentTitle: string) => {
    try {
      setSendingForReview(contentId);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase.functions.invoke(
        "send-for-review",
        {
          body: { content_id: contentId },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (error) {
        console.error("Erro da função:", error);
        throw new Error(error.message || "Falha ao enviar para revisão");
      }

      toast({
        title: "Enviado para revisão",
        description: `"${contentTitle}" foi enviado para aprovação do cliente`,
      });

      // Recarregar conteúdos para refletir a mudança
      loadContents();
    } catch (error: any) {
      console.error("Erro ao enviar para revisão:", error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar",
        description: error.message || "Ocorreu um erro inesperado",
      });
    } finally {
      setSendingForReview(null);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      setUploadingFiles(true);
      const uploadedUrls: Array<{ name: string; url: string; size: number; type: string }> = [];
      
      // Inicializar progresso para todos os arquivos
      const initialProgress = Array.from(files).map(file => ({
        fileName: file.name,
        progress: 0,
        status: 'uploading' as const
      }));
      setUploadProgress(initialProgress);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validar tamanho (max 20MB)
        if (file.size > 20 * 1024 * 1024) {
          setUploadProgress(prev => prev.map((p, idx) => 
            idx === i ? { ...p, status: 'error' as const, progress: 0 } : p
          ));
          toast({
            variant: "destructive",
            title: "Arquivo muito grande",
            description: `${file.name} excede o limite de 20MB`,
          });
          continue;
        }

        // Validar tipo
        const allowedTypes = ['image/', 'video/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats'];
        const isAllowed = allowedTypes.some(type => file.type.startsWith(type));
        
        if (!isAllowed) {
          setUploadProgress(prev => prev.map((p, idx) => 
            idx === i ? { ...p, status: 'error' as const, progress: 0 } : p
          ));
          toast({
            variant: "destructive",
            title: "Tipo não permitido",
            description: `${file.name} não é um tipo de arquivo permitido`,
          });
          continue;
        }

        // Simular progresso durante upload
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => prev.map((p, idx) => {
            if (idx === i && p.progress < 90) {
              return { ...p, progress: Math.min(p.progress + 10, 90) };
            }
            return p;
          }));
        }, 100);

        // Upload para Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `creative-requests/${fileName}`;

        const { data, error } = await supabase.storage
          .from('content-media')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        clearInterval(progressInterval);

        if (error) {
          console.error('Erro ao fazer upload:', error);
          setUploadProgress(prev => prev.map((p, idx) => 
            idx === i ? { ...p, status: 'error' as const, progress: 0 } : p
          ));
          toast({
            variant: "destructive",
            title: "Erro no upload",
            description: `Falha ao enviar ${file.name}`,
          });
          continue;
        }

        // Completar progresso
        setUploadProgress(prev => prev.map((p, idx) => 
          idx === i ? { ...p, status: 'completed' as const, progress: 100 } : p
        ));

        // Obter URL pública
        const { data: { publicUrl } } = supabase.storage
          .from('content-media')
          .getPublicUrl(filePath);

        uploadedUrls.push({
          name: file.name,
          url: publicUrl,
          size: file.size,
          type: file.type
        });
      }

      setUploadedFiles(prev => [...prev, ...uploadedUrls]);
      
      // Limpar progresso após 1 segundo
      setTimeout(() => {
        setUploadProgress([]);
      }, 1000);
      
      toast({
        title: "Arquivos enviados",
        description: `${uploadedUrls.length} arquivo(s) adicionado(s)`,
      });
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao processar arquivos",
      });
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCardClick = (contentId: string) => {
    if (!isDraggingCard) {
      setSelectedContentId(contentId);
      setShowDetailsDialog(true);
    }
  };

  const handleArchiveContent = async (contentId: string) => {
    try {
      const { error } = await supabase
        .from("contents")
        .update({ status: 'archived' as any })
        .eq("id", contentId);
        
      if (error) throw error;
      
      toast({
        title: "Conteúdo arquivado",
        description: "O conteúdo foi movido para o arquivo.",
      });
      
      loadContents();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao arquivar",
        description: "Não foi possível arquivar o conteúdo.",
      });
    }
  };

  const handleCreateRequest = async () => {
    try {
      // Validar dados
      const validated = newRequestSchema.parse(newRequest);
      setFormErrors({});
      setCreatingRequest(true);

      // Buscar informações do cliente
      const { data: clientData } = await supabase
        .from("clients")
        .select("name, email, whatsapp")
        .eq("id", validated.client_id)
        .single();

      // Criar notification com evento novojob
      const { error } = await supabase
        .from("notifications")
        .insert({
          event: "novojob",
          agency_id: agencyId,
          client_id: validated.client_id,
          status: "pending",
          payload: {
            title: validated.title,
            type: validated.request_type,
            observations: validated.observations || "",
            job_status: "pending",
            reference_files: uploadedFiles.map(f => f.url),
          },
        });

      if (error) throw error;

      toast({
        title: "Solicitação criada",
        description: `Nova solicitação "${validated.title}" foi adicionada`,
      });

      // Limpar formulário e recarregar
      setNewRequest({
        title: '',
        client_id: '',
        request_type: '',
        observations: '',
      });
      setUploadedFiles([]);
      setShowInlineForm(false);
      loadRequests();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setFormErrors(errors);
      } else {
        console.error("Erro ao criar solicitação:", error);
        toast({
          variant: "destructive",
          title: "Erro ao criar",
          description: error.message || "Ocorreu um erro inesperado",
        });
      }
    } finally {
      setCreatingRequest(false);
    }
  };

  // Drag-to-scroll handlers
  const handleMouseDownScroll = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement)?.closest('[data-kanban-card]')) return;
    if (!kanbanContainerRef.current) return;
    
    setIsScrolling(true);
    setScrollStart({ 
      x: e.pageX - kanbanContainerRef.current.offsetLeft,
      y: e.pageY - kanbanContainerRef.current.offsetTop
    });
    setScrollLeft(kanbanContainerRef.current.scrollLeft);
    
    kanbanContainerRef.current.style.cursor = 'grabbing';
    kanbanContainerRef.current.style.userSelect = 'none';
  };

  const handleMouseMoveScroll = (e: React.MouseEvent) => {
    if (!isScrolling || !kanbanContainerRef.current) return;
    
    e.preventDefault();
    const x = e.pageX - kanbanContainerRef.current.offsetLeft;
    const walk = (x - scrollStart.x) * 2;
    kanbanContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUpScroll = () => {
    setIsScrolling(false);
    
    if (kanbanContainerRef.current) {
      kanbanContainerRef.current.style.cursor = 'grab';
      kanbanContainerRef.current.style.userSelect = 'auto';
    }
  };

  const handleMouseLeaveScroll = () => {
    if (isScrolling) {
      setIsScrolling(false);
      if (kanbanContainerRef.current) {
        kanbanContainerRef.current.style.cursor = 'grab';
        kanbanContainerRef.current.style.userSelect = 'auto';
      }
    }
  };

  return (
    <Card>
      <CardHeader>
         <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle>Kanban de Conteúdos</CardTitle>
            <CardDescription>
              Gerencie o workflow dos conteúdos
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowClientSelector(true)}
              className="gap-2"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Novo Conteúdo
            </Button>
            {/* Indicadores de atalhos */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-xs text-muted-foreground">
                    <Keyboard className="h-3.5 w-3.5" />
                    <span>Atalhos</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="space-y-1 text-xs">
                    <p><kbd className="px-1.5 py-0.5 rounded bg-muted">←→</kbd> Navegar colunas</p>
                    <p><kbd className="px-1.5 py-0.5 rounded bg-muted">↑↓</kbd> Navegar cards</p>
                    <p><kbd className="px-1.5 py-0.5 rounded bg-muted">Enter</kbd> Abrir detalhes</p>
                    <p><kbd className="px-1.5 py-0.5 rounded bg-muted">Del</kbd> Arquivar</p>
                    <p><kbd className="px-1.5 py-0.5 rounded bg-muted">Esc</kbd> Sair</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-xs text-muted-foreground">
                    <Hand className="h-3.5 w-3.5" />
                    <span>Arraste</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p>Clique e arraste para rolar horizontalmente</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Filtros de visualização */}
            <div className="flex flex-wrap gap-2 px-3 py-2 bg-muted/30 rounded-lg">
              <span className="text-xs font-semibold text-muted-foreground self-center">Ocultar:</span>
              
              <div className="flex items-center space-x-1.5">
                <Checkbox
                  id="hide-approved"
                  checked={hideApproved}
                  onCheckedChange={(checked) => setHideApproved(checked as boolean)}
                />
                <Label htmlFor="hide-approved" className="cursor-pointer text-xs font-normal">
                  Aprovados
                </Label>
              </div>

              <div className="flex items-center space-x-1.5">
                <Checkbox
                  id="hide-scheduled"
                  checked={hideScheduled}
                  onCheckedChange={(checked) => setHideScheduled(checked as boolean)}
                />
                <Label htmlFor="hide-scheduled" className="cursor-pointer text-xs font-normal">
                  Agendados
                </Label>
              </div>

              <div className="flex items-center space-x-1.5">
                <Checkbox
                  id="hide-published"
                  checked={hidePublished}
                  onCheckedChange={(checked) => setHidePublished(checked as boolean)}
                />
                <Label htmlFor="hide-published" className="cursor-pointer text-xs font-normal">
                  Publicados
                </Label>
              </div>

              <div className="ml-auto text-xs text-muted-foreground self-center">
                Últimos {historyDays} dias
              </div>
            </div>

            {/* Filtro de data */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "gap-2 text-xs h-9",
                    !dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yy", { locale: ptBR })} -{" "}
                        {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yy", { locale: ptBR })
                    )
                  ) : (
                    <span>Selecionar período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Data Inicial</Label>
                    <CalendarComponent
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Data Final</Label>
                    <CalendarComponent
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                      disabled={(date) => dateRange.from ? date < dateRange.from : false}
                      className="pointer-events-auto"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => {
                        const from = new Date();
                        from.setDate(from.getDate() - 30);
                        setDateRange({ from, to: new Date() });
                      }}
                    >
                      Últimos 30 dias
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => {
                        const from = new Date();
                        from.setDate(from.getDate() - 90);
                        setDateRange({ from, to: new Date() });
                      }}
                    >
                      Últimos 90 dias
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                loadColumns();
                loadContents();
              }}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto kanban-scroll">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : columns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma coluna configurada. Use o botão "Configurar Colunas" para criar suas colunas.
          </div>
        ) : contents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum conteúdo nos últimos 30 dias.
          </div>
        ) : (
          <div 
            ref={kanbanContainerRef}
            className="overflow-x-auto cursor-grab active:cursor-grabbing scroll-smooth"
            onMouseDown={handleMouseDownScroll}
            onMouseMove={handleMouseMoveScroll}
            onMouseUp={handleMouseUpScroll}
            onMouseLeave={handleMouseLeaveScroll}
          >
            <div className="min-w-max pb-4">
              <KanbanProvider onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
              {columns.map((column) => {
                // Mapear column_id para status do banco
                let statusFilter = column.column_id;
                if (column.column_id === 'scheduled') {
                  statusFilter = 'approved'; // "Agendado" mostra conteúdos aprovados
                }
                
                // Coluna de solicitações
                if (column.column_id === 'requests') {
                  return (
                    <KanbanBoard 
                      key={column.column_id} 
                      id={column.column_id}
                      className="w-80"
                    >
                      <KanbanHeader 
                        name={column.column_name} 
                        color={column.column_color} 
                      />
                      <div className="space-y-3 mb-4 px-3">
                        {/* Botão para expandir/recolher formulário */}
                        <Button
                          variant={showInlineForm ? "secondary" : "default"}
                          size="sm"
                          className="w-full gap-2 text-xs h-8"
                          onClick={() => setShowInlineForm(!showInlineForm)}
                        >
                          {showInlineForm ? (
                            <>
                              <ChevronUp className="h-3 w-3" />
                              Cancelar
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3" />
                              Nova Solicitação
                            </>
                          )}
                        </Button>

                        {/* Formulário inline */}
                        {showInlineForm && (
                          <div className="bg-muted/30 border rounded-lg p-3 space-y-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="request-title" className="text-xs">Título *</Label>
                              <Input
                                id="request-title"
                                placeholder="Ex: Arte para post Instagram"
                                value={newRequest.title}
                                onChange={(e) => setNewRequest(prev => ({ ...prev, title: e.target.value }))}
                                className="h-8 text-xs"
                                maxLength={100}
                              />
                              {formErrors.title && (
                                <p className="text-xs text-destructive">{formErrors.title}</p>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="request-client" className="text-xs">Cliente *</Label>
                              <Select 
                                value={newRequest.client_id} 
                                onValueChange={(value) => setNewRequest(prev => ({ ...prev, client_id: value }))}
                              >
                                <SelectTrigger id="request-client" className="h-8 text-xs">
                                  <SelectValue placeholder="Selecione o cliente" />
                                </SelectTrigger>
                                <SelectContent>
                                  {clients.map(client => (
                                    <SelectItem key={client.id} value={client.id}>
                                      {client.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {formErrors.client_id && (
                                <p className="text-xs text-destructive">{formErrors.client_id}</p>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="request-type" className="text-xs">Tipo *</Label>
                              <Select 
                                value={newRequest.request_type} 
                                onValueChange={(value) => setNewRequest(prev => ({ ...prev, request_type: value }))}
                              >
                                <SelectTrigger id="request-type" className="h-8 text-xs">
                                  <SelectValue placeholder="Tipo de solicitação" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="post">Post</SelectItem>
                                  <SelectItem value="story">Story</SelectItem>
                                  <SelectItem value="reels">Reels</SelectItem>
                                  <SelectItem value="carousel">Carrossel</SelectItem>
                                  <SelectItem value="other">Outro</SelectItem>
                                </SelectContent>
                              </Select>
                              {formErrors.request_type && (
                                <p className="text-xs text-destructive">{formErrors.request_type}</p>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="request-obs" className="text-xs">Observações</Label>
                              <Textarea
                                id="request-obs"
                                placeholder="Detalhes adicionais..."
                                value={newRequest.observations}
                                onChange={(e) => setNewRequest(prev => ({ ...prev, observations: e.target.value }))}
                                className="text-xs min-h-16 resize-none"
                                maxLength={500}
                              />
                              {formErrors.observations && (
                                <p className="text-xs text-destructive">{formErrors.observations}</p>
                              )}
                            </div>

                            {/* Área de upload de arquivos */}
                            <div className="space-y-1.5">
                              <Label className="text-xs">Arquivos de Referência</Label>
                              <div
                                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                                  isDragging 
                                    ? 'border-primary bg-primary/5' 
                                    : 'border-muted-foreground/25 hover:border-primary/50'
                                }`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                              >
                                <input
                                  type="file"
                                  id="file-upload"
                                  className="hidden"
                                  multiple
                                  accept="image/*,video/*,.pdf,.doc,.docx"
                                  onChange={(e) => handleFileUpload(e.target.files)}
                                  disabled={uploadingFiles}
                                />
                                <label
                                  htmlFor="file-upload"
                                  className="cursor-pointer flex flex-col items-center gap-2"
                                >
                                  <Upload className="h-6 w-6 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground">
                                    {uploadingFiles ? (
                                      'Enviando...'
                                    ) : (
                                      <>
                                        Arraste arquivos ou <span className="text-primary">clique para selecionar</span>
                                      </>
                                    )}
                                  </p>
                                  <p className="text-xs text-muted-foreground/70">
                                    Imagens, vídeos, PDF (máx 20MB)
                                  </p>
                                </label>
                              </div>
                              
                              {/* Progresso de upload */}
                              {uploadProgress.length > 0 && (
                                <div className="space-y-2 mt-2">
                                  <Label className="text-xs">Enviando arquivos...</Label>
                                  {uploadProgress.map((progress, index) => (
                                    <div key={index} className="space-y-1 p-2 bg-muted/50 rounded-md">
                                      <div className="flex items-center gap-2">
                                        {progress.status === 'uploading' && (
                                          <Loader2 className="h-3 w-3 animate-spin text-primary flex-shrink-0" />
                                        )}
                                        {progress.status === 'completed' && (
                                          <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                                        )}
                                        {progress.status === 'error' && (
                                          <X className="h-3 w-3 text-destructive flex-shrink-0" />
                                        )}
                                        <span className="text-xs truncate flex-1">{progress.fileName}</span>
                                        <span className="text-xs font-medium text-muted-foreground">
                                          {progress.progress}%
                                        </span>
                                      </div>
                                      <Progress value={progress.progress} className="h-1" />
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Preview de arquivos enviados */}
                              {uploadedFiles.length > 0 && (
                                <div className="space-y-2 mt-2">
                                  <Label className="text-xs">Arquivos anexados ({uploadedFiles.length})</Label>
                                  <div className="grid grid-cols-3 gap-2">
                                    {uploadedFiles.map((file, index) => {
                                      const isImage = file.type.startsWith('image/');
                                      return (
                                        <div key={index} className="relative group">
                                          {isImage ? (
                                            <div 
                                              className="aspect-square rounded-md overflow-hidden bg-muted cursor-pointer relative"
                                              onClick={() => setPreviewImage(file.url)}
                                            >
                                              <img 
                                                src={file.url} 
                                                alt={file.name}
                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                              />
                                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                                <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                              </div>
                                              <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  removeFile(index);
                                                }}
                                                className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                              >
                                                <X className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          ) : (
                                            <div className="aspect-square rounded-md bg-muted p-2 flex flex-col items-center justify-center gap-1 relative group">
                                              <FileIcon className="h-6 w-6 text-muted-foreground" />
                                              <span className="text-xs text-center truncate w-full px-1">{file.name}</span>
                                              <span className="text-xs text-muted-foreground">
                                                {(file.size / 1024).toFixed(1)} KB
                                              </span>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeFile(index)}
                                                className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                              >
                                                <X className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>

                            <Button
                              onClick={handleCreateRequest}
                              disabled={creatingRequest || uploadingFiles}
                              className="w-full h-8 text-xs gap-2"
                              size="sm"
                            >
                              {creatingRequest ? (
                                <>Criando...</>
                              ) : uploadingFiles ? (
                                <>Enviando arquivos...</>
                              ) : (
                                <>
                                  <Plus className="h-3 w-3" />
                                  Criar Solicitação
                                </>
                              )}
                            </Button>
                          </div>
                        )}

                        {/* Filtros existentes */}
                        <Select value={requestTypeFilter} onValueChange={(value: any) => setRequestTypeFilter(value)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos os tipos</SelectItem>
                            <SelectItem value="creative">Criativos</SelectItem>
                            <SelectItem value="adjustment">Ajustes</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Select value={requestStatusFilter} onValueChange={(value: any) => setRequestStatusFilter(value)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos os status</SelectItem>
                            <SelectItem value="pending">Pendente</SelectItem>
                            <SelectItem value="in_progress">Em Progresso</SelectItem>
                            <SelectItem value="completed">Concluído</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{filteredRequests.length} de {requests.length}</span>
                          {(requestTypeFilter !== 'all' || requestStatusFilter !== 'all') && (
                            <button 
                              onClick={() => {
                                setRequestTypeFilter('all');
                                setRequestStatusFilter('all');
                              }}
                              className="text-primary hover:underline"
                            >
                              Limpar
                            </button>
                          )}
                        </div>
                      </div>
                      <KanbanCards>
                        {filteredRequests.map((request, index) => (
                          <div key={request.id} className="mb-2">
                            <RequestCard
                              request={{
                                id: request.id,
                                type: request.type,
                                title: request.title,
                                clientName: request.clientName,
                                createdAt: request.createdAt,
                                status: request.type === 'creative_request' ? (request as CreativeRequestData).status : undefined,
                              }}
                              onClick={() => {
                                setSelectedRequest({
                                  type: request.type,
                                  data: request.type === 'creative_request' 
                                    ? {
                                        id: request.id,
                                        clientName: request.clientName,
                                        clientEmail: (request as CreativeRequestData).clientEmail,
                                        clientWhatsapp: (request as CreativeRequestData).clientWhatsapp,
                                        title: request.title,
                                        type: (request as CreativeRequestData).requestType,
                                        text: (request as CreativeRequestData).text,
                                        caption: (request as CreativeRequestData).caption,
                                        observations: (request as CreativeRequestData).observations,
                                        referenceFiles: (request as CreativeRequestData).referenceFiles,
                                        createdAt: request.createdAt,
                                        status: (request as CreativeRequestData).status,
                                      }
                                    : {
                                        id: request.id,
                                        contentTitle: (request as AdjustmentRequestData).contentTitle,
                                        clientName: request.clientName,
                                        reason: (request as AdjustmentRequestData).reason,
                                        details: (request as AdjustmentRequestData).details,
                                        createdAt: request.createdAt,
                                        version: (request as AdjustmentRequestData).version,
                                      }
                                });
                                setShowRequestDialog(true);
                              }}
                            />
                          </div>
                        ))}
                      </KanbanCards>
                    </KanbanBoard>
                  );
                 }

                // Aplicar filtros
                let filteredContents = contents.filter((content) => {
                  // Filtro de status
                  if (column.column_id === 'scheduled') {
                    const isScheduled = content.status === 'approved' && new Date(content.date) > new Date();
                    if (!isScheduled) return false;
                    if (hideScheduled) return false;
                  } else {
                    if (content.status !== statusFilter) return false;
                  }

                  // Filtro de aprovados
                  if (hideApproved && content.status === 'approved' && new Date(content.date) <= new Date()) {
                    return false;
                  }

                  // Filtro de publicados (conteúdos que foram publicados)
                  if (hidePublished && content.status === 'approved' && new Date(content.date) < new Date()) {
                    return false;
                  }

                  return true;
                });

                return (
                  <KanbanBoard 
                    key={column.column_id} 
                    id={column.column_id}
                    className="w-80"
                  >
                    <KanbanHeader 
                      name={column.column_name} 
                      color={column.column_color} 
                    />
                    <KanbanCards>
                      {filteredContents.map((content, index) => {
                        const deadlineStatus = getDeadlineStatus(content.date);
                        const isKeyboardFocused = keyboardNavigationActive && 
                          columns[focusedColumn]?.column_id === column.column_id && 
                          focusedCard === index;
                        
                        return (
                        <KanbanCard
                          key={content.id}
                          id={content.id}
                          name={content.title}
                          parent={column.column_id}
                          index={index}
                          onClick={() => handleCardClick(content.id)}
                          className={cn(
                            "relative cursor-pointer hover:shadow-lg transition-all",
                            deadlineStatus.status === 'overdue' && "border-2 border-destructive bg-gradient-to-br from-destructive/5 to-transparent",
                            deadlineStatus.status === 'urgent' && "border-l-4 border-l-warning",
                            isKeyboardFocused && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                          )}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="m-0 font-medium text-sm truncate">
                                  {content.title}
                                </p>
                                <p className="m-0 text-xs text-muted-foreground truncate">
                                  {content.clients?.name}
                                </p>
                              </div>
                              {content.profiles && (
                                <Avatar className="h-6 w-6 shrink-0">
                                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${content.profiles.name}`} />
                                  <AvatarFallback className="text-xs">
                                    {content.profiles.name?.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {/* Badge de deadline com urgência */}
                                <TooltipProvider delayDuration={200}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge 
                                        variant={deadlineStatus.variant}
                                        className="gap-1 text-xs cursor-help"
                                      >
                                        {(deadlineStatus.status === 'overdue' || deadlineStatus.status === 'urgent') && (
                                          <AlertCircle className="h-3 w-3" />
                                        )}
                                        <Calendar className="h-3 w-3" />
                                        {format(new Date(content.date), "dd/MM", { locale: ptBR })}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      <div className="space-y-1">
                                        <p className="font-semibold">{deadlineStatus.label}</p>
                                        <p>{format(new Date(content.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                                        {deadlineStatus.status !== 'normal' && (
                                          <p className="text-muted-foreground">
                                            {differenceInDays(new Date(content.date), new Date())} dias restantes
                                          </p>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                
                                {/* Indicadores de comentários e anexos */}
                                <div className="flex items-center gap-2">
                                  {content.comments_count !== undefined && content.comments_count > 0 && (
                                    <TooltipProvider delayDuration={200}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="flex items-center gap-0.5 text-xs text-muted-foreground cursor-help hover:text-foreground transition-colors">
                                            <MessageSquare className="h-3 w-3" />
                                            <span>{content.comments_count}</span>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-xs">
                                          <p>
                                            {content.comments_count} {content.comments_count === 1 ? 'comentário' : 'comentários'}
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                  {content.media_count !== undefined && content.media_count > 0 && (
                                    <TooltipProvider delayDuration={200}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="flex items-center gap-0.5 text-xs text-muted-foreground cursor-help hover:text-foreground transition-colors">
                                            <Paperclip className="h-3 w-3" />
                                            <span>{content.media_count}</span>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-xs">
                                          <p>
                                            {content.media_count} {content.media_count === 1 ? 'arquivo anexo' : 'arquivos anexos'}
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {content.type}
                              </Badge>
                            </div>
                            
                            {/* Botão Enviar para Aprovação (apenas para draft) */}
                            {column.column_id === 'draft' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-2 gap-2 text-xs h-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendForReview(content.id, content.title);
                                }}
                                disabled={sendingForReview === content.id}
                              >
                                <Send className="h-3 w-3" />
                                {sendingForReview === content.id ? 'Enviando...' : 'Enviar para Aprovação'}
                              </Button>
                            )}
                          </div>
                        </KanbanCard>
                        );
                      })}
                    </KanbanCards>
                  </KanbanBoard>
                );
              })}
              <DragOverlay dropAnimation={dropAnimation}>
                {activeContent ? (
                  <div className="w-80 bg-card border rounded-lg shadow-2xl p-4 animate-scale-in rotate-3">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="m-0 font-medium text-sm truncate">
                            {activeContent.title}
                          </p>
                          <p className="m-0 text-xs text-muted-foreground truncate">
                            {activeContent.clients?.name}
                          </p>
                        </div>
                        {activeContent.profiles && (
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${activeContent.profiles.name}`} />
                            <AvatarFallback className="text-xs">
                              {activeContent.profiles.name?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(activeContent.date), "dd/MM", { locale: ptBR })}
                          </div>
                          
                          {/* Indicadores de comentários e anexos no overlay */}
                          <div className="flex items-center gap-2">
                            {activeContent.comments_count !== undefined && activeContent.comments_count > 0 && (
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-0.5 text-xs text-muted-foreground cursor-help hover:text-foreground transition-colors">
                                      <MessageSquare className="h-3 w-3" />
                                      <span>{activeContent.comments_count}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    <p>
                                      {activeContent.comments_count} {activeContent.comments_count === 1 ? 'comentário' : 'comentários'}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {activeContent.media_count !== undefined && activeContent.media_count > 0 && (
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-0.5 text-xs text-muted-foreground cursor-help hover:text-foreground transition-colors">
                                      <Paperclip className="h-3 w-3" />
                                      <span>{activeContent.media_count}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    <p>
                                      {activeContent.media_count} {activeContent.media_count === 1 ? 'arquivo anexo' : 'arquivos anexos'}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {activeContent.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </KanbanProvider>
            </div>
          </div>
        )}
      </CardContent>

      {/* Dialog para preview de imagem em tamanho maior */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Preview da Imagem</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="w-full">
              <img 
                src={previewImage} 
                alt="Preview"
                className="w-full h-auto rounded-md"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <RequestDetailsDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
        request={selectedRequest}
        agencyId={agencyId}
      />

      {selectedContentId && (
        <ContentDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          contentId={selectedContentId}
          onUpdate={loadContents}
          isAgencyView={true}
        />
      )}

      {/* Dialog de seleção de cliente para novo conteúdo */}
      <Dialog open={showClientSelector} onOpenChange={setShowClientSelector}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecione o Cliente</DialogTitle>
            <DialogDescription>
              Escolha o cliente para criar o novo conteúdo
            </DialogDescription>
          </DialogHeader>
          <Select
            value={selectedClientId || ""}
            onValueChange={(value) => {
              setSelectedClientId(value);
              setShowClientSelector(false);
              setIsNewContentOpen(true);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um cliente..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DialogContent>
      </Dialog>

      {/* Dialog de criação de conteúdo */}
      {selectedClientId && (
        <Dialog open={isNewContentOpen} onOpenChange={(open) => {
          setIsNewContentOpen(open);
          if (!open) {
            setSelectedClientId(null);
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <CreateContentWrapper
              clientId={selectedClientId}
              onContentCreated={() => {
                setIsNewContentOpen(false);
                setSelectedClientId(null);
                loadContents();
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
