import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TeamMemberInfo {
  id: string;
  name: string;
  email: string;
  functions: string[];
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
      console.log('[TEAM_MEMBERS] Iniciando busca para agencyId:', agencyId);

      // Buscar profiles da agência
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('agency_id', agencyId);

      console.log('[TEAM_MEMBERS] Profiles encontrados:', profiles?.length, profiles);
      
      if (profilesError) {
        console.error('[TEAM_MEMBERS] Erro ao buscar profiles:', profilesError);
        setMembers([]);
        return;
      }

      if (!profiles || profiles.length === 0) {
        console.log('[TEAM_MEMBERS] Nenhum profile encontrado');
        setMembers([]);
        return;
      }

      const profileIds = profiles.map(p => p.id);

      // Filtrar apenas team_members
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('user_id', profileIds)
        .eq('role', 'team_member');

      console.log('[TEAM_MEMBERS] Roles encontradas:', roles?.length, roles);
      
      if (rolesError) {
        console.error('[TEAM_MEMBERS] Erro ao buscar roles:', rolesError);
      }

      const teamMemberIds = roles?.map(r => r.user_id) || [];
      console.log('[TEAM_MEMBERS] IDs de team_members:', teamMemberIds);

      if (teamMemberIds.length === 0) {
        console.log('[TEAM_MEMBERS] Nenhum team_member encontrado');
        setMembers([]);
        return;
      }

      // Buscar emails via edge function
      console.log('[TEAM_MEMBERS] Buscando emails para:', teamMemberIds);
      const { data: emailData, error: emailError } = await supabase.functions.invoke('get-user-emails', {
        body: { userIds: teamMemberIds },
      });

      console.log('[TEAM_MEMBERS] Resposta de emails:', emailData, emailError);

      if (emailError) {
        console.error('[TEAM_MEMBERS] Erro ao buscar emails:', emailError);
        setMembers([]);
        return;
      }

      const emailMap = new Map<string, string>(
        emailData?.emails?.map((e: { id: string; email: string }) => [e.id, e.email]) || []
      );

      // Buscar funções dos membros
      const { data: functionsData } = await supabase
        .from('team_member_functions')
        .select('user_id, function')
        .in('user_id', teamMemberIds);

      // Criar mapa de funções por usuário
      const functionsMap = new Map<string, string[]>();
      functionsData?.forEach((f) => {
        const existing = functionsMap.get(f.user_id) || [];
        functionsMap.set(f.user_id, [...existing, f.function]);
      });

      const teamMembersData: TeamMemberInfo[] = profiles
        .filter(p => teamMemberIds.includes(p.id))
        .map(p => ({
          id: p.id,
          name: p.name,
          email: emailMap.get(p.id) || '',
          functions: functionsMap.get(p.id) || [],
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
