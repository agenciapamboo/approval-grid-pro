import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ContentPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canComment: boolean;
  canManageClients: boolean;
  canManageApprovers: boolean;
  canViewAnalytics: boolean;
  canManageSettings: boolean;
}

export interface UseContentPermissionsReturn {
  permissions: ContentPermissions;
  loading: boolean;
  userRole: string | null;
  isApprover: boolean;
}

const DEFAULT_PERMISSIONS: ContentPermissions = {
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canApprove: false,
  canComment: false,
  canManageClients: false,
  canManageApprovers: false,
  canViewAnalytics: false,
  canManageSettings: false,
};

/**
 * Hook simplificado para verificar permissões de conteúdo
 * Sistema de 5 roles: super_admin, agency_admin, team_member, client_user, approver
 */
export function useContentPermissions(): UseContentPermissionsReturn {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<ContentPermissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isApprover, setIsApprover] = useState(false);

  useEffect(() => {
    const loadPermissions = async () => {
      // No authenticated user = no permissions
      if (!user) {
        setPermissions(DEFAULT_PERMISSIONS);
        setUserRole(null);
        setIsApprover(false);
        setLoading(false);
        return;
      }

      try {
        // Buscar role do usuário
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (!userRoles || userRoles.length === 0) {
          setPermissions(DEFAULT_PERMISSIONS);
          setUserRole(null);
          setLoading(false);
          return;
        }

        // Priorizar role mais alto (primeiro do array)
        const role = userRoles[0].role;
        setUserRole(role);
        setIsApprover(role === 'approver');
        await loadRolePermissions(role);
      } catch (error) {
        console.error('Erro ao carregar permissões:', error);
        setPermissions(DEFAULT_PERMISSIONS);
        setLoading(false);
      }
    };

    loadPermissions();
  }, [user]);

  const loadRolePermissions = async (role: string) => {
    try {
      console.log('[useContentPermissions] Loading permissions for role:', role);

      const { data: rolePerms, error } = await supabase
        .from('role_permissions')
        .select('permission_key, enabled')
        .eq('role', role as any); // Cast para any pois o tipo é dinâmico

      if (error) {
        console.error('[useContentPermissions] Error loading role permissions:', error);
        setLoading(false);
        return;
      }

      const permsMap: Record<string, boolean> = {};
      (rolePerms || []).forEach(p => {
        permsMap[p.permission_key] = p.enabled;
      });

      console.log('[useContentPermissions] Permissions loaded:', permsMap);

      setPermissions({
        canView: permsMap['view_content'] ?? false,
        canCreate: permsMap['create_content'] ?? false,
        canEdit: permsMap['edit_content'] ?? false,
        canDelete: permsMap['delete_content'] ?? false,
        canApprove: permsMap['approve_content'] ?? false,
        canComment: permsMap['add_comment'] ?? false,
        canManageClients: permsMap['manage_clients'] ?? false,
        canManageApprovers: permsMap['manage_approvers'] ?? false,
        canViewAnalytics: permsMap['view_analytics'] ?? false,
        canManageSettings: permsMap['manage_settings'] ?? false,
      });

      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar permissões do role:', error);
      setPermissions(DEFAULT_PERMISSIONS);
      setLoading(false);
    }
  };

  return {
    permissions,
    loading,
    userRole,
    isApprover,
  };
}
