import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Copy, ExternalLink, Link as LinkIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GenerateApprovalLinkButtonProps {
  clientId: string;
  clientName: string;
  agencySlug: string;
  clientSlug: string;
}

export function GenerateApprovalLinkButton({ 
  clientId, 
  clientName, 
  agencySlug, 
  clientSlug 
}: GenerateApprovalLinkButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [approvalLink, setApprovalLink] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const { toast } = useToast();

  // Mês atual no formato YYYY-MM
  const currentMonth = format(new Date(), "yyyy-MM");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const generateLink = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('generate-approval-link', {
        body: { 
          client_id: clientId,
          month: selectedMonth
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;

      if (data?.approval_url) {
        setApprovalLink(data.approval_url);
        // Calcular data de expiração (7 dias a partir de agora)
        const expires = new Date();
        expires.setDate(expires.getDate() + 7);
        setExpiresAt(expires);

        toast({
          title: "Link gerado com sucesso!",
          description: `Válido por 7 dias (até ${format(expires, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })})`,
        });
      }
    } catch (error: any) {
      console.error("Erro ao gerar link:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível gerar o link de aprovação",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(approvalLink);
      toast({
        title: "Link copiado!",
        description: "O link foi copiado para a área de transferência",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível copiar o link",
      });
    }
  };

  const openLink = () => {
    window.open(approvalLink, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start">
          <LinkIcon className="w-4 h-4 mr-2" />
          Gerar Link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link de Aprovação</DialogTitle>
          <DialogDescription>
            Gere um link temporário (7 dias) para {clientName} revisar conteúdos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="month">Mês de Referência</Label>
            <div className="flex gap-2">
              <Input
                id="month"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={generateLink}
                disabled={loading}
                variant="default"
              >
                <Calendar className="w-4 h-4 mr-2" />
                {loading ? "Gerando..." : "Gerar"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Selecione o mês dos conteúdos que serão revisados
            </p>
          </div>

          {approvalLink && (
            <div className="space-y-3 pt-4 border-t">
              <div className="space-y-2">
                <Label>Link Gerado</Label>
                <div className="flex gap-2">
                  <Input
                    value={approvalLink}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    title="Copiar link"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={openLink}
                    title="Abrir link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {expiresAt && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm font-medium">Validade</p>
                  <p className="text-sm text-muted-foreground">
                    Expira em {format(expiresAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              )}

              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  💡 Envie este link por email ou WhatsApp para o cliente revisar os conteúdos do mês selecionado.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
