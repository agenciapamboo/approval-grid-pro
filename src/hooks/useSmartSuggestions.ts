import { useMemo } from 'react';
import { HistoricalEvent } from './useHistoricalEvents';
import { ContentAnalytics } from './useContentAnalytics';

export interface ScoredEvent extends HistoricalEvent {
  score: number;
  reasons: string[];
}

export function useSmartSuggestions(
  events: HistoricalEvent[],
  analytics: ContentAnalytics | null
): ScoredEvent[] {
  return useMemo(() => {
    if (!analytics) {
      return events.map(e => ({ ...e, score: 0, reasons: [] }));
    }

    // Calculate relevance score for each event
    const scoredEvents = events.map(event => {
      let score = 0;
      const reasons: string[] = [];

      // 1. Check if event was already used (penalize)
      const alreadyUsed = analytics.usedHistoricalEvents.some(used => 
        used.toLowerCase().includes(event.title.toLowerCase().substring(0, 15))
      );
      
      if (alreadyUsed) {
        score -= 50;
        reasons.push('Já utilizado anteriormente');
      } else {
        score += 20;
        reasons.push('Dica inédita');
      }

      // 2. Check correlation with history keywords
      const eventWords = event.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .split(/\s+/);
      
      const matchingKeywords = analytics.topKeywords.filter(kw => 
        eventWords.some(word => word.includes(kw.keyword) || kw.keyword.includes(word))
      );
      
      if (matchingKeywords.length > 0) {
        score += matchingKeywords.length * 15;
        reasons.push(`Tema recorrente: ${matchingKeywords.slice(0, 2).map(k => k.keyword).join(', ')}`);
      }

      // 3. Prioritize local events (city/state)
      if (event.city) {
        score += 30;
        reasons.push('Evento local relevante');
      } else if (event.state) {
        score += 20;
        reasons.push('Evento regional');
      } else if (event.region) {
        score += 10;
        reasons.push('Evento da sua região');
      }

      // 4. Prioritize most used content type
      if (analytics.contentTypes.length > 0) {
        const mostUsedType = analytics.contentTypes[0].type;
        if (event.type === 'holiday' && mostUsedType === 'social') {
          score += 15;
          reasons.push('Alinhado com seu estilo');
        }
      }

      // 5. Bonus for events with year (historical have more context)
      if (event.year) {
        score += 5;
        reasons.push('Evento com contexto histórico');
      }

      // 6. Diversity: prioritize types client uses less
      if (analytics.topCategories.length > 1) {
        const leastUsedCategory = analytics.topCategories[analytics.topCategories.length - 1]?.category;
        if (event.type === 'curiosity' && leastUsedCategory === 'avulso') {
          score += 10;
          reasons.push('Sugestão para diversificar');
        }
      }

      // 7. High approval rate correlation
      if (analytics.approvalRate > 70 && event.type === 'holiday') {
        score += 8;
        reasons.push('Alta taxa de aprovação neste tipo');
      }

      return {
        ...event,
        score,
        reasons
      };
    });

    // Sort by score (highest first)
    return scoredEvents.sort((a, b) => b.score - a.score);

  }, [events, analytics]);
}
