import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Copy, ExternalLink, Link as LinkIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [months, setMonths] = useState<{ value: string; label: string; count: number }[]>([]);
  const [loadingMonths, setLoadingMonths] = useState(false);

  useEffect(() => {
    if (!open) return;
    const loadMonths = async () => {
      setLoadingMonths(true);
      try {
        const { data, error } = await supabase
          .from('contents')
          .select('date, status')
          .eq('client_id', clientId)
          .in('status', ['in_review', 'changes_requested', 'draft']);
        if (!error && data) {
          const map = new Map<string, number>();
          data.forEach((row: any) => {
            if (!row?.date) return;
            const d = new Date(row.date);
            if (isNaN(d.getTime())) return;
            const key = format(d, 'yyyy-MM');
            map.set(key, (map.get(key) || 0) + 1);
          });
          const opts = Array.from(map.entries())
            .sort((a, b) => (a[0] < b[0] ? 1 : -1))
            .map(([value, count]) => ({
              value,
              count,
              label: `${format(new Date(`${value}-01`), "MMMM 'de' yyyy", { locale: ptBR })} (${count})`
            }));
          setMonths(opts);
          if (opts.length) setSelectedMonth(opts[0].value);
        }
      } finally {
        setLoadingMonths(false);
      }
    };
    loadMonths();
  }, [open, clientId]);
  const generateLink = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          variant: "destructive",
          title: "Sessão necessária",
          description: "Faça login para gerar o link de aprovação.",
        });
        setLoading(false);
        return;
      }
      const invokeOptions: any = {
        body: { 
          client_id: clientId,
          month: selectedMonth
        }
      };

      // Ensure auth and apikey headers are present without overriding client defaults
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (session?.access_token) {
        invokeOptions.headers = {
          Authorization: `Bearer ${session.access_token}`,
          apikey: anonKey,
          'Content-Type': 'application/json'
        } as any;
      }

      const { data, error } = await supabase.functions.invoke('generate-approval-link', invokeOptions);

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
      const status = (error as any)?.context?.response?.status ?? (error as any)?.status;
      const errMsg = (error as any)?.message || "Não foi possível gerar o link de aprovação";
      const nowBr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      toast({
        variant: "destructive",
        title: `Erro na função • ${nowBr}${status ? ` • ${status}` : ""}`,
        description: errMsg,
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
            <Label htmlFor="month">Mês com pendências</Label>
            <div className="flex gap-2">
              <Select value={selectedMonth} onValueChange={(v) => setSelectedMonth(v)}>
                <SelectTrigger className="flex-1" id="month">
                  <SelectValue placeholder={loadingMonths ? "Carregando..." : (months.length ? "Selecione um mês" : "Sem pendências") } />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={generateLink}
                disabled={loading || !selectedMonth}
                variant="default"
              >
                <Calendar className="w-4 h-4 mr-2" />
                {loading ? "Gerando..." : "Gerar"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Mostrando meses com conteúdos "Em revisão", "Ajustes solicitados" ou "Rascunho".
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
