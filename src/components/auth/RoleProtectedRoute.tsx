import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserData } from '@/hooks/useUserData';
import { Loader2 } from 'lucide-react';

type AppRole = 'super_admin' | 'agency_admin' | 'team_member' | 'client_user' | 'approver';

interface RoleProtectedRouteProps {
  children: ReactNode;
  allow: AppRole[];
}

export function RoleProtectedRoute({ children, allow }: RoleProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserData();

  // Aguardar carregamento completo da autenticação e role
  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Só redirecionar para auth se não tiver usuário E o loading já terminou
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Só redirecionar para dashboard se o role foi carregado e não está na lista de permitidos
  // Isso evita redirecionamento durante o carregamento inicial
  if (role && !allow.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Se ainda não tem role definido mas não está loading, aguardar
  if (!role) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
