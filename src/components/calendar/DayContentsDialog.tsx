import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, FileText, Wrench, Clipboard } from "lucide-react";

interface Content {
  id: string;
  title: string;
  date: string;
  status: string;
  type: string;
  client_id: string;
  clients?: { name: string };
  itemType?: 'content' | 'creative_request' | 'adjustment_request';
}

interface DayContentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  contents: Content[];
  clientColors: Record<string, string>;
  onContentClick: (contentId: string) => void;
}

export function DayContentsDialog({ 
  open, 
  onOpenChange, 
  date, 
  contents, 
  clientColors, 
  onContentClick 
}: DayContentsDialogProps) {
  const sortedContents = [...contents].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            Conteúdos de {format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {contents.length} {contents.length === 1 ? 'conteúdo agendado' : 'conteúdos agendados'}
          </p>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-3">
            {sortedContents.map((content) => {
              const isRequest = content.itemType === 'creative_request' || content.itemType === 'adjustment_request';
              
              return (
                <Card
                  key={content.id}
                  className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => {
                    onContentClick(content.id);
                    onOpenChange(false);
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Barra lateral colorida por cliente */}
                    <div 
                      className="w-1 h-full rounded-full flex-shrink-0"
                      style={{ backgroundColor: clientColors[content.client_id] || '#6B7280' }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {content.itemType === 'creative_request' && (
                              <Clipboard className="h-4 w-4 flex-shrink-0" />
                            )}
                            {content.itemType === 'adjustment_request' && (
                              <Wrench className="h-4 w-4 flex-shrink-0" />
                            )}
                            <h4 className="font-semibold text-sm truncate">
                              {content.title}
                            </h4>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {content.itemType === 'content' && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{format(new Date(content.date), 'HH:mm')}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              <span>{content.clients?.name || 'Cliente não especificado'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <Badge 
                            variant={
                              content.status === 'published' ? 'default' :
                              content.status === 'pending' ? 'warning' :
                              'outline'
                            }
                            className="text-xs"
                          >
                            {content.status === 'published' ? 'Publicado' :
                             content.status === 'pending' ? 'Pendente' :
                             content.status === 'approved' ? 'Aprovado' :
                             content.status}
                          </Badge>
                          
                          {isRequest && (
                            <Badge variant="outline" className="text-xs ring-1 ring-yellow-500">
                              {content.itemType === 'creative_request' ? 'Solicitação' : 'Ajuste'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
