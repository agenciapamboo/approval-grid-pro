import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, FileText, Image as ImageIcon, MessageSquare, Users, Upload, Send, CheckCircle, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { toast as sonnerToast } from "sonner";
import { useStorageUrl } from "@/hooks/useStorageUrl";

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
  const [currentStatus, setCurrentStatus] = useState("pending");
  const [isUploading, setIsUploading] = useState(false);
  const [isMarkingDone, setIsMarkingDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const creativeFileInputRef = useRef<HTMLInputElement>(null);
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>([]);

  useEffect(() => {
    if (open && request?.type === 'creative_request') {
      const data = request.data as CreativeRequest;
      setCurrentStatus(data.status || "pending");
      
      if (agencyId) {
        loadTeamMembers();
        loadCurrentAssignee();
      }
      
      // Carregar URLs das imagens de referência
      if (data.referenceFiles && data.referenceFiles.length > 0) {
        const urls = data.referenceFiles.map(path => {
          const { data: urlData } = supabase.storage
            .from('content-media')
            .getPublicUrl(path);
          return urlData.publicUrl;
        });
        setReferenceImageUrls(urls);
      } else {
        setReferenceImageUrls([]);
      }
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

  const handleStatusChange = async (newStatus: string) => {
    if (!request || request.type !== 'creative_request') return;

    setIsUpdating(true);
    try {
      const { data: currentNotif, error: fetchError } = await supabase
        .from('notifications')
        .select('payload')
        .eq('id', request.data.id)
        .single();

      if (fetchError) throw fetchError;

      const currentPayload = (currentNotif?.payload || {}) as Record<string, any>;
      
      const updatedPayload = {
        ...currentPayload,
        status: newStatus,
      };

      const { error: updateError } = await supabase
        .from('notifications')
        .update({ 
          payload: updatedPayload,
          status: newStatus === 'completed' ? 'completed' : 'pending'
        })
        .eq('id', request.data.id);

      if (updateError) throw updateError;

      setCurrentStatus(newStatus);
      sonnerToast.success("Status atualizado!");
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      sonnerToast.error("Não foi possível atualizar o status.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUploadCreative = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !request || request.type !== 'creative_request') return;

    setIsUploading(true);
    try {
      const data = request.data as CreativeRequest;
      const fileExt = file.name.split('.').pop();
      const fileName = `creative-requests/${request.data.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('content-media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: currentNotif } = await supabase
        .from('notifications')
        .select('payload')
        .eq('id', request.data.id)
        .single();

      const currentPayload = (currentNotif?.payload || {}) as Record<string, any>;
      const files = currentPayload.developed_files || [];
      files.push(fileName);

      const { error: updateError } = await supabase
        .from('notifications')
        .update({ 
          payload: { ...currentPayload, developed_files: files }
        })
        .eq('id', request.data.id);

      if (updateError) throw updateError;

      sonnerToast.success("Criativo enviado com sucesso!");
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      sonnerToast.error("Erro ao enviar criativo: " + error.message);
    } finally {
      setIsUploading(false);
      if (creativeFileInputRef.current) {
        creativeFileInputRef.current.value = "";
      }
    }
  };

  const handleSendToReview = async () => {
    if (!request || request.type !== 'creative_request') return;

    setIsUpdating(true);
    try {
      const data = request.data as CreativeRequest;
      const { data: currentNotif } = await supabase
        .from('notifications')
        .select('payload, client_id')
        .eq('id', request.data.id)
        .single();

      if (!currentNotif) throw new Error("Solicitação não encontrada");

      const payload = currentNotif.payload as Record<string, any>;
      const developedFiles = payload.developed_files || [];

      if (developedFiles.length === 0) {
        sonnerToast.error("Faça upload do criativo antes de enviar para revisão");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Criar conteúdo
      const { data: newContent, error: contentError } = await supabase
        .from('contents')
        .insert([{
          title: data.title,
          type: data.type.toLowerCase() as any,
          client_id: currentNotif.client_id!,
          owner_user_id: user.id,
          status: 'in_review' as any,
          date: new Date().toISOString(),
          channels: ['Instagram'],
        }])
        .select()
        .single();

      if (contentError) throw contentError;

      // Adicionar mídia
      for (let i = 0; i < developedFiles.length; i++) {
        const isVideo = developedFiles[i].match(/\.(mp4|mov|avi)$/i);
        await supabase
          .from('content_media')
          .insert({
            content_id: newContent.id,
            src_url: developedFiles[i],
            kind: isVideo ? 'video' : 'image',
            order_index: i,
          });
      }

      // Adicionar legenda se houver
      if (data.caption) {
        await supabase
          .from('content_texts')
          .insert({
            content_id: newContent.id,
            caption: data.caption,
            version: 1,
          });
      }

      // Atualizar notificação
      await supabase
        .from('notifications')
        .update({ status: 'completed' })
        .eq('id', request.data.id);

      sonnerToast.success("Conteúdo criado e enviado para revisão!");
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao criar conteúdo:', error);
      sonnerToast.error("Erro ao criar conteúdo: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUploadCorrectedMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !request || request.type !== 'adjustment_request') return;

    setIsUploading(true);
    try {
      const data = request.data as AdjustmentRequest;
      const { data: notifData } = await supabase
        .from('notifications')
        .select('content_id')
        .eq('id', request.data.id)
        .single();

      if (!notifData?.content_id) throw new Error("Conteúdo não encontrado");

      const fileExt = file.name.split('.').pop();
      const fileName = `${notifData.content_id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('content-media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const isVideo = file.type.startsWith('video/');

      const { data: mediaData } = await supabase
        .from('content_media')
        .select('*')
        .eq('content_id', notifData.content_id)
        .order('order_index')
        .limit(1)
        .single();

      if (mediaData) {
        await supabase
          .from('content_media')
          .update({
            src_url: fileName,
            kind: isVideo ? 'video' : 'image',
          })
          .eq('id', mediaData.id);
      } else {
        await supabase
          .from('content_media')
          .insert({
            content_id: notifData.content_id,
            src_url: fileName,
            kind: isVideo ? 'video' : 'image',
            order_index: 0,
          });
      }

      sonnerToast.success("Mídia corrigida enviada!");
    } catch (error: any) {
      console.error('Erro ao enviar mídia:', error);
      sonnerToast.error("Erro ao enviar mídia: " + error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleMarkAdjustmentDone = async () => {
    if (!request || request.type !== 'adjustment_request') return;

    setIsMarkingDone(true);
    try {
      const { data: notifData } = await supabase
        .from('notifications')
        .select('content_id')
        .eq('id', request.data.id)
        .single();

      if (!notifData?.content_id) throw new Error("Conteúdo não encontrado");

      const { error: updateError } = await supabase
        .from('contents')
        .update({ status: 'in_review' })
        .eq('id', notifData.content_id);

      if (updateError) throw updateError;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('comments')
          .insert({
            content_id: notifData.content_id,
            body: 'Ajuste realizado e enviado para nova revisão',
            author_user_id: user.id,
            version: 1,
          });
      }

      await supabase
        .from('notifications')
        .update({ status: 'completed' })
        .eq('id', request.data.id);

      sonnerToast.success("Ajuste marcado como concluído!");
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao marcar ajuste:', error);
      sonnerToast.error("Erro ao marcar ajuste: " + error.message);
    } finally {
      setIsMarkingDone(false);
    }
  };

  if (!request) return null;

  const renderCreativeRequest = (data: CreativeRequest) => {
    const statusVariants: Record<string, { variant: "default" | "pending" | "destructive" | "success" | "warning", label: string }> = {
      pending: { variant: "warning", label: "Pendente" },
      reviewing: { variant: "pending", label: "Em Revisão" },
      in_production: { variant: "default", label: "Em Produção" },
      review_ready: { variant: "success", label: "Pronto para Revisão" },
      completed: { variant: "success", label: "Finalizado" },
    };
    const statusConfig = statusVariants[currentStatus] || statusVariants.pending;

    const statusOptions = [
      { value: 'pending', label: 'Pendente' },
      { value: 'in_production', label: 'Em Produção' },
      { value: 'review_ready', label: 'Pronto para Revisão' },
      { value: 'completed', label: 'Finalizado' },
    ];

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

          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Status do Trabalho
            </h4>
            <Select
              value={currentStatus}
              onValueChange={handleStatusChange}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          {referenceImageUrls.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Referências ({referenceImageUrls.length})
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {referenceImageUrls.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={url}
                      alt={`Referência ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-border hover:border-primary transition-colors cursor-pointer"
                      onClick={() => window.open(url, '_blank')}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors" />
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

          <Separator />

          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Entregar Criativo</h4>
            
            <input
              ref={creativeFileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleUploadCreative}
            />
            
            <Button 
              onClick={() => creativeFileInputRef.current?.click()}
              variant="outline"
              className="w-full"
              disabled={isUploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? "Enviando..." : "Upload do Criativo Desenvolvido"}
            </Button>
            
            {currentStatus === 'review_ready' && (
              <Button 
                onClick={handleSendToReview}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isUpdating}
              >
                <Send className="mr-2 h-4 w-4" />
                {isUpdating ? "Processando..." : "Criar Conteúdo e Enviar para Revisão"}
              </Button>
            )}
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

          <Separator />

          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Ações</h4>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleUploadCorrectedMedia}
            />
            
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              variant="outline" 
              className="w-full"
              disabled={isUploading}
            >
              <ImagePlus className="mr-2 h-4 w-4" />
              {isUploading ? "Enviando..." : "Adicionar Imagem Corrigida"}
            </Button>
            
            <Button 
              onClick={handleMarkAdjustmentDone}
              disabled={isMarkingDone}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {isMarkingDone ? "Processando..." : "Marcar Ajuste Concluído"}
            </Button>
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
