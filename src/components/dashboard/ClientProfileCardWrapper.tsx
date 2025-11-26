import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { ClientProfileCard } from "./ClientProfileCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { EnrichEditorialDialog } from "@/components/ai/EnrichEditorialDialog";
import { useToast } from "@/hooks/use-toast";
import { callApi } from "@/lib/apiClient";
import { useClientEditorialData } from "@/hooks/useClientEditorialData";

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
  const { data, isLoading, error, refetch } = useClientEditorialData(clientId);
  const [enrichDialogOpen, setEnrichDialogOpen] = useState(false);
  const [generatingBase, setGeneratingBase] = useState(false);

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

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm">
            Não conseguimos carregar os dados do cliente. Tente novamente mais tarde.
          </p>
        </CardContent>
      </Card>
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

  const handleGenerateEditorialBase = async () => {
    setGeneratingBase(true);
    try {
      const payload = { clientId };
      console.log('[ClientProfileCardWrapper] payload', payload);

      const response = await callApi<{ success?: boolean; tokens?: number }>(
        '/api/ia/generateEditorialBase',
        {
          method: "POST",
          payload,
        }
      );

      console.log('[ClientProfileCardWrapper] response', response);

      if (!response?.success) {
        throw new Error('Não foi possível gerar a linha editorial base.');
      }

      toast({
        title: "Linha editorial base atualizada",
        description: response.tokens
          ? `Geramos uma nova linha editorial base (${response.tokens} tokens).`
          : "Geramos uma nova linha editorial base com sucesso.",
      });
      await refetch();
    } catch (error: any) {
      toast({
        title: "Erro ao gerar linha editorial",
        description: error?.message || "Não foi possível gerar a linha editorial base.",
        variant: "destructive",
      });
    } finally {
      setGeneratingBase(false);
    }
  };

  return (
    <>
      <ClientProfileCard
        profile={data.profile}
        creativesCount={data.creativesCount}
        monthlyLimit={data.monthlyLimit}
        clientName={data.clientName}
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
        onGenerateEditorialBase={
          showActions ? handleGenerateEditorialBase : undefined
        }
        generatingEditorialBase={generatingBase}
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
