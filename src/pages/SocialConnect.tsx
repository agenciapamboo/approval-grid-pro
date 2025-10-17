import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { SelectSocialAccountsDialog } from "@/components/admin/SelectSocialAccountsDialog";

export default function SocialConnect() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState("Processando...");
  const [showDialog, setShowDialog] = useState(false);
  const [availableAccounts, setAvailableAccounts] = useState<any[]>([]);
  const [currentClientId, setCurrentClientId] = useState<string>("");
  const [returnUrl, setReturnUrl] = useState<string>("/");

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");

      if (error) {
        throw new Error(`Erro na autenticação: ${error}`);
      }

      if (!code || !state) {
        throw new Error("Parâmetros inválidos");
      }

      const { clientId, returnUrl } = JSON.parse(state);

      setStatus("Obtendo token de acesso...");

      // Chamar edge function para trocar o code pelo token
      const { data, error: functionError } = await supabase.functions.invoke('exchange-facebook-token', {
        body: { code, clientId },
      });

      if (functionError) throw functionError;

      if (!data.success) {
        throw new Error(data.error || "Erro ao conectar conta");
      }

      // Salvar dados para o dialog
      setAvailableAccounts(data.accounts || []);
      setCurrentClientId(clientId);
      setReturnUrl(returnUrl || "/");
      setShowDialog(true);
    } catch (error: any) {
      console.error("Erro no callback OAuth:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao conectar conta social",
        variant: "destructive",
      });
      navigate("/");
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto" />
          <p className="text-lg">{status}</p>
        </div>
      </div>

      <SelectSocialAccountsDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        accounts={availableAccounts}
        clientId={currentClientId}
        onSuccess={() => {
          toast({
            title: "Sucesso!",
            description: "Contas configuradas com sucesso",
          });
          navigate(returnUrl);
        }}
      />
    </>
  );
}
