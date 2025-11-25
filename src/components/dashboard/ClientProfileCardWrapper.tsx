import { useNavigate } from "react-router-dom";
import { ClientProfileCard } from "./ClientProfileCard";
import { useClientEditorialData } from "@/hooks/useClientEditorialData";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { EnrichEditorialDialog } from "@/components/ai/EnrichEditorialDialog";
import { useToast } from "@/hooks/use-toast";

interface ClientProfileCardWrapperProps {
  clientId: string;
  showActions?: boolean;
}

export function ClientProfileCardWrapper({
  clientId,
  showActions = true,
}: ClientProfileCardWrapperProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading, refetch } = useClientEditorialData(clientId);
  const [enrichDialogOpen, setEnrichDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <Skeleton className="h-[300px]" />
        </Card>
        <Card>
          <Skeleton className="h-[300px]" />
        </Card>
      </div>
    );
  }

  if (!data?.profile) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6">
          <AlertCircle className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Configure o perfil do cliente para visualizar informações de IA
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ClientProfileCard
        profile={data.profile}
        creativesCount={data.creativesCount}
        onRefreshBriefing={
          showActions
            ? () => navigate(`/cliente/${clientId}/briefing?type=client_profile`)
            : undefined
        }
        onEnrichEditorial={
          showActions
            ? () => setEnrichDialogOpen(true)
            : undefined
        }
      />

      {showActions && (
        <EnrichEditorialDialog
          open={enrichDialogOpen}
          onOpenChange={setEnrichDialogOpen}
          clientId={clientId}
          onSuccess={() => {
            toast({
              title: "Linha Editorial Atualizada",
              description: "A linha editorial foi enriquecida com sucesso"
            });
            refetch();
          }}
        />
      )}
    </>
  );
}
