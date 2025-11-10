import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, FileText, Image as ImageIcon, MessageSquare, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

interface CreativeRequest {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientWhatsapp?: string;
  title: string;
  type: string;
  text?: string;
  caption?: string;
  observations?: string;
  referenceFiles?: string[];
  createdAt: string;
  status?: string;
}

interface AdjustmentRequest {
  id: string;
  contentTitle: string;
  clientName: string;
  reason: string;
  details: string;
  createdAt: string;
  version: number;
}

interface RequestDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: {
    type: 'creative_request' | 'adjustment_request';
    data: CreativeRequest | AdjustmentRequest;
  } | null;
  agencyId?: string;
}

interface TeamMember {
  id: string;
  name: string;
}

export function RequestDetailsDialog({ open, onOpenChange, request, agencyId }: RequestDetailsDialogProps) {
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (open && request?.type === 'creative_request' && agencyId) {
      loadTeamMembers();
      loadCurrentAssignee();
    }
  }, [open, request, agencyId]);

  const loadTeamMembers = async () => {
    if (!agencyId) return;

    try {
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'team_member');

      if (roleError) throw roleError;

      const userIds = roleData?.map(r => r.user_id) || [];

      if (userIds.length === 0) {
        setTeamMembers([]);
        return;
      }

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('agency_id', agencyId)
        .in('id', userIds);

      if (profileError) throw profileError;

      setTeamMembers((profiles as TeamMember[]) || []);
    } catch (error) {
      console.error('Erro ao carregar membros da equipe:', error);
    }
  };

  const loadCurrentAssignee = () => {
    if (request?.type === 'creative_request') {
      const data = request.data as CreativeRequest;
      const payload = (data as any).payload;
      if (payload?.assignee_user_id) {
        setSelectedAssignee(payload.assignee_user_id);
      } else {
        setSelectedAssignee("");
      }
    }
  };

  const handleAssigneeChange = async (userId: string) => {
    if (!request || request.type !== 'creative_request') return;

    setIsUpdating(true);
    try {
      const memberName = teamMembers.find(m => m.id === userId)?.name || "";
      
      const { data: currentNotif, error: fetchError } = await supabase
        .from('notifications')
        .select('payload')
        .eq('id', request.data.id)
        .single();

      if (fetchError) throw fetchError;

      const currentPayload = (currentNotif?.payload || {}) as Record<string, any>;
      
      const updatedPayload = {
        ...currentPayload,
        assignee_user_id: userId,
        assignee_name: memberName,
      };

      const { error: updateError } = await supabase
        .from('notifications')
        .update({ payload: updatedPayload })
        .eq('id', request.data.id);

      if (updateError) throw updateError;

      setSelectedAssignee(userId);
      toast({
        title: "Responsável atribuído",
        description: `${memberName} foi definido como responsável.`,
      });
    } catch (error) {
      console.error('Erro ao atribuir responsável:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atribuir o responsável.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!request) return null;

  const renderCreativeRequest = (data: CreativeRequest) => {
    const statusVariants: Record<string, { variant: "default" | "pending" | "destructive" | "success" | "warning", label: string }> = {
      pending: { variant: "warning", label: "Pendente" },
      reviewing: { variant: "pending", label: "Em Revisão" },
      in_production: { variant: "default", label: "Em Produção" },
      completed: { variant: "success", label: "Finalizado" },
    };
    const statusConfig = statusVariants[data.status || "pending"] || statusVariants.pending;

    return (
      <ScrollArea className="max-h-[60vh]">
        <div className="space-y-4 pr-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Solicitação de Criativo</h3>
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </div>

          {teamMembers.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Responsável
              </h4>
              <Select
                value={selectedAssignee}
                onValueChange={handleAssigneeChange}
                disabled={isUpdating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um responsável..." />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Cliente
            </h4>
            <p className="text-sm">{data.clientName}</p>
            {data.clientEmail && <p className="text-sm text-muted-foreground">{data.clientEmail}</p>}
            {data.clientWhatsapp && <p className="text-sm text-muted-foreground">{data.clientWhatsapp}</p>}
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold text-sm mb-2">Título</h4>
            <p className="text-sm">{data.title}</p>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Tipo</h4>
            <p className="text-sm">{data.type}</p>
          </div>

          {data.text && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Texto
              </h4>
              <p className="text-sm whitespace-pre-wrap">{data.text}</p>
            </div>
          )}

          {data.caption && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Legenda</h4>
              <p className="text-sm whitespace-pre-wrap">{data.caption}</p>
            </div>
          )}

          {data.observations && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Observações</h4>
              <p className="text-sm whitespace-pre-wrap">{data.observations}</p>
            </div>
          )}

          {data.referenceFiles && data.referenceFiles.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Arquivos de Referência ({data.referenceFiles.length})
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {data.referenceFiles.map((file, index) => (
                  <div key={index} className="border rounded-lg p-2 bg-muted/50">
                    {file.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img src={file} alt={`Referência ${index + 1}`} className="w-full h-32 object-cover rounded" />
                    ) : (
                      <a href={file} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Ver arquivo {index + 1}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data da Solicitação
            </h4>
            <p className="text-sm">{format(new Date(data.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </div>
        </div>
      </ScrollArea>
    );
  };

  const renderAdjustmentRequest = (data: AdjustmentRequest) => {
    return (
      <ScrollArea className="max-h-[60vh]">
        <div className="space-y-4 pr-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Solicitação de Ajuste</h3>
            <Badge variant="destructive">Ajuste Necessário</Badge>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Cliente
            </h4>
            <p className="text-sm">{data.clientName}</p>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold text-sm mb-2">Conteúdo</h4>
            <p className="text-sm">{data.contentTitle}</p>
            <p className="text-xs text-muted-foreground mt-1">Versão: {data.version}</p>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Motivo do Ajuste</h4>
            <p className="text-sm whitespace-pre-wrap">{data.reason}</p>
          </div>

          {data.details && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Detalhes</h4>
              <p className="text-sm whitespace-pre-wrap">{data.details}</p>
            </div>
          )}

          <Separator />

          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data da Solicitação
            </h4>
            <p className="text-sm">{format(new Date(data.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </div>
        </div>
      </ScrollArea>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes da Solicitação</DialogTitle>
          <DialogDescription>
            {request.type === 'creative_request' 
              ? 'Informações completas do briefing solicitado pelo cliente'
              : 'Detalhes do ajuste solicitado pelo cliente'
            }
          </DialogDescription>
        </DialogHeader>
        {request.type === 'creative_request' 
          ? renderCreativeRequest(request.data as CreativeRequest)
          : renderAdjustmentRequest(request.data as AdjustmentRequest)
        }
      </DialogContent>
    </Dialog>
  );
}
