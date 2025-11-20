import { useUserData } from "@/hooks/useUserData";
import { AppLayout } from "@/components/layout/AppLayout";
import { AgencyCalendar } from "@/components/calendar/AgencyCalendar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Info, Lightbulb, CalendarPlus } from "lucide-react";

export default function AgencyAgenda() {
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
      <div className="container mx-auto px-4 md:px-6 py-4 md:py-8">
        <div className="mb-4 md:mb-6">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
            Agenda da Agência
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Visualize e gerencie todo o calendário de conteúdos
          </p>
        </div>
        
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>Como usar a Agenda</AlertTitle>
          <AlertDescription className="space-y-2">
            <div className="flex items-start gap-2">
              <CalendarPlus className="h-4 w-4 mt-0.5 text-primary" />
              <span><strong>Criar conteúdo:</strong> Clique em uma data no calendário para criar um novo conteúdo agendado para aquele dia.</span>
            </div>
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 mt-0.5 text-yellow-600" />
              <span><strong>Ícone de Lâmpada:</strong> Indica que há <strong>sugestões de conteúdo</strong> disponíveis para aquele dia. Clique para ver ideias e criar conteúdo automaticamente.</span>
            </div>
          </AlertDescription>
        </Alert>
        
        <AgencyCalendar agencyId={profile.agency_id} />
      </div>
    </AppLayout>
  );
}
