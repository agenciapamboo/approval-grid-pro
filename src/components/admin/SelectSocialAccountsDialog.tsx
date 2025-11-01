import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Account {
  platform: string;
  account_id: string;
  account_name: string;
  access_token: string;
  page_id: string;
  instagram_business_account_id?: string;
}

interface SelectSocialAccountsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  clientId: string;
  onSuccess: () => void;
}

export function SelectSocialAccountsDialog({
  open,
  onOpenChange,
  accounts,
  clientId,
  onSuccess,
}: SelectSocialAccountsDialogProps) {
  const { toast } = useToast();
  const [selectedFacebook, setSelectedFacebook] = useState<string>("");
  const [selectedInstagram, setSelectedInstagram] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const facebookAccounts = accounts.filter((acc) => acc.platform === "facebook");
  const instagramAccounts = accounts.filter((acc) => acc.platform === "instagram");

  const handleSave = async () => {
    if (!selectedFacebook && !selectedInstagram) {
      toast({
        title: "Atenção",
        description: "Selecione pelo menos uma conta",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const accountsToSave = [];

      if (selectedFacebook) {
        const fbAccount = facebookAccounts.find(
          (acc) => acc.account_id === selectedFacebook
        );
        if (fbAccount) {
          // Encrypt token before saving
          const { data: encryptedToken } = await supabase.rpc('encrypt_social_token', {
            token: fbAccount.access_token
          });

          accountsToSave.push({
            client_id: clientId,
            platform: "facebook",
            account_id: fbAccount.account_id,
            account_name: fbAccount.account_name,
            access_token_encrypted: encryptedToken,
            page_id: fbAccount.page_id,
            instagram_business_account_id: fbAccount.instagram_business_account_id,
            is_active: true,
          });
        }
      }

      if (selectedInstagram) {
        const igAccount = instagramAccounts.find(
          (acc) => acc.account_id === selectedInstagram
        );
        if (igAccount) {
          // Encrypt token before saving
          const { data: encryptedToken } = await supabase.rpc('encrypt_social_token', {
            token: igAccount.access_token
          });

          accountsToSave.push({
            client_id: clientId,
            platform: "instagram",
            account_id: igAccount.account_id,
            account_name: igAccount.account_name,
            access_token_encrypted: encryptedToken,
            page_id: igAccount.page_id,
            instagram_business_account_id: igAccount.instagram_business_account_id,
            is_active: true,
          });
        }
      }

      for (const account of accountsToSave) {
        const { error } = await supabase
          .from("client_social_accounts")
          .upsert(account, {
            onConflict: "client_id,platform,account_id",
          });

        if (error) throw error;
      }

      toast({
        title: "Sucesso!",
        description: `${accountsToSave.length} conta(s) configurada(s)`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao salvar contas:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar contas",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selecionar Contas Sociais</DialogTitle>
          <DialogDescription>
            Escolha uma conta de cada rede social para este cliente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {facebookAccounts.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Facebook</label>
              <Select value={selectedFacebook} onValueChange={setSelectedFacebook}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma página do Facebook" />
                </SelectTrigger>
                <SelectContent>
                  {facebookAccounts.map((account) => (
                    <SelectItem key={account.account_id} value={account.account_id}>
                      {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {instagramAccounts.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Instagram</label>
              <Select
                value={selectedInstagram}
                onValueChange={setSelectedInstagram}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta do Instagram" />
                </SelectTrigger>
                <SelectContent>
                  {instagramAccounts.map((account) => (
                    <SelectItem key={account.account_id} value={account.account_id}>
                      {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
