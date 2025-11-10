import { useState, useEffect } from 'react';

export interface HistoricalEvent {
  title: string;
  description: string;
  type: 'holiday' | 'historical' | 'curiosity';
  year?: number;
}

export function useHistoricalEvents(date: Date) {
  const [events, setEvents] = useState<HistoricalEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEventsForDate(date);
  }, [date]);

  const fetchEventsForDate = async (date: Date) => {
    setLoading(true);
    try {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateKey = `${month}-${day}`;

      // Tentar buscar do arquivo local
      const response = await fetch('/historical-events.json');
      const data = await response.json();
      
      setEvents(data[dateKey] || []);
    } catch (error) {
      console.error('Erro ao buscar eventos históricos:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  return { events, loading };
}
