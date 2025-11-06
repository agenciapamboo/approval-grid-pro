import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Calendar, Globe, Phone, MapPin, FileText, Share2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { SocialAccountsDialog } from "./SocialAccountsDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Client {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  agency_id: string;
  email?: string | null;
  cnpj?: string | null;
  plan_renewal_date?: string | null;
  website?: string | null;
  whatsapp?: string | null;
  address?: string | null;
}

interface ViewClientDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ClientNote {
  id: string;
  note: string;
  created_at: string;
  created_by: string;
}

export function ViewClientDialog({ client, open, onOpenChange }: ViewClientDialogProps) {
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [socialDialogOpen, setSocialDialogOpen] = useState(false);

  useEffect(() => {
    if (client && open) {
      loadNotes();
    }
  }, [client, open]);

  const loadNotes = async () => {
    if (!client) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("client_notes")
        .select("*")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error("Error loading notes:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!client) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Dados do Cliente
              </DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSocialDialogOpen(true)}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Redes Sociais
              </Button>
            </div>
          </DialogHeader>
        
          <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
            <div className="space-y-6">
              {client.logo_url && (
                <div className="flex justify-center">
                  <img src={client.logo_url} alt={client.name} className="h-16 object-contain" />
                </div>
              )}

              <div className="grid gap-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">Nome</h3>
                  <p className="text-base">{client.name}</p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">Email</h3>
                  <p className="text-base">{client.email || "Não informado"}</p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">Slug (URL)</h3>
                  <p className="text-base">{client.slug}</p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    CNPJ
                  </h3>
                  <p className="text-base">{client.cnpj || "Não informado"}</p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data de Vencimento
                  </h3>
                  <p className="text-base">
                    {client.plan_renewal_date 
                      ? new Date(client.plan_renewal_date).toLocaleDateString('pt-BR')
                      : "Não informado"
                    }
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Site
                  </h3>
                  {client.website ? (
                    <a 
                      href={client.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-base text-primary hover:underline"
                    >
                      {client.website}
                    </a>
                  ) : (
                    <p className="text-base">Não informado</p>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    WhatsApp
                  </h3>
                  <p className="text-base">{client.whatsapp || "Não informado"}</p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Endereço
                  </h3>
                  <p className="text-base whitespace-pre-wrap">{client.address || "Não informado"}</p>
                </div>

                <Separator className="my-4" />

                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Histórico de Observações
                  </h3>
                  
                  <ScrollArea className="h-[200px] rounded-md border p-4">
                    {loading ? (
                      <p className="text-sm text-muted-foreground">Carregando...</p>
                    ) : notes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma observação registrada</p>
                    ) : (
                      <div className="space-y-4">
                        {notes.map((note, index) => (
                          <div key={note.id} className="space-y-1">
                            <p className="text-sm">{note.note}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(note.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                            {index < notes.length - 1 && <Separator className="mt-3" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

    {client && (
      <SocialAccountsDialog
        clientId={client.id}
        open={socialDialogOpen}
        onOpenChange={setSocialDialogOpen}
      />
    )}
  </>
  );
}
