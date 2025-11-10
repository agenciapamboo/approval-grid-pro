import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Copy, Calendar, MessageCircle } from "lucide-react";
import { hasFeatureAccess } from "@/lib/subscription-enforcement";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface GenerateApprovalLinkButtonProps {
  clientId: string;
  clientName: string;
  agencySlug: string;
  clientSlug: string;
}

interface TokenResponse {
  success: true;
  token: string;
  approval_url: string;
  expires_at: string;
  expires_in_days: number;
  client_slug: string;
  month: string;
}

export function GenerateApprovalLinkButton({
  clientId,
  clientName,
  agencySlug,
  clientSlug,
}: GenerateApprovalLinkButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [approvalLink, setApprovalLink] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [months, setMonths] = useState<Array<{ value: string; label: string; count: number }>>([]);
  const [loadingMonths, setLoadingMonths] = useState(true);
  const [hasWhatsAppAccess, setHasWhatsAppAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const { toast } = useToast();

  // Verificar permissão WhatsApp ao abrir o diálogo
  useEffect(() => {
    const checkWhatsAppAccess = async () => {
      setCheckingAccess(true);
      const { hasAccess } = await hasFeatureAccess('whatsapp');
      setHasWhatsAppAccess(hasAccess);
      setCheckingAccess(false);
    };
    
    if (open) {
      checkWhatsAppAccess();
    }
  }, [open]);

  // Carregar meses com conteúdo pendente
  useEffect(() => {
    if (open) {
      loadAvailableMonths();
    }
  }, [open, clientId]);

  const loadAvailableMonths = async () => {
    try {
      setLoadingMonths(true);
      
      const { data: contents, error } = await supabase
        .from("contents")
        .select("date, status")
        .eq("client_id", clientId)
        .in("status", ["in_review", "changes_requested", "draft"])
        .order("date", { ascending: false });

      if (error) throw error;

      // Agrupar por mês
      const monthsMap = new Map<string, number>();
      
      contents?.forEach((content) => {
        const date = new Date(content.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        monthsMap.set(monthKey, (monthsMap.get(monthKey) || 0) + 1);
      });

      // Converter para array e formatar
      const monthsList = Array.from(monthsMap.entries())
        .map(([month, count]) => {
          const [year, monthNum] = month.split("-");
          const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
          return {
            value: month,
            label: `${monthNames[parseInt(monthNum) - 1]}/${year}`,
            count,
          };
        })
        .sort((a, b) => b.value.localeCompare(a.value));

      setMonths(monthsList);
      
      if (monthsList.length > 0) {
        setSelectedMonth(monthsList[0].value);
      }
    } catch (error: any) {
      console.error("Erro ao carregar meses:", error);
      toast({
        title: "Erro ao carregar meses",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingMonths(false);
    }
  };

  const generateLink = async () => {
    if (!selectedMonth) {
      toast({
        title: "Selecione um mês",
        description: "É necessário selecionar um mês para gerar o link",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase.functions.invoke<TokenResponse>(
        "generate-approval-link",
        {
          body: { 
            client_id: clientId,
            month: selectedMonth 
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (error) {
        console.error("Erro da função:", error);
        throw new Error(error.message || "Falha ao gerar link");
      }

      if (!data?.success) {
        throw new Error("Resposta inválida da função");
      }

      setApprovalLink(data.approval_url);
      setExpiresAt(data.expires_at);

      toast({
        title: "Link gerado com sucesso",
        description: `Link válido por ${data.expires_in_days} dias`,
      });
    } catch (error: any) {
      console.error("Erro ao gerar link:", error);
      toast({
        title: "Erro ao gerar link",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive",
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
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link",
        variant: "destructive",
      });
    }
  };

  const openLink = () => {
    window.open(approvalLink, "_blank");
  };

  const formatExpiryDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const sendViaWhatsApp = () => {
    if (!hasWhatsAppAccess) {
      toast({
        title: "Recurso não disponível",
        description: "O envio via WhatsApp não está disponível no seu plano atual",
        variant: "destructive",
      });
      return;
    }

    const [year, monthNum] = selectedMonth.split("-");
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const monthLabel = monthNames[parseInt(monthNum) - 1];

    const message = `Olá! 👋\n\nSeguem os criativos de *${monthLabel}/${year}* para sua aprovação:\n\n🔗 ${approvalLink}\n\n⏰ *Link válido até:* ${formatExpiryDate(expiresAt)}\n\nClique no link para visualizar, comentar e aprovar os conteúdos.\n\nQualquer dúvida, estamos à disposição!`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");

    toast({
      title: "WhatsApp aberto",
      description: "Selecione o contato para enviar o link",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ExternalLink className="h-4 w-4 mr-2" />
          Gerar Link de Aprovação
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gerar Link de Aprovação</DialogTitle>
          <DialogDescription>
            Crie um link temporário (7 dias) para {clientName} aprovar conteúdos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Selecione o mês
            </label>
            <Select
              value={selectedMonth}
              onValueChange={setSelectedMonth}
              disabled={loadingMonths || loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingMonths ? "Carregando..." : "Selecione um mês"} />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    <div className="flex items-center justify-between w-full gap-2">
                      <span>{month.label}</span>
                      <Badge variant="outline" className="ml-2">
                        {month.count} pendente{month.count !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {months.length === 0 && !loadingMonths && (
              <p className="text-sm text-muted-foreground">
                Nenhum conteúdo pendente encontrado
              </p>
            )}
          </div>

          <Button
            onClick={generateLink}
            disabled={loading || !selectedMonth || loadingMonths}
            className="w-full"
          >
            {loading ? "Gerando..." : "Gerar Link"}
          </Button>

          {approvalLink && (
            <div className="space-y-3 pt-4 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium">Link gerado:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={approvalLink}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    title="Copiar link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={openLink}
                    title="Abrir link"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={sendViaWhatsApp}
                    title={hasWhatsAppAccess ? "Enviar via WhatsApp" : "WhatsApp não disponível no seu plano"}
                    disabled={!hasWhatsAppAccess || checkingAccess}
                    className={hasWhatsAppAccess ? "text-green-600 hover:text-green-700 hover:bg-green-50" : ""}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Expira em:</span>
                <Badge variant="outline">{formatExpiryDate(expiresAt)}</Badge>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                💡 <strong>Dica:</strong> {hasWhatsAppAccess ? "Use o botão WhatsApp para enviar o link com mensagem pré-formatada ou" : "Envie este link para o cliente via WhatsApp, e-mail ou o canal de preferência dele. O link permite aprovação direta sem necessidade de login."}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
