/**
 * @deprecated Este hook está deprecated. Use useUserData() + filtragem explícita no código.
 * 
 * IMPORTANTE: Este hook carrega lentamente e causa race conditions.
 * Prefira sempre usar useUserData() e validar permissões diretamente no código
 * baseado no role e profile do usuário.
 * 
 * Exemplo correto:
 * ```
 * const { profile, role } = useUserData();
 * if (role === 'super_admin' || role === 'agency_admin') {
 *   // permitir ação
 * }
 * ```
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

type AppRole = 'super_admin' | 'agency_admin' | 'team_member' | 'client_user' | 'approver' | null;
type AppPlan = 'free' | 'creator' | 'eugencia' | 'socialmidia' | 'fullservice' | 'unlimited';

export function usePermissions() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole>(null);
  const [plan, setPlan] = useState<AppPlan>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setPlan('free');
      setLoading(false);
      return;
    }

    const loadRoleAndPlan = async () => {
      try {
        // Buscar role via get_user_role function
        const { data: userRole } = await supabase
          .rpc('get_user_role', { _user_id: user.id });
        
        // Buscar plano do profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', user.id)
          .single();
        
        setRole(userRole as AppRole);
        setPlan((profile?.plan || 'free') as AppPlan);
      } catch (error) {
        console.error('Erro ao carregar role e plano:', error);
        setRole(null);
        setPlan('free');
      } finally {
        setLoading(false);
      }
    };

    loadRoleAndPlan();
  }, [user]);

  // Validação simplificada inline baseada em role
  const can = (action: string): boolean => {
    if (!role) return false;
    
    switch(action) {
      case 'manage_clients':
        return role === 'super_admin' || role === 'agency_admin';
      
      case 'manage_approvers':
        return role === 'super_admin' || role === 'agency_admin';
      
      case 'view_content':
        return true; // Todos roles autenticados podem ver conteúdo
      
      case 'create_content':
        return role === 'super_admin' || role === 'agency_admin' || role === 'team_member';
      
      case 'edit_content':
        return role === 'super_admin' || role === 'agency_admin' || role === 'team_member';
      
      case 'delete_content':
        return role === 'super_admin' || role === 'agency_admin';
      
      case 'approve_content':
        return role === 'approver' || role === 'agency_admin' || role === 'super_admin';
      
      case 'add_comment':
        return true; // Todos roles autenticados podem comentar
      
      case 'view_analytics':
        return role === 'super_admin';
      
      case 'manage_settings':
        return role === 'super_admin' || role === 'agency_admin';
      
      default:
        return false;
    }
  };

  return { role, plan, can, loading };
}
