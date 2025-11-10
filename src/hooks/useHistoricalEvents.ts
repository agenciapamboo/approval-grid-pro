import { useState, useEffect } from 'react';

export interface HistoricalEvent {
  title: string;
  description: string;
  type: 'holiday' | 'historical' | 'curiosity';
  year?: number;
  city?: string;
  state?: string;
  region?: string;
}

interface EventsDatabase {
  national: Record<string, HistoricalEvent[]>;
  regions: Record<string, Record<string, Record<string, HistoricalEvent[]>>>;
  states: Record<string, Record<string, HistoricalEvent[]>>;
  cities: Record<string, Record<string, Record<string, Record<string, HistoricalEvent[]>>>>;
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
    return { national: {}, regions: {}, states: {}, cities: {} };
  }
}

export function hasEventsForDate(
  date: Date,
  cities: string[] = [],
  states: string[] = [],
  regions: string[] = []
): boolean {
  if (!eventsCache || !eventsCache.national) return false;
  
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateKey = `${month}-${day}`;
  
  // Verificar eventos nacionais
  if (eventsCache.national[dateKey]?.length > 0) return true;
  
  // Verificar eventos regionais
  for (const region of regions) {
    for (const state of states) {
      if (eventsCache.regions?.[region]?.[state]?.[dateKey]?.length > 0) return true;
    }
  }
  
  // Verificar eventos estaduais
  for (const state of states) {
    if (eventsCache.states?.[state]?.[dateKey]?.length > 0) return true;
  }
  
  // Verificar eventos municipais
  for (const region of regions) {
    for (const state of states) {
      for (const city of cities) {
        if (eventsCache.cities?.[region]?.[state]?.[city]?.[dateKey]?.length > 0) return true;
      }
    }
  }
  
  return false;
}

export function useHistoricalEvents(
  date: Date,
  cities: string[] = [],
  states: string[] = [],
  regions: string[] = []
) {
  const [events, setEvents] = useState<HistoricalEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEventsForDate(date, cities, states, regions);
  }, [date, cities.join(','), states.join(','), regions.join(',')]);

  const fetchEventsForDate = async (
    date: Date,
    cities: string[],
    states: string[],
    regions: string[]
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
      
      // Adicionar eventos regionais
      regions.forEach(region => {
        states.forEach(state => {
          if (cache.regions?.[region]?.[state]?.[dateKey]) {
            allEvents = allEvents.concat(cache.regions[region][state][dateKey]);
          }
        });
      });
      
      // Adicionar eventos estaduais
      states.forEach(state => {
        if (cache.states?.[state]?.[dateKey]) {
          allEvents = allEvents.concat(cache.states[state][dateKey]);
        }
      });
      
      // Adicionar eventos municipais
      regions.forEach(region => {
        states.forEach(state => {
          cities.forEach(city => {
            if (cache.cities?.[region]?.[state]?.[city]?.[dateKey]) {
              allEvents = allEvents.concat(cache.cities[region][state][city][dateKey]);
            }
          });
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
