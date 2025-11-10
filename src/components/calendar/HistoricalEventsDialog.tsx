import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHistoricalEvents, HistoricalEvent } from '@/hooks/useHistoricalEvents';
import { Skeleton } from '@/components/ui/skeleton';

interface HistoricalEventsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  onSelectEvent: (event: HistoricalEvent) => void;
}

export function HistoricalEventsDialog({
  open,
  onOpenChange,
  date,
  onSelectEvent
}: HistoricalEventsDialogProps) {
  const { events, loading } = useHistoricalEvents(date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            💡 Dicas de Conteúdo - {format(date, "d 'de' MMMM", { locale: ptBR })}
          </DialogTitle>
          <DialogDescription>
            Datas comemorativas e fatos históricos para inspirar suas publicações
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event, index) => (
              <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <Badge variant={
                      event.type === 'holiday' ? 'default' :
                      event.type === 'historical' ? 'outline' : 'outline'
                    } className="mb-2">
                      {event.type === 'holiday' ? '🎉 Feriado' :
                       event.type === 'historical' ? '📜 História' : '💡 Curiosidade'}
                    </Badge>
                    <h4 className="font-semibold">{event.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {event.description}
                    </p>
                    {event.year && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Ano: {event.year}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onSelectEvent(event)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Usar Ideia
                  </Button>
                </div>
              </Card>
            ))}
            
            {events.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-2">Nenhum evento especial registrado para este dia.</p>
                <p className="text-xs">Mas você ainda pode criar conteúdo original!</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
