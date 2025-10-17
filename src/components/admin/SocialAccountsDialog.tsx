import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Facebook, Instagram, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SocialAccount {
  id: string;
  platform: string;
  account_name: string;
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
    // Carregar o App ID configurado (vamos criar uma tabela de configurações)
    // Por enquanto, você precisará configurar isso manualmente
    setFacebookAppId(import.meta.env.VITE_FACEBOOK_APP_ID || "");
  };

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("client_social_accounts")
        .select("*")
        .eq("client_id", clientId);

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar as contas conectadas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookConnect = () => {
    if (!facebookAppId) {
      toast({
        title: "Configuração necessária",
        description: "O Facebook App ID precisa ser configurado primeiro",
        variant: "destructive",
      });
      return;
    }

    const redirectUri = `${window.location.origin}/social-connect`;
    const scope = "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish";
    const state = JSON.stringify({ clientId, returnUrl: window.location.pathname });

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${facebookAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${encodeURIComponent(state)}&response_type=code`;

    window.location.href = authUrl;
  };

  const handleInstagramConnect = () => {
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
        description: "Não foi possível desconectar a conta",
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
        description: "Não foi possível alterar o status da conta",
        variant: "destructive",
      });
    }
  };

  const facebookAccounts = accounts.filter(a => a.platform === 'facebook');
  const instagramAccounts = accounts.filter(a => a.platform === 'instagram');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conectar Redes Sociais</DialogTitle>
          <DialogDescription>
            Conecte as páginas do Facebook e Instagram para publicação automática
          </DialogDescription>
        </DialogHeader>

        {!facebookAppId && (
          <Alert>
            <AlertDescription>
              ⚠️ Configure o Facebook App ID nas variáveis de ambiente (VITE_FACEBOOK_APP_ID)
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Facebook */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Facebook className="h-5 w-5 text-[#1877F2]" />
                <h3 className="font-semibold">Facebook</h3>
              </div>
              <Button
                onClick={handleFacebookConnect}
                disabled={!facebookAppId}
                size="sm"
              >
                <Facebook className="h-4 w-4 mr-2" />
                Conectar Página
              </Button>
            </div>

            {facebookAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma página conectada
              </p>
            ) : (
              <div className="space-y-2">
                {facebookAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {account.is_active ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">{account.account_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {account.is_active ? "Ativa" : "Inativa"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAccountStatus(account.id, account.is_active)}
                      >
                        {account.is_active ? "Desativar" : "Ativar"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAccount(account.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instagram */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Instagram className="h-5 w-5 text-[#E4405F]" />
                <h3 className="font-semibold">Instagram</h3>
              </div>
              <Button
                onClick={handleInstagramConnect}
                disabled={!facebookAppId}
                size="sm"
              >
                <Instagram className="h-4 w-4 mr-2" />
                Conectar Conta
              </Button>
            </div>

            {instagramAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma conta conectada
              </p>
            ) : (
              <div className="space-y-2">
                {instagramAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {account.is_active ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">{account.account_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {account.is_active ? "Ativa" : "Inativa"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAccountStatus(account.id, account.is_active)}
                      >
                        {account.is_active ? "Desativar" : "Ativar"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAccount(account.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              <strong>Importante:</strong> As contas do Instagram devem ser contas Business vinculadas a uma Página do Facebook.
              Se o Instagram não aparecer após conectar o Facebook, conecte manualmente através do botão "Conectar Conta" do Instagram.
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}
