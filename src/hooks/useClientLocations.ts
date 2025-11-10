import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCitiesFromClients, getStatesFromClients } from '@/lib/location-utils';

export function useClientLocations(agencyId: string) {
  const [cities, setCities] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (agencyId) {
      loadLocations();
    }
  }, [agencyId]);

  const loadLocations = async () => {
    setLoading(true);
    try {
      // Buscar clientes da agência
      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, address')
        .eq('agency_id', agencyId);

      if (error) throw error;

      if (clients && clients.length > 0) {
        const extractedCities = getCitiesFromClients(clients);
        const extractedStates = getStatesFromClients(clients);
        
        setCities(extractedCities);
        setStates(extractedStates);
      } else {
        setCities([]);
        setStates([]);
      }
    } catch (error) {
      console.error('Erro ao carregar localizações:', error);
      setCities([]);
      setStates([]);
    } finally {
      setLoading(false);
    }
  };

  return { cities, states, loading };
}
