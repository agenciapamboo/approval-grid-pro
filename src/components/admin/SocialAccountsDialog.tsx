import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Facebook, Instagram, Trash2, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SocialAccount {
  id: string;
  platform: string;
  account_name: string;
  account_id: string;
  is_active: boolean;
  page_id?: string;
  instagram_business_account_id?: string;
}

interface SocialAccountsDialogProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SocialAccountsDialog({ clientId, open, onOpenChange }: SocialAccountsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [facebookAppId, setFacebookAppId] = useState("");

  useEffect(() => {
    if (open) {
      loadAccounts();
      loadFacebookAppId();
    }
  }, [open, clientId]);

  const loadFacebookAppId = async () => {
    const appId = import.meta.env.VITE_FACEBOOK_APP_ID;
    if (appId) {
      setFacebookAppId(appId);
    }
  };

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("client_social_accounts")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      console.error("Error loading accounts:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar contas conectadas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookConnect = async () => {
    if (!facebookAppId) {
      toast({
        title: "Configuração pendente",
        description: "O Facebook App ID ainda não foi configurado",
        variant: "destructive",
      });
      return;
    }

    const redirectUri = `${window.location.origin}/social-connect`;
    const state = JSON.stringify({
      clientId,
      returnUrl: window.location.pathname,
    });

    const scope = [
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
      "instagram_basic",
      "instagram_content_publish",
      "business_management",
    ].join(",");

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${facebookAppId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(scope)}`;

    window.location.href = authUrl;
  };

  const handleInstagramConnect = async () => {
    // Instagram usa o mesmo fluxo do Facebook
    handleFacebookConnect();
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm("Tem certeza que deseja desconectar esta conta?")) return;

    try {
      const { error } = await supabase
        .from("client_social_accounts")
        .delete()
        .eq("id", accountId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conta desconectada com sucesso",
      });
      loadAccounts();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao desconectar conta",
        variant: "destructive",
      });
    }
  };

  const toggleAccountStatus = async (accountId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("client_social_accounts")
        .update({ is_active: !currentStatus })
        .eq("id", accountId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Conta ${!currentStatus ? "ativada" : "desativada"} com sucesso`,
      });
      loadAccounts();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status da conta",
        variant: "destructive",
      });
    }
  };

  const facebookAccounts = accounts.filter((a) => a.platform === "facebook");
  const instagramAccounts = accounts.filter((a) => a.platform === "instagram");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contas de Redes Sociais</DialogTitle>
        </DialogHeader>

        {!facebookAppId && (
          <Alert>
            <AlertDescription>
              Configure o VITE_FACEBOOK_APP_ID nas variáveis de ambiente para conectar contas sociais.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Facebook Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Facebook className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">Facebook</h3>
              </div>
              <Button onClick={handleFacebookConnect} disabled={!facebookAppId}>
                <Facebook className="h-4 w-4 mr-2" />
                Conectar Página
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : facebookAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma página conectada</p>
            ) : (
              <div className="space-y-2">
                {facebookAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Facebook className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">{account.account_name}</p>
                        <p className="text-xs text-muted-foreground">ID: {account.page_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`active-${account.id}`} className="text-sm">
                          {account.is_active ? "Ativa" : "Inativa"}
                        </Label>
                        <Switch
                          id={`active-${account.id}`}
                          checked={account.is_active}
                          onCheckedChange={() =>
                            toggleAccountStatus(account.id, account.is_active)
                          }
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAccount(account.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instagram Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Instagram className="h-5 w-5 text-pink-600" />
                <h3 className="font-semibold">Instagram</h3>
              </div>
              <Button onClick={handleInstagramConnect} disabled={!facebookAppId}>
                <Instagram className="h-4 w-4 mr-2" />
                Conectar Conta
              </Button>
            </div>

            <Alert>
              <AlertDescription className="text-xs">
                <strong>Importante:</strong> Para conectar Instagram, você precisa ter uma Conta
                Comercial do Instagram vinculada a uma Página do Facebook. Ao clicar em "Conectar
                Conta", você será direcionado para o Facebook para autorizar o acesso às suas
                páginas e contas comerciais do Instagram vinculadas.
              </AlertDescription>
            </Alert>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : instagramAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma conta conectada</p>
            ) : (
              <div className="space-y-2">
                {instagramAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Instagram className="h-5 w-5 text-pink-600" />
                      <div>
                        <p className="font-medium">{account.account_name}</p>
                        <p className="text-xs text-muted-foreground">
                          ID: {account.instagram_business_account_id}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`active-${account.id}`} className="text-sm">
                          {account.is_active ? "Ativa" : "Inativa"}
                        </Label>
                        <Switch
                          id={`active-${account.id}`}
                          checked={account.is_active}
                          onCheckedChange={() =>
                            toggleAccountStatus(account.id, account.is_active)
                          }
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAccount(account.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
