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
        console.log('🔐 [usePermissions] Loading permissions for user:', user.id);
        
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        console.log('👤 [usePermissions] User roles:', userRoles);

        if (!userRoles || userRoles.length === 0) {
          console.warn('⚠️ [usePermissions] No roles found for user');
          setPermissions({});
          setLoading(false);
          return;
        }

        // Buscar permissões de TODOS os roles do usuário (não apenas o primeiro)
        const allRoles = userRoles.map(ur => ur.role);
        
        console.log('📋 [usePermissions] Fetching permissions for roles:', allRoles);

        const { data: rolePerms, error } = await supabase
          .from('role_permissions')
          .select('permission_key, enabled, role')
          .in('role', allRoles);

        console.log('📋 [usePermissions] Role permissions from DB:', rolePerms);

        if (error) {
          console.error('❌ [usePermissions] Error fetching role permissions:', error);
        }

        // Mesclar permissões: se QUALQUER role tiver a permissão habilitada, ela está disponível
        const permsMap: Record<string, boolean> = {};
        (rolePerms || []).forEach(p => {
          // Se a permissão já está true, mantém true
          // Se está false ou undefined, só vira true se a permissão atual for true
          if (p.enabled) {
            permsMap[p.permission_key] = true;
          } else if (permsMap[p.permission_key] === undefined) {
            permsMap[p.permission_key] = false;
          }
        });

        console.log('✅ [usePermissions] Final merged permissions map:', permsMap);
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
