import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPermissions({});
      setLoading(false);
      return;
    }

    const loadPermissions = async () => {
      try {
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (!userRoles || userRoles.length === 0) {
          setPermissions({});
          setLoading(false);
          return;
        }

        const role = userRoles[0].role;

        const { data: rolePerms } = await supabase
          .from('role_permissions')
          .select('permission_key, enabled')
          .eq('role', role);

        const permsMap: Record<string, boolean> = {};
        (rolePerms || []).forEach(p => {
          permsMap[p.permission_key] = p.enabled;
        });

        setPermissions(permsMap);
      } catch (error) {
        console.error('Erro ao carregar permissões:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [user]);

  const hasPermission = (key: string): boolean => {
    return permissions[key] === true;
  };

  return { permissions, hasPermission, loading };
}
