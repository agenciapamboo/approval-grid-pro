import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, UserCog, ShieldAlert } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import AccessGate from "@/components/auth/AccessGate";

export default function StripeSync() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [syncingSubscriptions, setSyncingSubscriptions] = useState(false);
  const [fixingOrphans, setFixingOrphans] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [orphanResult, setOrphanResult] = useState<any>(null);
  const [authError, setAuthError] = useState(false);

  const handleSyncSubscriptions = async () => {
    setSyncingSubscriptions(true);
    setSyncResult(null);
    setAuthError(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-stripe-subscriptions');

      if (error) throw error;

      if (data?.isAuthError) {
        setAuthError(true);
        toast({
          variant: "destructive",
          title: "Acesso negado",
          description: "Apenas super admins podem sincronizar assinaturas",
        });
        return;
      }

      setSyncResult(data);
      toast({
        title: "Sincronização concluída",
        description: `${data.synced} assinaturas sincronizadas. ${data.errors} erros.`,
      });
    } catch (error: any) {
      if (error.message?.includes('Unauthorized')) {
        setAuthError(true);
        toast({
          variant: "destructive",
          title: "Acesso negado",
          description: "Apenas super admins podem sincronizar assinaturas",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao sincronizar",
          description: error.message,
        });
      }
    } finally {
      setSyncingSubscriptions(false);
    }
  };

  const handleFixOrphans = async () => {
    setFixingOrphans(true);
    setOrphanResult(null);
    setAuthError(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('fix-orphaned-users');

      if (error) throw error;

      if (data?.isAuthError) {
        setAuthError(true);
        toast({
          variant: "destructive",
          title: "Acesso negado",
          description: "Apenas super admins podem corrigir usuários órfãos",
        });
        return;
      }

      setOrphanResult(data);
      toast({
        title: "Correção concluída",
        description: `${data.fixed} usuários corrigidos de ${data.total} encontrados.`,
      });
    } catch (error: any) {
      if (error.message?.includes('Unauthorized')) {
        setAuthError(true);
        toast({
          variant: "destructive",
          title: "Acesso negado",
          description: "Apenas super admins podem corrigir usuários órfãos",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao corrigir usuários",
          description: error.message,
        });
      }
    } finally {
      setFixingOrphans(false);
    }
  };

  return (
    <AccessGate allow={['super_admin']}>
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
...
        </main>
        <AppFooter />
      </div>
    </AccessGate>
  );
}