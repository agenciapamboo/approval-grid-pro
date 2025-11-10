import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCitiesFromClients, getStatesFromClients, getRegionsFromClients } from '@/lib/location-utils';

export function useClientLocations(agencyId: string) {
  const [cities, setCities] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
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
        const extractedRegions = getRegionsFromClients(clients);
        
        setCities(extractedCities);
        setStates(extractedStates);
        setRegions(extractedRegions);
      } else {
        setCities([]);
        setStates([]);
        setRegions([]);
      }
    } catch (error) {
      console.error('Erro ao carregar localizações:', error);
      setCities([]);
      setStates([]);
      setRegions([]);
    } finally {
      setLoading(false);
    }
  };

  return { cities, states, regions, loading };
}
