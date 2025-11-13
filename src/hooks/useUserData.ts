import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserData {
  profile: {
    id: string;
    name: string;
    agency_id: string | null;
    client_id: string | null;
  } | null;
  role: 'super_admin' | 'agency_admin' | 'team_member' | 'client_user' | 'approver' | null;
  agency: { id: string; name: string; slug: string } | null;
  client: { id: string; name: string; slug: string } | null;
  loading: boolean;
}

export function useUserData(): UserData {
  const { user } = useAuth();
  const [data, setData] = useState<UserData>({
    profile: null,
    role: null,
    agency: null,
    client: null,
    loading: true
  });

  useEffect(() => {
    if (!user) {
      setData({ profile: null, role: null, agency: null, client: null, loading: false });
      return;
    }

    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    try {
      console.log('[useUserData] Loading data for user:', user!.id);
      
      // 1. Buscar profile DIRETO (agency_id e client_id)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, agency_id, client_id')
        .eq('id', user!.id)
        .single();

      if (profileError || !profile) {
        console.error('[useUserData] Profile not found:', profileError);
        setData({ profile: null, role: null, agency: null, client: null, loading: false });
        return;
      }

      console.log('[useUserData] Profile loaded:', profile);

      // 2. Buscar role via RPC
      const { data: userRole, error: roleError } = await supabase
        .rpc('get_user_role', { _user_id: user!.id });

      if (roleError) {
        console.error('[useUserData] Role error:', roleError);
      }

      console.log('[useUserData] Role:', userRole);

      // 3. Buscar agency se tiver agency_id
      let agency = null;
      if (profile?.agency_id) {
        const { data: agencyData, error: agencyError } = await supabase
          .from('agencies')
          .select('id, name, slug')
          .eq('id', profile.agency_id)
          .single();
        
        if (agencyError) {
          console.error('[useUserData] Agency error:', agencyError);
        } else {
          agency = agencyData;
          console.log('[useUserData] Agency loaded:', agency);
        }
      }

      // 4. Buscar client se tiver client_id
      let client = null;
      if (profile?.client_id) {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('id, name, slug')
          .eq('id', profile.client_id)
          .single();
        
        if (clientError) {
          console.error('[useUserData] Client error:', clientError);
        } else {
          client = clientData;
          console.log('[useUserData] Client loaded:', client);
        }
      }

      setData({
        profile,
        role: userRole,
        agency,
        client,
        loading: false
      });

    } catch (error) {
      console.error('[useUserData] Error loading user data:', error);
      setData({ profile: null, role: null, agency: null, client: null, loading: false });
    }
  };

  return data;
}
