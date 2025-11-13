import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ContentPermissions {
  // Visualização de componentes
  canViewMediaBlocks: boolean;
  canViewActionButtons: boolean;
  canViewHistoryBox: boolean;
  canViewCommentBox: boolean;
  canViewContentDetails: boolean;
  
  // Ações de conteúdo
  canViewContent: boolean;
  canCreateContent: boolean;
  canApproveContent: boolean;
  canDeleteContent: boolean;
  canEditContent: boolean;
  canAddComment: boolean;
  canRequestAdjustment: boolean;
  canRejectContent: boolean;
  
  // Filtros
  canFilterByStatus: boolean;
  canFilterByMonth: boolean;
  canViewAllStatuses: boolean;
  
  // Gerenciamento
  canManageApprovers: boolean;
  canViewAnalytics: boolean;
  canManageClients: boolean;
  canManageTeam: boolean;
  canViewFinanceiro: boolean;
  canManageSettings: boolean;
  canManageAgencies: boolean;
  canManageUsers: boolean;
  canViewAuditLog: boolean;
  canManageSubscriptions: boolean;
  canViewSecurityDashboard: boolean;
}

export interface UseContentPermissionsReturn {
  permissions: ContentPermissions;
  loading: boolean;
  userRole: string | null;
  isApprover: boolean;
}

const DEFAULT_PERMISSIONS: ContentPermissions = {
  canViewMediaBlocks: false,
  canViewActionButtons: false,
  canViewHistoryBox: false,
  canViewCommentBox: false,
  canViewContentDetails: false,
  canViewContent: false,
  canCreateContent: false,
  canApproveContent: false,
  canDeleteContent: false,
  canEditContent: false,
  canAddComment: false,
  canRequestAdjustment: false,
  canRejectContent: false,
  canFilterByStatus: false,
  canFilterByMonth: false,
  canViewAllStatuses: false,
  canManageApprovers: false,
  canViewAnalytics: false,
  canManageClients: false,
  canManageTeam: false,
  canViewFinanceiro: false,
  canManageSettings: false,
  canManageAgencies: false,
  canManageUsers: false,
  canViewAuditLog: false,
  canManageSubscriptions: false,
  canViewSecurityDashboard: false,
};

/**
 * Hook para verificar permissões granulares de conteúdo
 * Busca as permissões do usuário baseado em seu role e retorna
 * um objeto com todas as permissões disponíveis
 */
export function useContentPermissions(): UseContentPermissionsReturn {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<ContentPermissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isApprover, setIsApprover] = useState(false);

  useEffect(() => {
    const loadPermissions = async () => {
      // Verificar se é approver via sessionStorage
      const approverDataStr = sessionStorage.getItem('approver_data');
      if (approverDataStr) {
        try {
          const approverData = JSON.parse(approverDataStr);
          if (approverData?.id) {
            setIsApprover(true);
            setUserRole('approver');
            await loadRolePermissions('approver');
            return;
          }
        } catch (e) {
          console.error('Erro ao parsear approver_data:', e);
        }
      }

      // Se não tem usuário autenticado, retornar permissões vazias
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

        // Priorizar role mais alto
        const role = userRoles[0].role;
        setUserRole(role);
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
      // Buscar permissões do role
      const { data: rolePerms } = await supabase
        .from('role_permissions')
        .select('permission_key, enabled')
        .eq('role', role as any);

      if (!rolePerms) {
        setPermissions(DEFAULT_PERMISSIONS);
        setLoading(false);
        return;
      }

      // Mapear permissões para objeto
      const permsMap: Record<string, boolean> = {};
      rolePerms.forEach(p => {
        permsMap[p.permission_key] = p.enabled;
      });

      // Construir objeto de permissões
      const newPermissions: ContentPermissions = {
        // Visualização de componentes
        canViewMediaBlocks: permsMap['view_media_blocks'] ?? false,
        canViewActionButtons: permsMap['view_action_buttons'] ?? false,
        canViewHistoryBox: permsMap['view_history_box'] ?? false,
        canViewCommentBox: permsMap['view_comment_box'] ?? false,
        canViewContentDetails: permsMap['view_content_details'] ?? false,
        
        // Ações de conteúdo
        canViewContent: permsMap['view_content'] ?? false,
        canCreateContent: permsMap['create_content'] ?? false,
        canApproveContent: permsMap['approve_content'] ?? false,
        canDeleteContent: permsMap['delete_content'] ?? false,
        canEditContent: permsMap['edit_content'] ?? false,
        canAddComment: permsMap['add_comment'] ?? false,
        canRequestAdjustment: permsMap['request_adjustment'] ?? false,
        canRejectContent: permsMap['reject_content'] ?? false,
        
        // Filtros
        canFilterByStatus: permsMap['filter_by_status'] ?? false,
        canFilterByMonth: permsMap['filter_by_month'] ?? false,
        canViewAllStatuses: permsMap['view_all_statuses'] ?? false,
        
        // Gerenciamento
        canManageApprovers: permsMap['manage_approvers'] ?? false,
        canViewAnalytics: permsMap['view_analytics'] ?? false,
        canManageClients: permsMap['manage_clients'] ?? false,
        canManageTeam: permsMap['manage_team'] ?? false,
        canViewFinanceiro: permsMap['view_financeiro'] ?? false,
        canManageSettings: permsMap['manage_settings'] ?? false,
        canManageAgencies: permsMap['manage_agencies'] ?? false,
        canManageUsers: permsMap['manage_users'] ?? false,
        canViewAuditLog: permsMap['view_audit_log'] ?? false,
        canManageSubscriptions: permsMap['manage_subscriptions'] ?? false,
        canViewSecurityDashboard: permsMap['view_security_dashboard'] ?? false,
      };

      setPermissions(newPermissions);
    } catch (error) {
      console.error('Erro ao carregar permissões do role:', error);
      setPermissions(DEFAULT_PERMISSIONS);
    } finally {
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
