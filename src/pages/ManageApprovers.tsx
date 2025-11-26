import { AppLayout } from "@/components/layout/AppLayout";
import { ApproversManager } from "@/components/admin/ApproversManager";
import { useUserData } from "@/hooks/useUserData";
import { Loader2 } from "lucide-react";

const ManageApprovers = () => {
  const { profile, client, loading } = useUserData();

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!profile?.client_id || !client) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Você não está vinculado a nenhum cliente.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <ApproversManager clientId={profile.client_id} clientName={client.name} />
      </div>
    </AppLayout>
  );
};

export default ManageApprovers;
