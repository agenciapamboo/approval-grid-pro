import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ApproverData {
  id: string;
  name: string;
  email: string;
  clientId: string;
  agencyId: string;
}

export interface ContentPermissions {
  canView: boolean;
  canCreate: boolean;
  canApprove: boolean;
  canDelete: boolean;
  canEdit: boolean;
  canComment: boolean;
}

export interface ContentAccess {
  userType: 'super_admin' | 'agency_admin' | 'team_member' | 'client_user' | 'approver' | 'public';
  permissions: ContentPermissions;
  approverData?: ApproverData;
  userId?: string;
  agencyId?: string;
  clientId?: string;
  loading: boolean;
}

export function useContentAccess(): ContentAccess {
  const { user } = useAuth();
  const [access, setAccess] = useState<ContentAccess>({
    userType: 'public',
    permissions: {
      canView: false,
      canCreate: false,
      canApprove: false,
      canDelete: false,
      canEdit: false,
      canComment: false,
    },
    loading: true,
  });

  useEffect(() => {
    const loadAccess = async () => {
      // Se não tem usuário autenticado, é público
      if (!user) {
        setAccess({
          userType: 'public',
          permissions: {
            canView: true, // Pode ver apenas conteúdo aprovado
            canCreate: false,
            canApprove: false,
            canDelete: false,
            canEdit: false,
            canComment: false,
          },
          loading: false,
        });
        return;
      }

      try {
        // Buscar role do usuário
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (!userRoles || userRoles.length === 0) {
          setAccess({
            userType: 'public',
            permissions: {
              canView: true,
              canCreate: false,
              canApprove: false,
              canDelete: false,
              canEdit: false,
              canComment: false,
            },
            loading: false,
          });
          return;
        }

        const role = userRoles[0].role as 'super_admin' | 'agency_admin' | 'team_member' | 'client_user';

        // Buscar perfil para obter agency_id e client_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('agency_id, client_id')
          .eq('id', user.id)
          .single();

        // Buscar permissões do role
        const { data: rolePerms } = await supabase
          .from('role_permissions')
          .select('permission_key, enabled')
          .eq('role', role);

        const permsMap: Record<string, boolean> = {};
        (rolePerms || []).forEach(p => {
          permsMap[p.permission_key] = p.enabled;
        });

        setAccess({
          userType: role,
          permissions: {
            canView: permsMap['view_content'] ?? true,
            canCreate: permsMap['create_content'] ?? false,
            canApprove: permsMap['approve_content'] ?? false,
            canDelete: permsMap['delete_content'] ?? false,
            canEdit: permsMap['edit_content'] ?? false,
            canComment: permsMap['add_comment'] ?? false,
          },
          userId: user.id,
          agencyId: profile?.agency_id,
          clientId: profile?.client_id,
          loading: false,
        });
      } catch (error) {
        console.error('Erro ao carregar permissões:', error);
        setAccess({
          userType: 'public',
          permissions: {
            canView: true,
            canCreate: false,
            canApprove: false,
            canDelete: false,
            canEdit: false,
            canComment: false,
          },
          loading: false,
        });
      }
    };

    loadAccess();
  }, [user]);

  return access;
}
