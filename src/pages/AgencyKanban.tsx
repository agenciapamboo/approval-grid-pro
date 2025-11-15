import { useUserData } from "@/hooks/useUserData";
import { AppLayout } from "@/components/layout/AppLayout";
import { ContentKanban } from "@/components/content/ContentKanban";
import { Loader2 } from "lucide-react";

export default function AgencyKanban() {
  const { profile, agency, loading } = useUserData();

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!profile?.agency_id || !agency) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Você não está vinculado a nenhuma agência.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Kanban da Agência
          </h1>
          <p className="text-muted-foreground">
            Gerencie o fluxo de trabalho de todos os conteúdos
          </p>
        </div>
        
        <ContentKanban agencyId={profile.agency_id} />
      </div>
    </AppLayout>
  );
}
