import { useState, useEffect } from 'react';

export interface HistoricalEvent {
  title: string;
  description: string;
  type: 'holiday' | 'historical' | 'curiosity';
  year?: number;
  city?: string;
  state?: string;
}

interface EventsDatabase {
  national: Record<string, HistoricalEvent[]>;
  states: Record<string, Record<string, HistoricalEvent[]>>;
  cities: Record<string, Record<string, Record<string, HistoricalEvent[]>>>;
}

let eventsCache: EventsDatabase | null = null;

export async function loadEventsCache(): Promise<EventsDatabase> {
  if (eventsCache) return eventsCache;
  
  try {
    const response = await fetch('/historical-events.json');
    eventsCache = await response.json();
    return eventsCache;
  } catch (error) {
    console.error('Erro ao carregar cache de eventos:', error);
    return { national: {}, states: {}, cities: {} };
  }
}

export function hasEventsForDate(
  date: Date,
  cities: string[] = [],
  states: string[] = []
): boolean {
  if (!eventsCache) return false;
  
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateKey = `${month}-${day}`;
  
  // Verificar eventos nacionais
  if (eventsCache.national[dateKey]?.length > 0) return true;
  
  // Verificar eventos estaduais
  for (const state of states) {
    if (eventsCache.states[state]?.[dateKey]?.length > 0) return true;
  }
  
  // Verificar eventos municipais
  for (const state of states) {
    for (const city of cities) {
      if (eventsCache.cities[state]?.[city]?.[dateKey]?.length > 0) return true;
    }
  }
  
  return false;
}

export function useHistoricalEvents(
  date: Date,
  cities: string[] = [],
  states: string[] = []
) {
  const [events, setEvents] = useState<HistoricalEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEventsForDate(date, cities, states);
  }, [date, cities.join(','), states.join(',')]);

  const fetchEventsForDate = async (
    date: Date,
    cities: string[],
    states: string[]
  ) => {
    setLoading(true);
    try {
      const cache = await loadEventsCache();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateKey = `${month}-${day}`;
      
      let allEvents: HistoricalEvent[] = [];
      
      // Adicionar eventos nacionais
      allEvents = allEvents.concat(cache.national[dateKey] || []);
      
      // Adicionar eventos estaduais
      states.forEach(state => {
        if (cache.states[state]?.[dateKey]) {
          allEvents = allEvents.concat(cache.states[state][dateKey]);
        }
      });
      
      // Adicionar eventos municipais
      states.forEach(state => {
        cities.forEach(city => {
          if (cache.cities[state]?.[city]?.[dateKey]) {
            allEvents = allEvents.concat(cache.cities[state][city][dateKey]);
          }
        });
      });
      
      setEvents(allEvents);
    } catch (error) {
      console.error('Erro ao buscar eventos históricos:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  return { events, loading };
}
