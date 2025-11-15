import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import AccessGate from "@/components/auth/AccessGate";
import { ProfilesManager as ProfilesManagerComponent } from "@/components/admin/ProfilesManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserCog } from "lucide-react";

export default function ProfilesManager() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user roles
      const profilesWithRoles = await Promise.all(
        (data || []).map(async (profile) => {
          const { data: roleData } = await supabase
            .rpc('get_user_role', { _user_id: profile.id });
          return { ...profile, role: roleData || 'client_user' };
        })
      );

      setProfiles(profilesWithRoles);
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      'super_admin': 'Super Admin',
      'agency_admin': 'Admin Agência',
      'team_member': 'Membro Equipe',
      'client_user': 'Cliente',
      'approver': 'Aprovador'
    };
    return labels[role] || role;
  };

  return (
    <AccessGate allow={['super_admin']}>
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
          {loading ? (
            <Card>
              <CardContent className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-6">
                <div className="flex items-center gap-2">
                  <UserCog className="h-6 w-6" />
                  <h1 className="text-2xl font-bold">Gerenciamento de Perfis</h1>
                </div>
                <p className="text-muted-foreground mt-1">
                  Gerencie todos os perfis de usuários do sistema
                </p>
              </div>
              <ProfilesManagerComponent 
                profiles={profiles}
                getRoleLabel={getRoleLabel}
                onProfileUpdated={loadProfiles}
              />
            </>
          )}
        </main>
        <AppFooter />
      </div>
    </AccessGate>
  );
}
