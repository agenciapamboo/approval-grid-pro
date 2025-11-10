import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Search, TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useHistoricalEvents, HistoricalEvent } from '@/hooks/useHistoricalEvents';
import { useContentAnalytics } from '@/hooks/useContentAnalytics';
import { useSmartSuggestions } from '@/hooks/useSmartSuggestions';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface HistoricalEventsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  cities?: string[];
  states?: string[];
  regions?: string[];
  clientId?: string | null;
  clientName?: string;
  onSelectEvent: (event: HistoricalEvent) => void;
}

export function HistoricalEventsDialog({
  open,
  onOpenChange,
  date,
  cities = [],
  states = [],
  regions = [],
  clientId = null,
  clientName = '',
  onSelectEvent
}: HistoricalEventsDialogProps) {
  const { events, loading } = useHistoricalEvents(date, cities, states, regions);
  const { analytics, loading: analyticsLoading } = useContentAnalytics(clientId);
  const suggestions = useSmartSuggestions(events, analytics);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'holiday' | 'historical' | 'curiosity'>('all');
  const [locationFilter, setLocationFilter] = useState<'all' | 'national' | 'regional' | 'local'>('all');

  // Filter events
  const filteredEvents = useMemo(() => {
    let filtered = suggestions;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(event => event.type === typeFilter);
    }

    // Location filter
    if (locationFilter === 'national') {
      filtered = filtered.filter(event => !event.city && !event.state && !event.region);
    } else if (locationFilter === 'regional') {
      filtered = filtered.filter(event => event.region && !event.city);
    } else if (locationFilter === 'local') {
      filtered = filtered.filter(event => event.city);
    }

    return filtered;
  }, [suggestions, searchQuery, typeFilter, locationFilter]);

  // Count by type
  const holidayCount = suggestions.filter(e => e.type === 'holiday').length;
  const historicalCount = suggestions.filter(e => e.type === 'historical').length;
  const curiosityCount = suggestions.filter(e => e.type === 'curiosity').length;

  // Count by location
  const nationalCount = suggestions.filter(e => !e.city && !e.state && !e.region).length;
  const regionalCount = suggestions.filter(e => e.region && !e.city).length;
  const localCount = suggestions.filter(e => e.city).length;

  const handleSelectEvent = async (event: HistoricalEvent) => {
    // Save feedback for machine learning
    if (clientId) {
      try {
        await supabase.from('content_suggestions_feedback').insert({
          client_id: clientId,
          event_title: event.title,
          event_type: event.type,
          context: {
            date: date.toISOString(),
            score: (event as any).score || 0,
            reasons: (event as any).reasons || []
          }
        });
      } catch (error) {
        console.error('Error saving feedback:', error);
      }
    }
    
    onSelectEvent(event);
  };

  const generateInsightTip = (analytics: any): string => {
    if (analytics.approvalRate < 60) {
      return 'Suas aprovações estão baixas. Tente usar mais dicas locais e históricas.';
    }
    
    if (analytics.topCategories[0]?.percentage > 80) {
      return 'Você está focado em um tipo de conteúdo. Que tal diversificar?';
    }
    
    if (analytics.topKeywords.some((k: any) => k.keyword.includes('promoção') || k.keyword.includes('promocao'))) {
      return 'Você gosta de promoções! Aproveite datas comerciais para engajar.';
    }
    
    return 'Continue criando conteúdo consistente para melhores resultados!';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            💡 Dicas de Conteúdo - {format(date, "d 'de' MMMM", { locale: ptBR })}
          </DialogTitle>
          <DialogDescription>
            {clientName ? `Sugestões personalizadas para ${clientName}` : 'Datas comemorativas e fatos históricos para inspirar suas publicações'}
          </DialogDescription>
        </DialogHeader>

        {/* Insights Panel */}
        {analytics && !analyticsLoading && (
          <Card className="p-4 bg-accent/20">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Insights do seu conteúdo
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Categoria favorita</p>
                <p className="font-semibold">
                  {analytics.topCategories[0]?.category || 'N/A'}
                </p>
              </div>
              
              <div>
                <p className="text-muted-foreground text-xs">Taxa de aprovação</p>
                <p className="font-semibold text-green-600">
                  {analytics.approvalRate.toFixed(0)}%
                </p>
              </div>
              
              <div>
                <p className="text-muted-foreground text-xs">Conteúdos criados</p>
                <p className="font-semibold">
                  {analytics.totalContents} (6 meses)
                </p>
              </div>
              
              <div>
                <p className="text-muted-foreground text-xs">Tema mais usado</p>
                <p className="font-semibold">
                  {analytics.topKeywords[0]?.keyword || 'N/A'}
                </p>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mt-3 border-t pt-2">
              💡 <strong>Dica:</strong> {generateInsightTip(analytics)}
            </p>
          </Card>
        )}

        {/* Search and Filters */}
        <div className="space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar dicas... (ex: natal, aniversário, profissão)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Type Filters */}
          <div className="flex gap-2 flex-wrap">
            <Badge 
              variant={typeFilter === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setTypeFilter('all')}
            >
              Todos ({suggestions.length})
            </Badge>
            <Badge 
              variant={typeFilter === 'holiday' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setTypeFilter('holiday')}
            >
              🎉 Feriados ({holidayCount})
            </Badge>
            <Badge 
              variant={typeFilter === 'historical' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setTypeFilter('historical')}
            >
              📜 História ({historicalCount})
            </Badge>
            <Badge 
              variant={typeFilter === 'curiosity' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setTypeFilter('curiosity')}
            >
              💡 Curiosidades ({curiosityCount})
            </Badge>
          </div>

          {/* Location Filters */}
          <div className="flex gap-2 flex-wrap">
            <Badge 
              variant={locationFilter === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setLocationFilter('all')}
            >
              Todas Localizações
            </Badge>
            <Badge 
              variant={locationFilter === 'national' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setLocationFilter('national')}
            >
              🇧🇷 Nacional ({nationalCount})
            </Badge>
            <Badge 
              variant={locationFilter === 'regional' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setLocationFilter('regional')}
            >
              📍 Regional ({regionalCount})
            </Badge>
            <Badge 
              variant={locationFilter === 'local' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setLocationFilter('local')}
            >
              🏙️ Local ({localCount})
            </Badge>
          </div>
        </div>
        
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
            {filteredEvents.map((event, index) => (
              <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex gap-2 mb-2">
                      <Badge variant={
                        event.type === 'holiday' ? 'default' :
                        event.type === 'historical' ? 'outline' : 'outline'
                      }>
                        {event.type === 'holiday' ? '🎉 Feriado' :
                         event.type === 'historical' ? '📜 História' : '💡 Curiosidade'}
                      </Badge>
                      {/* Badge de localização */}
                      {(event.city || event.state || event.region) && (
                        <Badge variant="outline" className="text-xs">
                          {event.city && event.state ? `${event.city} - ${event.state}` :
                           event.state ? `${event.state}${event.region ? ` (${event.region})` : ''}` :
                           event.region ? `Região ${event.region}` :
                           '🇧🇷 Nacional'}
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-semibold">{event.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {event.description}
                    </p>
                    {event.year && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Ano: {event.year}
                      </p>
                    )}

                    {/* Recommendation Reasons */}
                    {event.reasons && event.reasons.length > 0 && (
                      <div className="mt-2 flex gap-1 flex-wrap">
                        {event.reasons.slice(0, 2).map((reason, i) => (
                          <span key={i} className="text-xs text-muted-foreground bg-accent px-2 py-0.5 rounded">
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSelectEvent(event)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Usar Ideia
                  </Button>
                </div>
              </Card>
            ))}
            
            {filteredEvents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-2">
                  {searchQuery || typeFilter !== 'all' || locationFilter !== 'all' 
                    ? 'Nenhuma dica encontrada com os filtros selecionados.'
                    : 'Nenhum evento especial registrado para este dia.'}
                </p>
                <p className="text-xs">
                  {searchQuery || typeFilter !== 'all' || locationFilter !== 'all'
                    ? 'Tente ajustar os filtros.'
                    : 'Mas você ainda pode criar conteúdo original!'}
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
