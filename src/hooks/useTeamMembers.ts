import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TeamMemberInfo {
  id: string;
  name: string;
  email: string;
}

export function useTeamMembers(agencyId: string | null) {
  const [members, setMembers] = useState<TeamMemberInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) {
      setLoading(false);
      return;
    }
    loadMembers();
  }, [agencyId]);

  async function loadMembers() {
    try {
      setLoading(true);

      // Buscar profiles da agência
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('agency_id', agencyId);

      if (!profiles || profiles.length === 0) {
        setMembers([]);
        return;
      }

      const profileIds = profiles.map(p => p.id);

      // Filtrar apenas team_members
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('user_id', profileIds)
        .eq('role', 'team_member');

      const teamMemberIds = roles?.map(r => r.user_id) || [];

      if (teamMemberIds.length === 0) {
        setMembers([]);
        return;
      }

      // Buscar emails via edge function
      const { data: emailData, error: emailError } = await supabase.functions.invoke('get-user-emails', {
        body: { userIds: teamMemberIds },
      });

      if (emailError) {
        console.error('Erro ao buscar emails:', emailError);
        setMembers([]);
        return;
      }

      const emailMap = new Map<string, string>(
        emailData?.emails?.map((e: { id: string; email: string }) => [e.id, e.email]) || []
      );

      const teamMembersData: TeamMemberInfo[] = profiles
        .filter(p => teamMemberIds.includes(p.id))
        .map(p => ({
          id: p.id,
          name: p.name,
          email: emailMap.get(p.id) || '',
        }))
        .filter(m => m.email !== ''); // Remove membros sem email

      console.log('[TEAM_MEMBERS] Dados finais:', teamMembersData);
      setMembers(teamMembersData);
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }

  return { members, loading, refresh: loadMembers };
}
