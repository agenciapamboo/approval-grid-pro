import { ReactNode } from 'react';
import { useUserData } from '@/hooks/useUserData';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

type AppRole = 'super_admin' | 'agency_admin' | 'team_member' | 'client_user' | 'approver';

interface AccessGateProps {
  allow: AppRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export default function AccessGate({ allow, children, fallback }: AccessGateProps) {
  const { role, loading } = useUserData();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!role) {
    navigate('/auth');
    return null;
  }

  if (!allow.includes(role)) {
    navigate('/dashboard');
    return null;
  }

  return <>{fallback ?? null}{children}</>;
}
