import { useState } from "react";
import { useUserData } from "@/hooks/useUserData";
import { AppLayout } from "@/components/layout/AppLayout";
import { ContentKanban } from "@/components/content/ContentKanban";
import { Loader2 } from "lucide-react";
import { EnrichEditorialButton } from "@/components/ai/EnrichEditorialButton";
import { useToast } from "@/hooks/use-toast";

export default function AgencyKanban() {
  const { profile, agency, loading } = useUserData();
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

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
      <div className="container mx-auto px-4 md:px-6 py-4 md:py-8">
        <div className="mb-4 md:mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              Kanban da Agência
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Gerencie o fluxo de trabalho de todos os conteúdos
            </p>
          </div>
          {selectedClientId && (
            <EnrichEditorialButton
              clientId={selectedClientId}
              variant="outline"
              size="sm"
              onSuccess={() => {
                toast({
                  title: "Linha Editorial Atualizada",
                  description: "A linha editorial foi enriquecida com sucesso"
                });
              }}
            />
          )}
        </div>
        
        <ContentKanban 
          agencyId={profile.agency_id} 
          onClientFilterChange={setSelectedClientId}
        />
      </div>
    </AppLayout>
  );
}
