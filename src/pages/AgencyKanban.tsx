import { useState } from "react";
import { useUserData } from "@/hooks/useUserData";
import { AppLayout } from "@/components/layout/AppLayout";
import { ContentKanban } from "@/components/content/ContentKanban";
import { MonthlyContentPlanner } from "@/components/content/MonthlyContentPlanner";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp } from "lucide-react";
import { EnrichEditorialButton } from "@/components/ai/EnrichEditorialButton";
import { useToast } from "@/hooks/use-toast";

export default function AgencyKanban() {
  const { profile, agency, loading } = useUserData();
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showMonthlyPlanner, setShowMonthlyPlanner] = useState(false);

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
          <div className="flex gap-2">
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
            <Button
              variant="outline"
              onClick={() => setShowMonthlyPlanner(true)}
              disabled={!selectedClientId}
              className="gap-2 bg-green-500/10 border-green-500/20 hover:bg-green-500/20"
            >
              <TrendingUp className="h-4 w-4 text-green-500" />
              Planejamento IA
            </Button>
          </div>
        </div>
        
        <ContentKanban 
          agencyId={profile.agency_id} 
          onClientFilterChange={setSelectedClientId}
        />

        {selectedClientId && (
          <MonthlyContentPlanner
            clientId={selectedClientId}
            open={showMonthlyPlanner}
            onOpenChange={setShowMonthlyPlanner}
          />
        )}
      </div>
    </AppLayout>
  );
}
