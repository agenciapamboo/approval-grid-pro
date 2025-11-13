import { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";

interface PermissionGuardProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
}

export function PermissionGuard({ 
  permission, 
  children, 
  fallback = null,
  loadingFallback = <Skeleton className="h-10 w-full" />
}: PermissionGuardProps) {
  const { hasPermission, loading } = usePermissions();
  
  if (loading) return <>{loadingFallback}</>;
  if (!hasPermission(permission)) return <>{fallback}</>;
  
  return <>{children}</>;
}
