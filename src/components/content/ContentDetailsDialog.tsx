import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { ContentMedia } from "./ContentMedia";
import { ContentCaption } from "./ContentCaption";
import { ContentComments } from "./ContentComments";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, AlertCircle } from "lucide-react";
import { Facebook, Instagram, Linkedin } from "lucide-react";

interface ContentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  onUpdate: () => void;
  isAgencyView?: boolean;
}

interface Content {
  id: string;
  title: string;
  type: string;
  status: string;
  date: string;
  channels: string[];
  category?: string;
  version: number;
  created_at: string;
  updated_at: string;
}

interface Comment {
  id: string;
  body: string;
  created_at: string;
  is_adjustment_request: boolean;
  profiles?: {
    name: string;
  };
}

const getSocialIcon = (channel: string) => {
  const channelLower = channel.toLowerCase();
  if (channelLower.includes('facebook')) {
    return <Facebook className="h-4 w-4 text-[#1877F2]" />;
  }
  if (channelLower.includes('instagram')) {
    return <Instagram className="h-4 w-4 text-[#E4405F]" />;
  }
  if (channelLower.includes('linkedin')) {
    return <Linkedin className="h-4 w-4 text-[#0A66C2]" />;
  }
  return null;
};

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { variant: "default" | "destructive" | "outline" | "pending" | "success" | "warning", label: string }> = {
    draft: { variant: "outline", label: "Rascunho" },
    in_review: { variant: "pending", label: "Em Revisão" },
    approved: { variant: "success", label: "Aprovado" },
    changes_requested: { variant: "destructive", label: "Ajuste Solicitado" },
    scheduled: { variant: "default", label: "Agendado" },
    published: { variant: "success", label: "Publicado" },
  };

  const config = statusConfig[status] || { variant: "outline" as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const getTypeLabel = (type: string) => {
  const typeMap: Record<string, string> = {
    feed: "Feed",
    story: "Story",
    reels: "Reels",
    carousel: "Carrossel",
  };
  return typeMap[type] || type;
};

export function ContentDetailsDialog({
  open,
  onOpenChange,
  contentId,
  onUpdate,
  isAgencyView = false,
}: ContentDetailsDialogProps) {
  const [content, setContent] = useState<Content | null>(null);
  const [adjustments, setAdjustments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && contentId) {
      loadContentDetails();
    }
  }, [open, contentId]);

  const loadContentDetails = async () => {
    try {
      setLoading(true);

      // Buscar conteúdo principal
      const { data: contentData, error: contentError } = await supabase
        .from("contents")
        .select("*")
        .eq("id", contentId)
        .single();

      if (contentError) throw contentError;
      setContent(contentData);

      // Buscar histórico de ajustes (comentários com is_adjustment_request: true)
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select(`
          *,
          profiles:author_user_id (name)
        `)
        .eq("content_id", contentId)
        .eq("is_adjustment_request", true)
        .order("created_at", { ascending: false });

      if (commentsError) throw commentsError;
      setAdjustments(commentsData || []);
    } catch (error) {
      console.error("Error loading content details:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <span className="text-lg font-semibold">{content?.title || "Carregando..."}</span>
              {content && getStatusBadge(content.status)}
            </div>
            {content && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground font-normal">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(content.date), "dd/MM/yyyy", { locale: ptBR })}
                </div>
                <Badge variant="outline" className="text-xs">
                  {getTypeLabel(content.type)}
                </Badge>
                {content.channels && content.channels.length > 0 && (
                  <div className="flex items-center gap-1">
                    {content.channels.map((channel, idx) => (
                      <span key={idx}>{getSocialIcon(channel)}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : (
            <div className="space-y-6 pb-6">
              {/* Seção de Mídia */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Mídia</h3>
                <ContentMedia contentId={contentId} type={content?.type || "feed"} />
              </div>

              <Separator />

              {/* Seção de Legenda */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Legenda</h3>
                <ContentCaption contentId={contentId} version={content?.version || 1} />
              </div>

              {/* Seção de Histórico de Ajustes */}
              {adjustments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      Histórico de Ajustes
                    </h3>
                    <div className="space-y-3">
                      {adjustments.map((adjustment) => (
                        <div
                          key={adjustment.id}
                          className="p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              {adjustment.profiles?.name || "Cliente"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(adjustment.created_at), "dd/MM/yyyy 'às' HH:mm", {
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                          <p className="text-sm">{adjustment.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Seção de Comentários */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Comentários</h3>
                <ContentComments
                  contentId={contentId}
                  onUpdate={onUpdate}
                  showHistory={true}
                />
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
